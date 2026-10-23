"use client";

import { useMemo, useState } from "react";
import { PlusIcon, SearchIcon, StarIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { unitOf, type CategoryId, type Product, type UnitId } from "@/lib/domain";
import type { Actions } from "@/hooks/use-actions";
import { cn } from "@/lib/utils";
import { EmojiPicker } from "./emoji-picker";
import { CategoryManager } from "./category-manager";
import { useCategories } from "./categories-context";
import { ConfirmDialog } from "./confirm-dialog";
import { CategoryChips, Label, UnitSelect, inputClass } from "./fields";
import { ProductIcon } from "./product-icon";
import { Sheet } from "./sheet";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

type Editing = { id: string | null; name: string; category: CategoryId; unit: UnitId; favorite: boolean; emoji: string | null };

export function CatalogView({ products, actions }: { products: Product[]; actions: Actions }) {
  const { categories } = useCategories();
  const [managing, setManaging] = useState(false);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<CategoryId | "all" | "fav">("all");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [toDelete, setToDelete] = useState<Product | null>(null);

  const q = norm(search);
  const visible = useMemo(
    () =>
      products.filter((p) => (cat === "all" ? true : cat === "fav" ? p.favorite : p.category === cat) && (!q || norm(p.name).includes(q))),
    [products, cat, q],
  );
  const known = new Set(categories.map((c) => c.id));
  const groups = categories.map((c) => ({ c, list: visible.filter((p) => p.category === c.id || (c.id === "otras" && !known.has(p.category))) })).filter((g) => g.list.length);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
          <input type="search" aria-label="Buscar en el catálogo" placeholder="Buscar en el catálogo…" className={cn(inputClass, "h-12 pl-10")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button className="h-12 px-4" onClick={() => setEditing({ id: null, name: search.trim(), category: "otras", unit: "u", favorite: false, emoji: null })}>
          <PlusIcon /> <span className="hidden sm:inline">Nuevo</span>
          <span className="sr-only sm:hidden">Nuevo producto</span>
        </Button>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="tablist" aria-label="Filtrar por categoría">
        {[{ id: "all", label: "Todos" }, { id: "fav", label: "★ Favoritos" }, ...categories.map((c) => ({ id: c.id, label: `${c.emoji ? c.emoji + " " : ""}${c.label}` })), { id: "manage", label: "⚙ Editar categorías" }].map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={cat === f.id}
            onClick={() => (f.id === "manage" ? setManaging(true) : setCat(f.id as typeof cat))}
            className={cn("h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition", cat === f.id ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card hover:bg-muted")}
          >
            {f.label}
          </button>
        ))}
      </div>

      {groups.length === 0 && (
        <p className="rounded-2xl border border-dashed bg-card/60 px-4 py-10 text-center text-sm text-muted-foreground">
          {products.length === 0 ? "Todavía no guardaste productos. Tocá «Nuevo» para empezar." : "Sin resultados."}
        </p>
      )}

      {groups.map(({ c, list }) => (
        <section key={c.id}>
          <h2 className="mb-1.5 flex items-center gap-2 px-1 text-sm font-semibold text-muted-foreground">
            {c.emoji && <span aria-hidden>{c.emoji}</span>} {c.label}
          </h2>
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-xs">
            {list.map((p) => (
              <li key={p.id} className="flex items-center gap-1 pr-2 pl-1">
                <button
                  type="button"
                  aria-label={p.favorite ? `Quitar ${p.name} de favoritos` : `Marcar ${p.name} como favorito`}
                  aria-pressed={p.favorite}
                  onClick={() => void actions.toggleFavorite(p)}
                  className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                >
                  <StarIcon className={cn("size-5", p.favorite && "fill-amber-400 text-amber-400")} />
                </button>
                <button
                  type="button"
                  onClick={() => setEditing({ id: p.id, name: p.name, category: p.category, unit: p.unit, favorite: p.favorite, emoji: p.emoji })}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-2.5 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  aria-label={`Editar ${p.name}`}
                >
                  <ProductIcon name={p.name} emoji={p.emoji} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-medium">{p.name}</span>
                    <span className="block text-sm text-muted-foreground">{unitOf(p.unit).label}</span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Agregar ${p.name} a la lista`}
                  onClick={() => void actions.quickAdd(p)}
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground transition active:scale-90 hover:bg-accent"
                >
                  <PlusIcon className="size-5" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <ProductSheet
        key={editing?.id ?? (editing ? "new" : "none")}
        value={editing}
        onClose={() => setEditing(null)}
        actions={actions}
        onSave={async (p) => {
          if (await actions.saveProduct(p)) setEditing(null);
        }}
        onDelete={() => {
          const p = products.find((x) => x.id === editing?.id);
          if (p) setToDelete(p);
          setEditing(null);
        }}
      />
      <CategoryManager open={managing} onClose={() => setManaging(false)} actions={actions} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`¿Eliminar ${toDelete?.name ?? ""}?`}
        description="Se borra del catálogo. Si está en la lista de compras, ahí se mantiene."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => toDelete && void actions.deleteProduct(toDelete)}
      />
    </div>
  );
}

function ProductSheet({ value, onClose, onSave, onDelete, actions }: { value: Editing | null; onClose: () => void; onSave: (p: Editing) => void; onDelete: () => void; actions: Actions }) {
  const [draft, setDraft] = useState<Editing | null>(value);
  const d = draft ?? value;
  return (
    <Sheet
      open={!!value}
      onOpenChange={(o) => !o && onClose()}
      title={value?.id ? "Editar producto" : "Nuevo producto"}
      footer={
        d && (
          <div className="grid grid-cols-[auto_1fr] gap-3">
            {value?.id ? (
              <Button variant="destructive" className="h-12 px-4" onClick={onDelete} aria-label="Eliminar producto">
                <Trash2Icon className="size-5" />
              </Button>
            ) : (
              <span />
            )}
            <Button className="h-12 text-base" disabled={!d.name.trim()} onClick={() => onSave({ ...d, name: d.name.trim() })}>
              Guardar
            </Button>
          </div>
        )
      }
    >
      {d && (
        <div className="space-y-5 pt-2">
          <div>
            <Label htmlFor="p-name">Nombre</Label>
            <input id="p-name" className={inputClass} value={d.name} maxLength={80} onChange={(e) => setDraft({ ...d, name: e.target.value })} />
          </div>
          <EmojiPicker name={d.name} value={d.emoji} onChange={(emoji) => setDraft({ ...d, emoji })} />
          <div>
            <Label>Categoría</Label>
            <CategoryChips value={d.category} onChange={(category) => setDraft({ ...d, category })} onCreate={(label, emoji) => actions.saveCategory({ label, emoji })} />
          </div>
          <div>
            <Label>Unidad habitual</Label>
            <UnitSelect value={d.unit} onChange={(unit) => setDraft({ ...d, unit })} className="w-full" />
          </div>
          <label className="flex items-center gap-3 text-base">
            <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={d.favorite} onChange={(e) => setDraft({ ...d, favorite: e.target.checked })} />
            Favorito (aparece en «Frecuentes»)
          </label>
        </div>
      )}
    </Sheet>
  );
}
