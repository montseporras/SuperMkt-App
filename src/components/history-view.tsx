"use client";

import { useMemo } from "react";
import { HistoryIcon, PlusIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatQty, type ListItem } from "@/lib/domain";
import type { Actions } from "@/hooks/use-actions";

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));

export function HistoryView({ history, actions }: { history: ListItem[]; actions: Actions }) {
  const groups = useMemo(() => {
    const map = new Map<string, { iso: string; items: ListItem[] }>();
    for (const i of history) {
      const k = dayKey(i.clearedAt!);
      if (!map.has(k)) map.set(k, { iso: i.clearedAt!, items: [] });
      map.get(k)!.items.push(i);
    }
    return [...map.values()];
  }, [history]);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed bg-card/60 px-6 py-14 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-accent text-primary">
          <HistoryIcon className="size-8" />
        </span>
        <h2 className="text-lg font-semibold">Todavía no hay compras anteriores</h2>
        <p className="max-w-xs text-sm text-muted-foreground">Cuando termines de comprar y uses «Vaciar comprados», la lista queda guardada acá para repetirla.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <section key={g.iso} className="overflow-hidden rounded-2xl border bg-card shadow-xs">
          <header className="flex items-center justify-between gap-3 border-b bg-muted/50 px-4 py-3">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold capitalize">{dayLabel(g.iso)}</h2>
              <p className="text-sm text-muted-foreground">{g.items.length} {g.items.length === 1 ? "producto" : "productos"}</p>
            </div>
            <Button size="lg" className="h-10 shrink-0 px-4" onClick={() => void actions.repeat(g.items)}>
              <RotateCcwIcon /> Repetir compra
            </Button>
          </header>
          <ul className="divide-y">
            {g.items.map((i) => (
              <li key={i.id} className="flex items-center gap-2 py-1 pr-2 pl-4">
                <span className="min-w-0 flex-1 truncate text-base">{i.name}</span>
                <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{formatQty(i.quantity, i.unit)}</span>
                <button
                  type="button"
                  aria-label={`Agregar ${i.name} a la lista`}
                  onClick={() => void actions.repeat([i])}
                  className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
                >
                  <PlusIcon className="size-5" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
