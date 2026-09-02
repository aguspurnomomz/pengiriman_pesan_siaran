import { supabase } from "@/lib/supabaseClient";

export interface UserDocument {
  id: string;
  user_id: string;
  patient_id?: string | null;
  document_name: string;
  document_type: string;
  file_path: string;
  file_url: string;
  file_size?: number;
  created_at: string;
}

export async function uploadAndSaveDocument(
  file: File,
  patientId?: string | null,
  docType: string = "General"
): Promise<{ publicUrl: string; docData: UserDocument }> {
  // 1. Ambil ID User yang sedang Login
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    throw new Error("Sesi pengguna tidak valid. Silakan login kembali.");
  }
  const userId = userData.user.id;

  // 2. Buat Nama & Path File Unik
  const fileExt = file.name.split('.').pop();
  const sanitizedFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
  const filePath = `documents/${sanitizedFileName}`;

  // 3. Upload File ke Supabase Storage (Bucket: clinic-attachments)
  const { error: uploadError } = await supabase.storage
    .from("clinic-attachments")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("Gagal upload file ke Storage:", uploadError);
    throw new Error(`Gagal upload ke Storage: ${uploadError.message}`);
  }

  // 4. Ambil Public URL Supabase
  const { data: urlData } = supabase.storage
    .from("clinic-attachments")
    .getPublicUrl(filePath);

  const publicUrl = urlData.publicUrl;

  // 5. SIMPAN METADATA KE TABEL DATABASE `user_documents`
  const { data: docData, error: dbError } = await supabase
    .from("user_documents")
    .insert({
      user_id: userId,
      patient_id: patientId || null,
      document_name: file.name,
      document_type: docType,
      file_path: filePath, // Menyimpan 'documents/xxx.docx'
      file_url: publicUrl,
      file_size: file.size,
    })
    .select()
    .single();

  if (dbError) {
    console.error("Gagal menyimpan metadata ke database user_documents:", dbError);
    // Rollback: Hapus file di Storage jika DB gagal insert
    await supabase.storage.from("clinic-attachments").remove([filePath]);
    throw new Error(`Gagal mencatat dokumen ke Database: ${dbError.message}`);
  }

  return { publicUrl, docData };
}