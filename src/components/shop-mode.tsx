"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatQty, type ListItem } from "@/lib/domain";
import { groupByCategory } from "@/lib/group";
import type { Actions } from "@/hooks/use-actions";
import { cn } from "@/lib/utils";
import { ProductIcon } from "./product-icon";
import { sendMutation } from "@/lib/client-api";
import { getDeviceId, getName } from "@/lib/device";
import { useCategories } from "./categories-context";
import { PersonAvatar } from "./person-avatar";
import { ConfirmDialog } from "./confirm-dialog";

/** Pantalla completa, con filas grandes para marcar con una mano mientras se camina por el súper. */
export function ShopMode({ token, items, others, actions, onClose }: { token: string; items: ListItem[]; others: string | null; actions: Actions; onClose: () => void }) {
  const { categories } = useCategories();
  const [confirm, setConfirm] = useState(false);

  // Avisa al resto del hogar que alguien está comprando (se renueva cada 20 s y vence a los 60 s).
  useEffect(() => {
    const device = getDeviceId();
    const ping = () => void sendMutation(token, { op: "shopPing", device, name: getName() || null }).catch(() => {});
    ping();
    const id = window.setInterval(ping, 20_000);
    return () => {
      window.clearInterval(id);
      void sendMutation(token, { op: "shopStop", device }).catch(() => {});
    };
  }, [token]);

  // Mantiene la pantalla encendida mientras se compra (si el navegador lo permite).
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = () => navigator.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    request();
    const onVisible = () => document.visibilityState === "visible" && request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, []);

  const total = items.length;
  const done = items.filter((i) => i.bought).length;
  const groups = useMemo(() => groupByCategory(items.filter((i) => !i.bought), categories), [items, categories]);
  const bought = items.filter((i) => i.bought);

  return (
    <div role="dialog" aria-modal="true" aria-label="Modo supermercado" className="fixed inset-0 z-40 flex flex-col bg-background print:hidden">
      <header className="border-b bg-card px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight">Modo supermercado</h1>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {total === 0 ? "No hay nada en la lista" : `${done} de ${total} comprados`}
            </p>
          </div>
          <Button variant="outline" className="h-11 px-4" onClick={onClose}>
            <XIcon /> Salir
          </Button>
        </div>
        {others && (
          <p role="status" className="mx-auto mt-2 max-w-2xl rounded-xl bg-amber-100 px-3 py-2 text-sm text-amber-900">
            {others} también está comprando ahora: lo que tilde aparece acá, así no compran lo mismo dos veces.
          </p>
        )}
        <div className="mx-auto mt-3 h-2 max-w-2xl overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: total ? `${(done / total) * 100}%` : "0%" }} />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pt-4 pb-32">
        <div className="mx-auto max-w-2xl space-y-6">
          {groups.map(({ category, items: list }) => (
            <section key={category.id}>
              <h2 className="mb-2 px-1 text-base font-semibold text-muted-foreground">
                {category.emoji && <span aria-hidden>{category.emoji} </span>}{category.label}
              </h2>
              <ul className="space-y-2">
                {list.map((item) => (
                  <ShopRow key={item.id} item={item} onToggle={() => void actions.toggle(item)} />
                ))}
              </ul>
            </section>
          ))}

          {total > 0 && groups.length === 0 && <p className="rounded-2xl bg-accent/60 px-4 py-8 text-center text-lg font-semibold text-accent-foreground">🎉 ¡Compra completa!</p>}

          {bought.length > 0 && (
            <section>
              <h2 className="mb-2 px-1 text-base font-semibold text-muted-foreground">Comprados</h2>
              <ul className="space-y-2">
                {bought.map((item) => (
                  <ShopRow key={item.id} item={item} onToggle={() => void actions.toggle(item)} />
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>

      {bought.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t bg-card/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          <Button className="mx-auto flex h-14 w-full max-w-2xl text-lg" onClick={() => setConfirm(true)}>
            <CheckIcon /> Terminé la compra
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="¿Terminaste la compra?"
        description="Los productos comprados se guardan en el historial. Los que faltan siguen en la lista."
        confirmLabel="Terminar"
        onConfirm={() => {
          void actions.clearBought();
          onClose();
        }}
      />
    </div>
  );
}

function ShopRow({ item, onToggle }: { item: ListItem; onToggle: () => void }) {
  return (
    <li>
      <button
        type="button"
        role="checkbox"
        aria-checked={item.bought}
        onClick={onToggle}
        className={cn(
          "flex min-h-[4.5rem] w-full items-center gap-4 rounded-2xl border px-4 py-3 text-left transition active:scale-[0.99] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          item.bought ? "border-transparent bg-muted/70" : "bg-card shadow-xs",
        )}
      >
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl border-2 transition", item.bought ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
          {item.bought && <CheckIcon className="size-6" strokeWidth={3} />}
        </span>
        <ProductIcon name={item.name} emoji={item.emoji} className="size-10 text-3xl" />
        <span className="min-w-0 flex-1">
          <span className={cn("block text-xl font-medium", item.bought && "text-muted-foreground line-through")}>{item.name}</span>
          <span className="flex items-center gap-1.5 text-base text-muted-foreground">
            {item.note && <span className="truncate">{item.note}</span>}
            {item.addedBy && !item.bought && <PersonAvatar name={item.addedBy} label="Agregó" className="size-6 text-xs" />}
            {item.bought && item.boughtBy && <PersonAvatar name={item.boughtBy} label="Compró" className="size-6 text-xs" />}
          </span>
        </span>
        <span className={cn("shrink-0 rounded-full px-3 py-1 text-lg font-semibold tabular-nums", item.bought ? "text-muted-foreground" : "bg-secondary")}>{formatQty(item.quantity, item.unit)}</span>
      </button>
    </li>
  );
}
