import { useState } from "react";
import { Menu, X } from "lucide-react";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { Button } from "@/components/ui/button";

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-4 md:hidden">
        <span className="text-sm font-semibold">Message Hub</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="mobile-navigation"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div
            id="mobile-navigation"
            className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-card shadow-xl"
          >
            <div className="flex justify-end border-b border-border p-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Close menu</span>
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto" onClick={() => setOpen(false)}>
              <AppSidebar />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
