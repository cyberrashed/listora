"use client";

import { Menu, X } from "lucide-react";
import { useRef } from "react";

export function MobileMenu({ children }: { children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => dialog.current?.showModal()}
        className="flex size-11 items-center justify-center lg:hidden"
      >
        <Menu size={20} strokeWidth={1.5} />
      </button>
      <dialog
        ref={dialog}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a"))
            dialog.current?.close();
        }}
        className="bg-ground text-ink m-0 h-full max-h-none w-full max-w-none overflow-y-auto px-3 pb-4"
      >
        <div className="flex h-12 items-center">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => dialog.current?.close()}
            className="flex size-11 items-center justify-center"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        {children}
      </dialog>
    </>
  );
}
