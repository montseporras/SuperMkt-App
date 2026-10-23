import type { CategoryId, ListItem, Snapshot, UnitId } from "./domain";

export interface AddInput {
  id: string;
  productId?: string | null;
  emoji?: string | null;
  name: string;
  category: CategoryId;
  quantity: number;
  unit: UnitId;
  note?: string | null;
  saveToCatalog?: boolean;
  by?: string | null;
}

/** Réplica local de la lógica de "agregar" del servidor (sin duplicados), para verla al instante y sin conexión. */
export function applyAdd(s: Snapshot, input: AddInput): Snapshot {
  const lname = input.name.trim().toLowerCase();
  const note = input.note?.trim() || null;
  let products = s.products;
  let product = products.find((p) => p.id === input.productId) ?? products.find((p) => p.name.toLowerCase() === lname);

  if (!product && input.saveToCatalog) {
    product = { id: crypto.randomUUID(), name: input.name.trim(), category: input.category, unit: input.unit, favorite: false, useCount: 0, emoji: input.emoji ?? null };
    products = [...products, product];
  }
  if (product) {
    const pid = product.id;
    products = products.map((p) => (p.id === pid ? { ...p, useCount: p.useCount + 1 } : p));
  }

  const matches = (i: ListItem) => i.unit === input.unit && (i.name.toLowerCase() === lname || (!!product && i.productId === product.id));
  const existing = s.items.find((i) => !i.bought && matches(i)) ?? s.items.find((i) => i.bought && matches(i));

  if (existing) {
    return {
      ...s,
      products,
      items: s.items.map((i) =>
        i.id !== existing.id
          ? i
          : existing.bought
            ? { ...i, bought: false, boughtBy: null, quantity: input.quantity, note: note ?? i.note }
            : { ...i, quantity: Math.min(99999, i.quantity + input.quantity), note: note ?? i.note },
      ),
    };
  }
  const item: ListItem = {
    id: input.id,
    productId: product?.id ?? null,
    emoji: product?.emoji ?? input.emoji ?? null,
    name: input.name.trim(),
    category: input.category,
    quantity: input.quantity,
    unit: input.unit,
    note,
    bought: false,
    addedBy: input.by?.trim() || null,
    boughtBy: null,
    clearedAt: null,
    createdAt: new Date().toISOString(),
  };
  return { ...s, products, items: [...s.items, item] };
}
