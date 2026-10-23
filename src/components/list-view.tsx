"use client";

import { useMemo, useState } from "react";
import { ChevronDownIcon, PlusIcon, SearchIcon, ShoppingBasketIcon, SparklesIcon, StarIcon, Trash2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type ListItem, type Product } from "@/lib/domain";
import { groupByCategory } from "@/lib/group";
import type { Actions } from "@/hooks/use-actions";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "./confirm-dialog";
import { EditItemSheet } from "./edit-item-sheet";
import { inputClass } from "./fields";
import { ProductIcon } from "./product-icon";
import { suggest } from "@/lib/suggestions";
import { useCategories } from "./categories-context";
import { ItemRow } from "./item-row";

interface Props {
  items: ListItem[];
  history: ListItem[];
  products: Product[];
  actions: Actions;
  onAdd: (query?: string) => void;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function ListView({ items, history, products, actions, onAdd }: Props) {
  const { categories } = useCategories();
  const [hidden, setHidden] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ListItem | null>(null);
  const [showBought, setShowBought] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  const suggestions2 = useMemo(() => suggest(history, items).filter((x) => !hidden.includes(x.name)), [history, items, hidden]);
  const q = norm(search);
  const filtered = useMemo(() => (q ? items.filter((i) => norm(i.name).includes(q)) : items), [items, q]);
  const pending = filtered.filter((i) => !i.bought);
  const bought = filtered.filter((i) => i.bought);
  const pendingGroups = useMemo(() => groupByCategory(pending, categories), [pending, categories]);

  // Acceso rápido: favoritos primero y luego los más usados.
  const frequent = useMemo(
    () =>
      [...products]
        .filter((p) => p.favorite || p.useCount > 0)
        .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.useCount - a.useCount)
        .slice(0, 12),
    [products],
  );
  const inList = useMemo(() => new Set(items.filter((i) => !i.bought).map((i) => i.name.toLowerCase())), [items]);

  const suggestions = q ? products.filter((p) => norm(p.name).includes(q) && !inList.has(p.name.toLowerCase())).slice(0, 4) : [];
  const exactInList = items.some((i) => norm(i.name) === q);

