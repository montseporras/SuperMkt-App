"use client";

import { useMemo, useRef, useState } from "react";
import { CheckIcon, PlusIcon, SearchIcon, StarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { unitOf, type CategoryId, type ListItem, type Product, type UnitId } from "@/lib/domain";
import { defaultQty, type Actions } from "@/hooks/use-actions";
import { cn } from "@/lib/utils";
import { CategoryChips, Label, QtyStepper, UnitSelect, inputClass } from "./fields";
import { ProductIcon } from "./product-icon";
import { useCategories } from "./categories-context";
import { EmojiPicker } from "./emoji-picker";
import { Sheet } from "./sheet";

interface Props {
  open: boolean;
  onClose: () => void;
  initialQuery: string;
  products: Product[];
  items: ListItem[];
  actions: Actions;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

type Draft = { productId: string | null; name: string; category: CategoryId; unit: UnitId; quantity: number; note: string; isNew: boolean; emoji: string | null };

export function AddSheet(props: Props) {
  // Se remonta al abrir, para que el estado interno siempre arranque limpio.
  return props.open ? <AddSheetBody {...props} /> : null;
}

function AddSheetBody({ onClose, initialQuery, products, items, actions }: Props) {
  const { find } = useCategories();
  const [query, setQuery] = useState(initialQuery);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saveToCatalog, setSaveToCatalog] = useState(true);
  const [busy, setBusy] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const pendingByProduct = useMemo(() => {
    const m = new Map<string, ListItem>();
    for (const i of items) if (!i.bought) m.set(i.productId ?? `n:${norm(i.name)}`, i);
    return m;
  }, [items]);

  const q = norm(query);
  const matches = useMemo(() => {
    const list = q ? products.filter((p) => norm(p.name).includes(q)) : products;
    return [...list].sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.useCount - a.useCount || a.name.localeCompare(b.name, "es"));
  }, [products, q]);
  const exact = products.some((p) => norm(p.name) === q);

  const startNew = () =>
    setDraft({ productId: null, name: query.trim(), category: "otras", unit: "u", quantity: 1, note: "", isNew: true, emoji: null });
  const startFrom = (p: Product) =>
    setDraft({ productId: p.id, name: p.name, category: p.category, unit: p.unit, quantity: defaultQty(p.unit), note: "", isNew: false, emoji: p.emoji });

  const submit = async () => {
    if (!draft || !draft.name.trim() || busy) return;
    setBusy(true);
    const ok = await actions.addItem({
      productId: draft.productId,
      name: draft.name.trim(),
      category: draft.category,
      unit: draft.unit,
      quantity: draft.quantity,
      note: draft.note.trim() || null,
      saveToCatalog: draft.isNew ? saveToCatalog : false,
      emoji: draft.emoji,
    });
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={draft ? (draft.isNew ? "Producto nuevo" : draft.name) : "Agregar producto"}
      description={draft && !draft.isNew ? find(draft.category).label : undefined}
      initialFocus={draft ? undefined : searchRef}
      className="sm:h-[40rem]"
      footer={
        draft ? (
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <Button variant="outline" className="h-12 px-5 text-base" onClick={() => setDraft(null)}>
              Atrás
            </Button>
            <Button className="h-12 text-base" disabled={busy || !draft.name.trim()} onClick={submit}>
              <PlusIcon /> Agregar a la lista
            </Button>
          </div>
        ) : undefined
      }
    >
      {draft ? (
        <form
          className="space-y-5 pt-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {draft.isNew && (
            <div>
              <Label htmlFor="new-name">Nombre</Label>
              <input id="new-name" className={inputClass} value={draft.name} maxLength={80} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
          )}
          <div>
            <Label>Cantidad</Label>
            <div className="flex items-center justify-between gap-3">
              <QtyStepper value={draft.quantity} unit={draft.unit} onChange={(quantity) => setDraft({ ...draft, quantity })} size="lg" />
              <UnitSelect value={draft.unit} onChange={(unit) => setDraft({ ...draft, unit, quantity: defaultQty(unit) })} className="min-w-0 flex-1" />
            </div>
          </div>
          {draft.isNew && (
            <>
              <EmojiPicker name={draft.name} value={draft.emoji} onChange={(emoji) => setDraft({ ...draft, emoji })} />
              <div>
                <Label>Categoría</Label>
                <CategoryChips value={draft.category} onChange={(category) => setDraft({ ...draft, category })} onCreate={(label, emoji) => actions.saveCategory({ label, emoji })} />
              </div>
              <label className="flex items-center gap-3 text-sm">
                <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={saveToCatalog} onChange={(e) => setSaveToCatalog(e.target.checked)} />
                Guardar en el catálogo para la próxima vez
              </label>
            </>
          )}
          <div>
            <Label htmlFor="add-note">Nota (opcional)</Label>
            <input id="add-note" className={inputClass} value={draft.note} maxLength={140} placeholder="Ej: descremada, marca X" onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
          </div>
          <button type="submit" hidden />
        </form>
      ) : (
        <div className="flex h-full flex-col gap-3 pt-1">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              type="search"
              inputMode="search"
              enterKeyHint="search"
              aria-label="Buscar o escribir un producto"
              placeholder="Buscar o escribir un producto…"
              className={cn(inputClass, "h-12 pl-10")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                if (matches.length === 1) startFrom(matches[0]);
                else if (query.trim() && !exact) startNew();
              }}
            />
          </div>

          {query.trim() && !exact && (
            <button
              type="button"
              onClick={startNew}
              className="flex items-center gap-3 rounded-2xl border border-dashed border-primary/50 bg-accent/60 px-4 py-3 text-left text-base font-medium text-accent-foreground transition hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
                <PlusIcon className="size-4" />
              </span>
              Crear «{query.trim()}»
            </button>
          )}

          <ul className="-mx-1 space-y-0.5" aria-label="Productos guardados">
            {matches.map((p) => {
              const inList = pendingByProduct.get(p.id) ?? pendingByProduct.get(`n:${norm(p.name)}`);
              return (
                <li key={p.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startFrom(p)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <ProductIcon name={p.name} emoji={p.emoji} className="size-9 text-2xl" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 truncate text-base font-medium">
                        {p.name}
                        {p.favorite && <StarIcon className="size-3.5 shrink-0 fill-amber-400 text-amber-400" aria-label="Favorito" />}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {inList ? `En la lista · ${inList.quantity} ${unitOf(inList.unit).short}` : unitOf(p.unit).label}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Agregar ${p.name} rápido`}
                    onClick={() => void actions.quickAdd(p)}
                    className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground transition active:scale-90 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {inList ? <CheckIcon className="size-5" /> : <PlusIcon className="size-5" />}
                  </button>
                </li>
              );
            })}
            {matches.length === 0 && !query.trim() && (
              <li className="px-2 py-6 text-center text-sm text-muted-foreground">Tu catálogo está vacío. Escribí un producto para crearlo.</li>
            )}
          </ul>
          <p className="px-1 text-xs text-muted-foreground">
            Tocá <b>+</b> para sumar una unidad al instante, o el nombre para elegir cantidad.
          </p>
        </div>
      )}
    </Sheet>
  );
}
