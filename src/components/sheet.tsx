"use client";

import type { ReactNode, RefObject } from "react";
import { Dialog as D } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  initialFocus?: RefObject<HTMLElement | null>;
  className?: string;
}

/** Hoja inferior en móvil, diálogo centrado en pantallas grandes. */
export function Sheet({ open, onOpenChange, title, description, children, footer, initialFocus, className }: SheetProps) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Backdrop className="fixed inset-0 z-50 bg-black/35 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 print:hidden" />
        <D.Popup
          initialFocus={initialFocus}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-3xl bg-background text-foreground shadow-2xl outline-none transition-all duration-200 ease-out",
            "data-ending-style:translate-y-8 data-ending-style:opacity-0 data-starting-style:translate-y-8 data-starting-style:opacity-0",
            "sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[85dvh] sm:w-[30rem] sm:rounded-3xl print:hidden",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-2">
            <div className="min-w-0">
              <D.Title className="text-lg font-semibold tracking-tight">{title}</D.Title>
              {description && <D.Description className="mt-0.5 text-sm text-muted-foreground">{description}</D.Description>}
            </div>
            <D.Close
              aria-label="Cerrar"
              className="-mr-1 grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <XIcon className="size-5" />
            </D.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
          {footer && <div className="border-t bg-background/95 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
        </D.Popup>
      </D.Portal>
    </D.Root>
  );
}
