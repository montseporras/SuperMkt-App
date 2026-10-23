"use client";

import { useState } from "react";
import { DownloadIcon, Loader2Icon, MessageCircleIcon, PrinterIcon } from "lucide-react";
import { toast } from "sonner";
import type { Category, ListItem } from "@/lib/domain";
import { buildPdf, fileDate, listAsText } from "@/lib/export";
import { Sheet } from "./sheet";

interface Props {
  open: boolean;
  onClose: () => void;
  items: ListItem[];
  householdName: string;
  categories: Category[];
}

export function ExportSheet({ open, onClose, items, householdName, categories }: Props) {
  const [busy, setBusy] = useState<null | "pdf" | "share">(null);
  const pending = items.filter((i) => !i.bought).length;
  const filename = `compras-${fileDate()}.pdf`;

  const download = async () => {
    setBusy("pdf");
    try {
      const blob = await buildPdf(items, householdName, categories);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast.success("PDF descargado");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar el PDF");
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    setBusy("share");
    const text = listAsText(items, householdName, categories);
    try {
      const file = new File([await buildPdf(items, householdName, categories)], filename, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Compras de casa", text });
      } else if (navigator.share) {
        await navigator.share({ title: "Compras de casa", text });
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
      }
    } catch (e) {
      // AbortError = la persona cerró el menú de compartir; no es un error.
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        console.error(e);
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
      }
    } finally {
      setBusy(null);
    }
  };

  const options = [
    { icon: busy === "pdf" ? Loader2Icon : DownloadIcon, spin: busy === "pdf", title: "Descargar PDF", sub: "Con casillas para tildar a mano", onClick: download },
    {
      icon: PrinterIcon,
      spin: false,
      title: "Imprimir",
      sub: "Diseño limpio por categorías",
      onClick: () => {
        onClose();
        setTimeout(() => window.print(), 250);
      },
    },
    { icon: busy === "share" ? Loader2Icon : MessageCircleIcon, spin: busy === "share", title: "Compartir por WhatsApp", sub: "Usa el menú de compartir del celular", onClick: share },
  ];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()} title="Exportar lista" description={`${pending} ${pending === 1 ? "producto pendiente" : "productos pendientes"}`}>
      <ul className="space-y-2 pt-2">
        {options.map((o) => (
          <li key={o.title}>
            <button
              type="button"
              disabled={busy !== null}
              onClick={o.onClick}
              className="flex w-full items-center gap-4 rounded-2xl border bg-card px-4 py-3.5 text-left transition hover:bg-muted disabled:opacity-60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-primary">
                <o.icon className={o.spin ? "size-5 animate-spin" : "size-5"} />
              </span>
              <span>
                <span className="block text-base font-medium">{o.title}</span>
                <span className="block text-sm text-muted-foreground">{o.sub}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