  return (
    <div className="space-y-5">
      {suggestions2.length > 0 && !q && (
        <section aria-labelledby="sug-title" className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <h2 id="sug-title" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-900">
            <SparklesIcon className="size-4" /> Quizás te falta
          </h2>
          <ul className="space-y-1.5">
            {suggestions2.map((x) => (
              <li key={x.name} className="flex items-center gap-2">
                <ProductIcon name={x.name} emoji={x.emoji} className="size-8 text-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium">{x.name}</p>
                  <p className="text-xs text-amber-900/80">La comprás cada ~{x.everDays} días · hace {x.sinceDays}</p>
                </div>
                <button
                  type="button"
                  aria-label={`Agregar ${x.name}`}
                  onClick={() => void actions.repeat([{ id: "", clearedAt: null, createdAt: "", bought: false, addedBy: null, boughtBy: null, note: null, ...x }])}
                  className="grid size-10 place-items-center rounded-full bg-white text-amber-900 shadow-xs active:scale-90"
                >
                  <PlusIcon className="size-5" />
                </button>
                <button type="button" aria-label={`Descartar ${x.name}`} onClick={() => setHidden((h) => [...h, x.name])} className="grid size-10 place-items-center rounded-full text-amber-900/70 hover:bg-amber-100">
                  <XIcon className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {frequent.length > 0 && !q && (
        <section aria-labelledby="freq-title">
          <h2 id="freq-title" className="mb-2 flex items-center gap-1.5 px-1 text-sm font-semibold text-muted-foreground">
            <StarIcon className="size-4" /> Frecuentes
          </h2>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {frequent.map((p) => {
              const added = inList.has(p.name.toLowerCase());
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => void actions.quickAdd(p)}
                  aria-label={`Agregar ${p.name}`}
                  className={cn(
                    "flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition active:scale-95 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    added ? "border-primary/40 bg-accent text-accent-foreground" : "border-input bg-card hover:bg-muted",
                  )}
                >
                  <ProductIcon name={p.name} emoji={p.emoji} className="-ml-1.5 size-7 text-base" />
                  {p.name}
                  {added ? <span aria-hidden className="text-primary">✓</span> : <PlusIcon className="size-4 text-muted-foreground" aria-hidden />}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {items.length > 0 && (
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            aria-label="Buscar en la lista"
            placeholder="Buscar en la lista…"
            className={cn(inputClass, "h-12 pl-10")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" aria-label="Borrar búsqueda" onClick={() => setSearch("")} className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted">
              <XIcon className="size-4" />
            </button>
          )}
        </div>
      )}

      {q && (suggestions.length > 0 || (!exactInList && search.trim())) && (
        <section aria-label="Agregar desde el catálogo" className="space-y-2 rounded-2xl border border-dashed border-primary/40 bg-accent/40 p-3">
          <p className="text-sm font-medium text-accent-foreground">No está en la lista todavía</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  void actions.quickAdd(p);
                  setSearch("");
                }}
                className="flex h-10 items-center gap-1.5 rounded-full border border-input bg-card px-3.5 text-sm font-medium hover:bg-muted"
              >
                <PlusIcon className="size-4" /> {p.name}
              </button>
            ))}
            {!products.some((p) => norm(p.name) === q) && (
              <button
                type="button"
                onClick={() => {
                  onAdd(search.trim());
                  setSearch("");
                }}
                className="flex h-10 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-medium text-primary-foreground"
              >
                <PlusIcon className="size-4" /> Crear «{search.trim()}»
              </button>
            )}
          </div>
        </section>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed bg-card/60 px-6 py-14 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-accent text-primary">
            <ShoppingBasketIcon className="size-8" />
          </span>
          <h2 className="text-lg font-semibold">La lista está vacía</h2>
          <p className="max-w-xs text-sm text-muted-foreground">Cuando falte algo, tocá «Agregar producto» o uno de los frecuentes de arriba.</p>
          <Button className="mt-1 h-12 px-6 text-base" onClick={() => onAdd()}>
            <PlusIcon /> Agregar producto
          </Button>
        </div>
      ) : (
        <>
          {pendingGroups.map(({ category, items: groupItems }) => (
            <section key={category.id} aria-labelledby={`cat-${category.id}`}>
              <h2 id={`cat-${category.id}`} className="mb-1.5 flex items-center gap-2 px-1 text-sm font-semibold text-muted-foreground">
                {category.emoji && <span aria-hidden>{category.emoji}</span>} {category.label}
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{groupItems.length}</span>
              </h2>
              <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-xs">
                {groupItems.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onToggle={() => void actions.toggle(item)}
                    onQuantity={(qty) => void actions.setQuantity(item, qty)}
                    onEdit={() => setEditing(item)}
                  />
                ))}
              </ul>
            </section>
          ))}

          {pending.length === 0 && items.some((i) => !i.bought) && <p className="py-6 text-center text-sm text-muted-foreground">Nada coincide con «{search}».</p>}
          {pending.length === 0 && !items.some((i) => !i.bought) && (
            <p className="rounded-2xl bg-accent/60 px-4 py-6 text-center text-base font-medium text-accent-foreground">🎉 ¡Todo comprado!</p>
          )}

          {bought.length > 0 && (
            <section aria-labelledby="bought-title">
              <div className="mb-1.5 flex items-center justify-between px-1">
                <button
                  type="button"
                  id="bought-title"
                  aria-expanded={showBought}
                  onClick={() => setShowBought((v) => !v)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"
                >
                  <ChevronDownIcon className={cn("size-4 transition", !showBought && "-rotate-90")} />
                  Comprados ({bought.length})
                </button>
                <Button variant="ghost" size="sm" className="h-9 text-destructive hover:text-destructive" onClick={() => setConfirmClear(true)}>
                  <Trash2Icon /> Vaciar comprados
                </Button>
              </div>
              {showBought && (
                <ul className="divide-y overflow-hidden rounded-2xl border bg-card/70">
                  {bought.map((item) => (
                    <ItemRow key={item.id} item={item} onToggle={() => void actions.toggle(item)} onQuantity={() => {}} onEdit={() => setEditing(item)} />
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}

      <EditItemSheet
        item={editing}
        onClose={() => setEditing(null)}
        onSave={(item, patch) => void actions.updateItem(item, patch)}
        onRemove={(item) => void actions.remove(item)}
      />
      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="¿Vaciar los comprados?"
        description="Se guardan en el historial, así podés repetir la compra más adelante."
        confirmLabel="Vaciar"
        destructive
        onConfirm={() => void actions.clearBought()}
      />
    </div>
  );
}
