"use client";

import { SmileIcon } from "lucide-react";
import { Label, inputClass } from "./fields";
import { ProductIcon } from "./product-icon";
import { cn } from "@/lib/utils";

const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter("es", { granularity: "grapheme" }) : null;
const PICTO = /\p{Extended_Pictographic}/u;

/** Último emoji del texto escrito/pegado, o null si no hay ninguno. */
export function lastEmoji(text: string): string | null {
  const parts = segmenter ? [...segmenter.segment(text)].map((s) => s.segment) : Array.from(text);
  return [...parts].reverse().find((g) => PICTO.test(g)) ?? null;
}

/** Campo que usa el teclado de emojis del propio celular: se toca, se elige un emoji y queda. */
export function EmojiInput({ value, onChange, id, className }: { value: string | null; onChange: (e: string | null) => void; id?: string; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <SmileIcon className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
      <input
        id={id}
        aria-label="Emoji"
        autoComplete="off"
        placeholder="Tocá y elegí un emoji del teclado"
        className={cn(inputClass, "pl-10 text-lg")}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? lastEmoji(e.target.value) ?? value : null)}
      />
    </div>
  );
}

/** `value` null = automático (se deduce del nombre). */
export function EmojiPicker({ name, value, onChange }: { name: string; value: string | null; onChange: (e: string | null) => void }) {
  return (
    <div>
      <Label htmlFor="emoji-input">Ícono (opcional)</Label>
      <div className="flex items-center gap-3">
        <ProductIcon name={name || "?"} emoji={value} className="size-12 text-3xl" />
        <EmojiInput id="emoji-input" value={value} onChange={onChange} className="min-w-0 flex-1" />
        {value && (
          <button type="button" onClick={() => onChange(null)} className="h-11 shrink-0 rounded-xl border border-input px-3 text-sm hover:bg-muted">
            Automático
          </button>
        )}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">Si lo dejás vacío, se elige uno según el nombre.</p>
    </div>
  );
}
