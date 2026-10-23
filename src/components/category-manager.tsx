"use client";

import { useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FALLBACK_CATEGORY, type Category } from "@/lib/domain";
import type { Actions } from "@/hooks/use-actions";
import { useCategories } from "./categories-context";
import { ConfirmDialog } from "./confirm-dialog";
import { EmojiInput } from "./emoji-picker";
import { Label, inputClass } from "./fields";
import { Sheet } from "./sheet";

type Draft = { id?: string; label: string; emoji: string | null };

export function CategoryManager({ open, onClose, actions }: { open: boolean; onClose: () => void; actions: Actions }) {
  const { categories } = useCategories();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);

  const move = (index: number, dir: -1 | 1) => {
    const ids = categories.map((c) => c.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    void actions.reorderCategories(ids);
  };

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(o) => {
          if (!o) {
            setDraft(null);
            onClose();
          }
        }}
        title={draft ? (draft.id ? "Editar categoría" : "Nueva categoría") : "Categorías"}
        description={draft ? undefined : "El orden es el de la lista de compras y el del PDF."}
      >
        {draft ? (
          <form
            className="space-y-5 pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.label.trim()) return;
              actions.saveCategory({ ...draft, label: draft.label.trim() });
              setDraft(null);
            }}
          >
            <div>
              <Label htmlFor="cat-name">Nombre</Label>
              <input id="cat-name" autoFocus className={inputClass} maxLength={30} value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="cat-emoji">Emoji (opcional)</Label>
              <EmojiInput id="cat-emoji" value={draft.emoji} onChange={(emoji) => setDraft({ ...draft, emoji })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="outline" className="h-12 text-base" onClick={() => setDraft(null)}>
                Cancelar
              </Button>
              <Button type="submit" className="h-12 text-base" disabled={!draft.label.trim()}>
                Guardar
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3 pt-2">
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
              {categories.map((c, i) => (
                <li key={c.id} className="flex items-center gap-1 py-1 pr-1 pl-3">
                  <span className="w-7 text-center text-xl" aria-hidden>
                    {c.emoji ?? "•"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-base font-medium">{c.label}</span>
                  <button type="button" aria-label={`Subir ${c.label}`} disabled={i === 0} onClick={() => move(i, -1)} className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-muted disabled:opacity-30">
                    <ArrowUpIcon className="size-4" />
                  </button>
                  <button type="button" aria-label={`Bajar ${c.label}`} disabled={i === categories.length - 1} onClick={() => move(i, 1)} className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-muted disabled:opacity-30">
                    <ArrowDownIcon className="size-4" />
                  </button>
                  <button type="button" aria-label={`Editar ${c.label}`} onClick={() => setDraft({ id: c.id, label: c.label, emoji: c.emoji })} className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-muted">
                    <PencilIcon className="size-4" />
                  </button>
                  {c.id !== FALLBACK_CATEGORY && (
                    <button type="button" aria-label={`Eliminar ${c.label}`} onClick={() => setToDelete(c)} className="grid size-10 place-items-center rounded-full text-destructive hover:bg-destructive/10">
                      <Trash2Icon className="size-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <Button className="h-12 w-full text-base" onClick={() => setDraft({ label: "", emoji: null })}>
              <PlusIcon /> Nueva categoría
            </Button>
          </div>
        )}
      </Sheet>
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`¿Eliminar «${toDelete?.label ?? ""}»?`}
        description="Sus productos no se borran: pasan a la categoría «Otras»."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => toDelete && void actions.deleteCategory(toDelete.id)}
      />
    </>
  );
}
