"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { FALLBACK_CATEGORY, type CategoryId, type ListItem, Product, Snapshot, UnitId } from "@/lib/domain";
import type { Mutation } from "@/lib/schemas";
import { getName } from "@/lib/device";
import { applyAdd } from "@/lib/optimistic";

type MutateFn = (m: Mutation, optimistic?: (s: Snapshot) => Snapshot) => Promise<boolean>;

export const defaultQty = (unit: UnitId) => (unit === "g" || unit === "ml" ? 500 : 1);

export interface NewItem {
  productId?: string | null;
  name: string;
  category: CategoryId;
  quantity: number;
  unit: UnitId;
  note?: string | null;
  saveToCatalog?: boolean;
  emoji?: string | null;
}

const mapItem = (s: Snapshot, id: string, fn: (i: ListItem) => ListItem): Snapshot => ({
  ...s,
  items: s.items.map((i) => (i.id === id ? fn(i) : i)),
});

export function useActions(mutate: MutateFn) {
  return useMemo(() => {
    const addItem = async (input: NewItem) => {
      const id = crypto.randomUUID();
      const by = getName() || null;
      const ok = await mutate({ op: "addItem", id, by, ...input }, (s) => applyAdd(s, { id, by, ...input }));
      if (ok) toast.success(`${input.name} agregado a la lista`);
      return ok;
    };

    const quickAdd = (p: Product) =>
      addItem({ productId: p.id, name: p.name, category: p.category, unit: p.unit, quantity: defaultQty(p.unit) });

    const toggle = (item: ListItem) =>
      {
      const by = getName() || null;
      return mutate({ op: "toggleBought", id: item.id, bought: !item.bought, by }, (s) =>
        mapItem(s, item.id, (i) => ({ ...i, bought: !i.bought, boughtBy: i.bought ? null : by })),
      );
    };

    const setQuantity = (item: ListItem, quantity: number) =>
      mutate({ op: "setQuantity", id: item.id, quantity }, (s) => mapItem(s, item.id, (i) => ({ ...i, quantity })));

    const remove = async (item: ListItem) => {
      const ok = await mutate({ op: "removeItem", id: item.id }, (s) => ({ ...s, items: s.items.filter((i) => i.id !== item.id) }));
      if (ok)
        toast(`${item.name} eliminado`, {
          action: { label: "Deshacer", onClick: () => void mutate({ op: "restoreItem", id: item.id }) },
        });
    };

    const updateItem = async (item: ListItem, patch: { quantity: number; unit: UnitId; note: string | null }) => {
      const ok = await mutate({ op: "updateItem", id: item.id, ...patch }, (s) => mapItem(s, item.id, (i) => ({ ...i, ...patch })));
      if (ok) toast.success("Cambios guardados");
      return ok;
    };

    const clearBought = async () => {
      const ok = await mutate({ op: "clearBought" }, (s) => ({ ...s, items: s.items.filter((i) => !i.bought) }));
      if (ok) toast.success("Comprados guardados en el historial");
    };

    const repeat = async (items: ListItem[]) => {
      const by = getName() || null;
      const rows = items.map((i) => ({
        id: crypto.randomUUID(),
        by,
        productId: i.productId,
        name: i.name,
        category: i.category,
        quantity: i.quantity,
        unit: i.unit,
        note: i.note,
      }));
      const ok = await mutate({ op: "addMany", items: rows }, (s) => rows.reduce((acc, r) => applyAdd(acc, r), s));
      if (ok) toast.success(items.length === 1 ? `${items[0].name} agregado a la lista` : `${items.length} productos agregados a la lista`);
      return ok;
    };

    const saveProduct = async (p: { id?: string | null; name: string; category: CategoryId; unit: UnitId; favorite: boolean; emoji?: string | null }) => {
      const ok = await mutate({ op: "saveProduct", ...p }, (s) => {
        const emoji = p.emoji ?? null;
        if (p.id) return { ...s, products: s.products.map((x) => (x.id === p.id ? { ...x, name: p.name, category: p.category, unit: p.unit, favorite: p.favorite, emoji } : x)), items: s.items.map((i) => (i.productId === p.id ? { ...i, emoji } : i)) };
        if (s.products.some((x) => x.name.toLowerCase() === p.name.toLowerCase())) return s;
        return { ...s, products: [...s.products, { id: crypto.randomUUID(), name: p.name, category: p.category, unit: p.unit, favorite: p.favorite, useCount: 0, emoji }] };
      });
      if (ok) toast.success(p.id ? "Producto actualizado" : "Producto guardado en el catálogo");
      return ok;
    };

    const toggleFavorite = (p: Product) =>
      mutate(
        { op: "saveProduct", id: p.id, name: p.name, category: p.category, unit: p.unit, favorite: !p.favorite, emoji: p.emoji },
        (s) => ({ ...s, products: s.products.map((x) => (x.id === p.id ? { ...x, favorite: !x.favorite } : x)) }),
      );

    const deleteProduct = async (p: Product) => {
      const ok = await mutate({ op: "deleteProduct", id: p.id }, (s) => ({ ...s, products: s.products.filter((x) => x.id !== p.id) }));
      if (ok) toast(`${p.name} eliminado del catálogo`);
    };

    /** Crea o edita una categoría. Devuelve su id al instante (se genera en el dispositivo). */
    const saveCategory = (c: { id?: string; label: string; emoji: string | null }): string => {
      const id = c.id ?? `c_${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
      void mutate({ op: "saveCategory", id, name: c.label, emoji: c.emoji }, (s) => ({
        ...s,
        categories: s.categories.some((x) => x.id === id)
          ? s.categories.map((x) => (x.id === id ? { ...x, label: c.label, emoji: c.emoji } : x))
          : [...s.categories, { id, label: c.label, emoji: c.emoji }],
      }));
      return id;
    };

    const deleteCategory = async (id: string) => {
      if (id === FALLBACK_CATEGORY) return;
      const ok = await mutate({ op: "deleteCategory", id }, (s) => ({
        ...s,
        categories: s.categories.filter((c) => c.id !== id),
        products: s.products.map((p) => (p.category === id ? { ...p, category: FALLBACK_CATEGORY } : p)),
        items: s.items.map((i) => (i.category === id ? { ...i, category: FALLBACK_CATEGORY } : i)),
      }));
      if (ok) toast("Categoría eliminada. Sus productos pasaron a «Otras».");
    };

    const reorderCategories = (ids: string[]) =>
      mutate({ op: "reorderCategories", ids }, (s) => ({ ...s, categories: ids.map((id) => s.categories.find((c) => c.id === id)!).filter(Boolean) }));

    const rename = async (name: string) => {
      const ok = await mutate({ op: "renameHousehold", name }, (s) => ({ ...s, household: { name } }));
      if (ok) toast.success("Nombre actualizado");
    };

    return { addItem, quickAdd, toggle, setQuantity, remove, updateItem, clearBought, repeat, saveProduct, toggleFavorite, deleteProduct, rename, saveCategory, deleteCategory, reorderCategories };
  }, [mutate]);
}

export type Actions = ReturnType<typeof useActions>;
