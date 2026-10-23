"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { PlusIcon as AddIcon } from "lucide-react";
import { UNITS, stepFor, type CategoryId, type UnitId } from "@/lib/domain";
import { useCategories } from "./categories-context";
import { EmojiInput } from "./emoji-picker";
import { cn } from "@/lib/utils";

const round = (n: number) => Math.round(n * 100) / 100;

export function QtyStepper({
  value,
  unit,
  onChange,
  size = "md",
  min,
}: {
  value: number;
  unit: string;
  onChange: (v: number) => void;
  size?: "md" | "lg";
  min?: number;
}) {
  const step = stepFor(unit);
  const floor = min ?? step;
  const btn = cn(
    "grid shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground transition active:scale-90 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
    size === "lg" ? "size-12" : "size-9",
  );
  return (
    <div className="flex items-center gap-1">
      <button type="button" aria-label="Menos" className={btn} onClick={() => onChange(round(Math.max(floor, value - step)))}>
        <MinusIcon className="size-4" />
      </button>
      <span className={cn("min-w-10 text-center font-semibold tabular-nums", size === "lg" ? "min-w-16 text-2xl" : "text-base")}>
        {Number.isInteger(value) ? value : value.toLocaleString("es-AR", { maximumFractionDigits: 2 })}
      </span>
      <button type="button" aria-label="Más" className={btn} onClick={() => onChange(round(Math.min(99999, value + step)))}>
        <PlusIcon className="size-4" />
      </button>
    </div>
  );
}

export function UnitSelect({ value, onChange, className }: { value: UnitId; onChange: (u: UnitId) => void; className?: string }) {
  return (
    <select
      aria-label="Unidad"
      value={value}
      onChange={(e) => onChange(e.target.value as UnitId)}
      className={cn(
        "h-11 rounded-xl border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      {UNITS.map((u) => (
        <option key={u.id} value={u.id}>
          {u.label}
        </option>
      ))}
    </select>
  );
}

export function CategoryChips({ value, onChange, onCreate }: { value: CategoryId; onChange: (c: CategoryId) => void; onCreate?: (name: string, emoji: string | null) => string }) {
  const { categories } = useCategories();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState<string | null>(null);

  const create = () => {
    if (!name.trim() || !onCreate) return;
    onChange(onCreate(name.trim(), emoji));
    setCreating(false);
    setName("");
    setEmoji(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Categoría">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={value === c.id}
            onClick={() => onChange(c.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              value === c.id ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:bg-muted",
            )}
          >
            {c.emoji && <span aria-hidden>{c.emoji} </span>}
            {c.label}
          </button>
        ))}
        {onCreate && !creating && (
          <button type="button" onClick={() => setCreating(true)} className="flex items-center gap-1 rounded-full border border-dashed border-primary/60 px-3 py-1.5 text-sm text-primary hover:bg-accent">
            <AddIcon className="size-4" /> Nueva
          </button>
        )}
      </div>
      {creating && (
        <div className="space-y-2 rounded-2xl border bg-muted/40 p-3">
          <input aria-label="Nombre de la categoría" autoFocus className={inputClass} placeholder="Nombre (ej: Mascotas)" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), create())} />
          <EmojiInput value={emoji} onChange={setEmoji} />
          <div className="flex gap-2">
            <button type="button" onClick={() => setCreating(false)} className="h-11 flex-1 rounded-xl border bg-background text-sm">
              Cancelar
            </button>
            <button type="button" disabled={!name.trim()} onClick={create} className="h-11 flex-1 rounded-xl bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50">
              Crear categoría
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-muted-foreground">
      {children}
    </label>
  );
}

export const inputClass =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-base outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
