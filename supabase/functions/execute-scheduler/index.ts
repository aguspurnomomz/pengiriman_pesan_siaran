// supabase/functions/execute-scheduler/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// CORS headers untuk keamanan gateway API
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-scheduler-secret',
};

// Delay antar pengiriman pesan ke Fonnte (dalam milidetik) agar aman dari spam blocking
const MESSAGE_DELAY_MS = 500;

// Interfaces untuk Type-Safety Deno
interface ScheduledBroadcast {
  id: string;
  title: string;
  scheduled_time: string;
  status: string;
  user_id: string;
}

interface ScheduledTask {
  id: string;
  broadcast_id: string;
  patient_id: string;
  phone_number: string;
  message_content: string;
  status: string;
}

interface FonnteResponse {
  status: boolean;
  message?: string;
  id?: string;
}

// Menggunakan Deno.serve sebagai entry-point utama Supabase Edge Functions
Deno.serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // === KEAMANAN: Validasi Token Rahasia Scheduler ===
  const SCHEDULER_SECRET = Deno.env.get("SCHEDULER_SECRET");
  const authHeader = req.headers.get('authorization');
  const schedulerSecret = req.headers.get('x-scheduler-secret');
  
  const isValidToken = 
    authHeader === `Bearer ${SCHEDULER_SECRET}` || 
    schedulerSecret === SCHEDULER_SECRET;
  
  if (!isValidToken) {
    console.error('Unauthorized: Token rahasia tidak valid atau tidak disertakan');
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized. Token verifikasi dibutuhkan.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // === STRATEGI BARU: Mengekstrak service_role dari SUPABASE_SECRET_KEYS (Sesuai Dashboard Terbaru) ===
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  let supabaseServiceKey = "";

  try {
    const secretKeysRaw = Deno.env.get('SUPABASE_SECRET_KEYS');
    if (secretKeysRaw) {
      // Karena SUPABASE_SECRET_KEYS bertipe JSON string, kita parse ke objek
      const keys = JSON.parse(secretKeysRaw);
      supabaseServiceKey = keys.service_role || keys.service_role_key;
    }
  } catch (parseError) {
    console.error('⚠️ Gagal membaca objek SUPABASE_SECRET_KEYS, mencoba fallback...', parseError.message);
  }

  // Fallback jika karena suatu hal parsing JSON di atas kosong, gunakan yang lama
  if (!supabaseServiceKey) {
    supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || "";
  }

  if (!supabaseServiceKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'Konfigurasi serverless internal rusak: service_role tidak ditemukan.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Inisialisasi Supabase Client menggunakan Service Role Key yang didapatkan otomatis
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('🚀 [Scheduler] Worker mulai berjalan pada:', new Date().toISOString());

  const summaryResults = {
    processedBroadcasts: 0,
    totalTasks: 0,
    successfulTasks: 0,
    failedTasks: 0,
    errors: [] as string[],
  };

  try {
    // === STEP 1: Ambil antrian jadwal yang sudah masuk jatuh tempo (<= Waktu Sekarang) ===
    const now = new Date().toISOString();
    
    const { data: broadcasts, error: fetchError } = await supabase
      .from('scheduled_broadcasts')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_time', now);

    if (fetchError) throw new Error(`Gagal mengambil data jadwal: ${fetchError.message}`);

    if (!broadcasts || broadcasts.length === 0) {
      console.log('✅ [Scheduler] Tidak ada antrian jadwal pending yang jatuh tempo saat ini.');
      return new Response(
        JSON.stringify({ success: true, message: 'No pending broadcasts found', results: summaryResults }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 [Scheduler] Menemukan ${broadcasts.length} jadwal yang harus dieksekusi.`);

    // === STEP 2: Iterasi Memproses Setiap Master Jadwal ===
    for (const broadcast of broadcasts as ScheduledBroadcast[]) {
      console.log(`\n📢 Memproses Jadwal: "${broadcast.title}" (ID: ${broadcast.id})`);
      summaryResults.processedBroadcasts++;

      try {
        // Ambil Fonnte API Key milik klinik secara dinamis berdasarkan user_id pembuat jadwal
        const { data: clinicData, error: clinicError } = await supabase
          .from('clinic_settings')
          .select('fonte_api_key, clinic_name')
          .eq('user_id', broadcast.user_id)
          .maybeSingle();

        if (clinicError) throw new Error(`Gagal memuat konfigurasi klinik: ${clinicError.message}`);
        if (!clinicData || !clinicData.fonte_api_key) {
          throw new Error(`API Key Fonnte belum dikonfigurasi untuk user/klinik: ${broadcast.user_id}`);
        }

        const apiKey = clinicData.fonte_api_key;
        
        // Ubah status master jadwal menjadi 'processing' agar tidak tereksekusi ganda oleh cron lain
        await supabase
          .from('scheduled_broadcasts')
          .update({ status: 'processing' })
          .eq('id', broadcast.id);

        // Ambil semua detail task pesan yang berstatus 'pending' di dalam grup jadwal ini
        const { data: tasks, error: tasksError } = await supabase
          .from('scheduled_tasks')
          .select('*')
          .eq('broadcast_id', broadcast.id)
          .eq('status', 'pending');

        if (tasksError) throw new Error(`Gagal memuat antrian pesan detail: ${tasksError.message}`);

        if (!tasks || tasks.length === 0) {
          console.log(`⚠️ Jadwal "${broadcast.title}" tidak memiliki rincian pasien pending.`);
          await supabase
            .from('scheduled_broadcasts')
            .update({ status: 'completed' })
            .eq('id', broadcast.id);
          continue;
        }

        console.log(`📨 Menemukan ${tasks.length} target pasien pengiriman.`);
        summaryResults.totalTasks += tasks.length;

        // === STEP 3: Looping Pengiriman Teks Matang via API Fonnte ===
        for (let i = 0; i < tasks.length; i++) {
          const task = tasks[i] as ScheduledTask;
          console.log(`  📤 [${i + 1}/${tasks.length}] Mengirim ke nomor ${task.phone_number}...`);

          try {
            const fonnteResponse = await sendToFonnte(apiKey, task.phone_number, task.message_content);
            
            if (fonnteResponse.status === true) {
              await supabase
                .from('scheduled_tasks')
                .update({ 
                  status: 'sent', 
                  processed_at: new Date().toISOString(),
                  error_message: null
                })
                .eq('id', task.id);
              
              summaryResults.successfulTasks++;
            } else {
              throw new Error(fonnteResponse.message || 'Fonnte gagal memproses pengiriman');
            }
          } catch (taskError: any) {
            await supabase
              .from('scheduled_tasks')
                .update({ 
                  status: 'failed', 
                  error_message: taskError.message || 'Unknown error',
                  processed_at: new Date().toISOString()
                })
                .eq('id', task.id);
            
            summaryResults.failedTasks++;
            summaryResults.errors.push(`Task ID ${task.id} (${task.phone_number}): ${taskError.message}`);
          }

          // Delay throttle pencegahan spam throttling WhatsApp
          if (i < tasks.length - 1) {
            await delay(MESSAGE_DELAY_MS);
          }
        }

        // === STEP 4: Update Status Final Master Jadwal ===
        const finalStatus = summaryResults.failedTasks > 0 && summaryResults.successfulTasks === 0 ? 'failed' : 'completed';
        
        await supabase
          .from('scheduled_broadcasts')
          .update({ status: finalStatus })
          .eq('id', broadcast.id);

        console.log(`📊 Penjadwalan "${broadcast.title}" selesai diproses dengan status akhir: [${finalStatus}]`);

      } catch (broadcastError: any) {
        console.error(`❌ Gagal mengeksekusi grup jadwal "${broadcast.title}":`, broadcastError.message);
        summaryResults.errors.push(`Broadcast ID ${broadcast.id}: ${broadcastError.message}`);
        
        await supabase
          .from('scheduled_broadcasts')
          .update({ status: 'failed' })
          .eq('id', broadcast.id);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Eksekusi antrian scheduler selesai.', results: summaryResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('💥 Fatal Crash Error pada Edge Function:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message, results: summaryResults }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper Function: Mengirim Data HTTP POST ke API Fonnte
async function sendToFonnte(apiKey: string, phoneNumber: string, messageContent: string): Promise<FonnteResponse> {
  const formattedPhone = formatPhoneNumber(phoneNumber);
  
  const formData = new FormData();
  formData.append('target', formattedPhone);
  formData.append('message', messageContent);

  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { 'Authorization': apiKey },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || data.status === false) {
      return {
        status: false,
        message: data.message || `HTTP Error ${response.status}: ${response.statusText}`,
      };
    }

    return { status: true, id: data.id, message: data.message };
  } catch (error: any) {
    return { status: false, message: `Masalah Koneksi Jaringan: ${error.message}` };
  }
}

// Helper Function: Pembersihan & Standarisasi Format Nomor HP Indonesia
function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  } else if (cleaned.startsWith("8") && cleaned.length >= 9) {
    cleaned = "62" + cleaned;
  }
  
  return cleaned;
}

// Helper Function: Timer Async Delay (Throttling)
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}