import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { sql } from "./db";
import { DEFAULT_CATEGORIES, FALLBACK_CATEGORY, SEED_PRODUCTS, type Category, type ListItem, type Product, type Snapshot } from "@/lib/domain";
import type { Mutation } from "@/lib/schemas";

const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;

export const isValidToken = (t: string) => TOKEN_RE.test(t);
const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/** Crea un hogar con su catálogo inicial. Devuelve el token en claro (única vez que existe). */
export async function createHousehold(name: string) {
  const token = randomBytes(24).toString("base64url");
  const db = sql();
  await db.begin(async (tx) => {
    const [h] = await tx`insert into households (name, token_hash) values (${name}, ${hashToken(token)}) returning id`;
    const rows = SEED_PRODUCTS.map((p) => ({
      household_id: h.id as string,
      name: p.name,
      category: p.category,
      unit: p.unit,
      favorite: p.favorite ?? false,
    }));
    await tx`insert into products ${tx(rows, "household_id", "name", "category", "unit", "favorite")}`;
    const cats = DEFAULT_CATEGORIES.map((c, position) => ({ household_id: h.id as string, id: c.id, name: c.label, emoji: c.emoji, position }));
    await tx`insert into categories ${tx(cats, "household_id", "id", "name", "emoji", "position")}`;
  });
  return token;
}

export async function findHouseholdId(token: string): Promise<string | null> {
  if (!isValidToken(token)) return null;
  const rows = await sql()`select id from households where token_hash = ${hashToken(token)}`;
  return (rows[0]?.id as string | undefined) ?? null;
}

const ITEM_COLS = `id, product_id, (select emoji from products p where p.id = list_items.product_id) as emoji, name, category, quantity::float8 as quantity, unit, note, bought, added_by, bought_by, cleared_at, created_at`;

/* eslint-disable @typescript-eslint/no-explicit-any */
const toItem = (r: any): ListItem => ({
  id: r.id,
  productId: r.product_id,
  emoji: r.emoji,
  name: r.name,
  category: r.category,
  quantity: r.quantity,
  unit: r.unit,
  note: r.note,
  bought: r.bought,
  addedBy: r.added_by,
  boughtBy: r.bought_by,
  clearedAt: r.cleared_at ? new Date(r.cleared_at).toISOString() : null,
  createdAt: new Date(r.created_at).toISOString(),
});

const toProduct = (r: any): Product => ({
  id: r.id,
  name: r.name,
  category: r.category,
  unit: r.unit,
  favorite: r.favorite,
  useCount: r.use_count,
  emoji: r.emoji,
});

export async function getSnapshot(householdId: string): Promise<Snapshot> {
  const db = sql();
  const [hh, categories, products, items, history] = await Promise.all([
    db`select name, shopping_by, shopping_device,
         (shopping_at is not null and shopping_at > now() - interval '60 seconds') as shopping_active
       from households where id = ${householdId}`,
    db`select id, name, emoji from categories where household_id = ${householdId} order by position, name`,
    db`select id, name, category, unit, favorite, use_count, emoji from products where household_id = ${householdId} order by lower(name)`,
    db`select ${db.unsafe(ITEM_COLS)} from list_items
       where household_id = ${householdId} and cleared_at is null and removed_at is null order by created_at`,
    db`select ${db.unsafe(ITEM_COLS)} from list_items
       where household_id = ${householdId} and cleared_at is not null and removed_at is null
         and cleared_at > now() - interval '120 days'
       order by cleared_at desc, name limit 400`,
  ]);
  return {
    household: { name: hh[0].name },
    categories: categories.map((c): Category => ({ id: c.id, label: c.name, emoji: c.emoji })),
    shopping: hh[0].shopping_active ? { by: hh[0].shopping_by, device: hh[0].shopping_device } : null,
    products: products.map(toProduct),
    items: items.map(toItem),
    history: history.map(toItem),
  };
}

type AddInput = {
  by?: string | null;
  id?: string;
  emoji?: string | null;
  productId?: string | null;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  note?: string | null;
  saveToCatalog?: boolean;
};

async function validCategory(tx: ReturnType<typeof sql>, householdId: string, id: string) {
  const [c] = await tx`select id from categories where household_id = ${householdId} and id = ${id}`;
  return (c?.id as string | undefined) ?? FALLBACK_CATEGORY;
}

async function addOne(tx: ReturnType<typeof sql>, householdId: string, input: AddInput) {
  const note = input.note?.trim() || null;
  input = { ...input, category: await validCategory(tx, householdId, input.category) };
  let productId = input.productId ?? null;

  if (productId) {
    const [p] = await tx`select id from products where id = ${productId} and household_id = ${householdId}`;
    productId = p?.id ?? null;
  }
  if (!productId) {
    const [p] = await tx`select id from products where household_id = ${householdId} and lower(name) = lower(${input.name})`;
    productId = p?.id ?? null;
  }
  if (!productId && input.saveToCatalog) {
    const [p] = await tx`
      insert into products (household_id, name, category, unit, emoji) values (${householdId}, ${input.name}, ${input.category}, ${input.unit}, ${input.emoji ?? null})
      on conflict (household_id, lower(name)) do update set name = products.name returning id`;
    productId = p.id;
  }
  if (productId) await tx`update products set use_count = use_count + 1 where id = ${productId}`;

  // Evita duplicados: mismo producto/nombre y misma unidad en la lista activa.
  const [existing] = await tx`
    select id, bought from list_items
    where household_id = ${householdId} and cleared_at is null and removed_at is null
      and unit = ${input.unit}
      and (lower(name) = lower(${input.name}) ${productId ? tx`or product_id = ${productId}` : tx``})
    order by bought, created_at limit 1`;

  if (existing) {
    if (existing.bought) {
      // Ya estaba comprado y vuelve a hacer falta: se reabre con la cantidad nueva.
      await tx`update list_items set bought = false, bought_at = null, bought_by = null, quantity = ${input.quantity},
               note = coalesce(${note}, note) where id = ${existing.id}`;
    } else {
      await tx`update list_items set quantity = least(quantity + ${input.quantity}, 99999),
               note = coalesce(${note}, note) where id = ${existing.id}`;
    }
    return;
  }
  await tx`insert into list_items (id, household_id, product_id, name, category, quantity, unit, note, added_by)
           values (coalesce(${input.id ?? null}::uuid, gen_random_uuid()), ${householdId}, ${productId}, ${input.name}, ${input.category}, ${input.quantity}, ${input.unit}, ${note}, ${input.by?.trim() || null})`;
}

export async function applyMutation(householdId: string, m: Mutation): Promise<void> {
  const db = sql();
  switch (m.op) {
    case "addItem":
    case "addMany": {
      const inputs: AddInput[] = m.op === "addItem" ? [m] : m.items;
      await db.begin(async (tx) => {
        await tx`select pg_advisory_xact_lock(hashtext(${householdId}))`;
        for (const input of inputs) await addOne(tx as unknown as ReturnType<typeof sql>, householdId, input);
      });
      return;
    }
    case "updateItem":
      await db`update list_items set quantity = ${m.quantity}, unit = ${m.unit}, note = ${m.note?.trim() || null}
               where id = ${m.id} and household_id = ${householdId}`;
      return;
    case "setQuantity":
      await db`update list_items set quantity = ${m.quantity} where id = ${m.id} and household_id = ${householdId}`;
      return;
    case "toggleBought":
      await db`update list_items set bought = ${m.bought}, bought_at = ${m.bought ? db`now()` : null},
                 bought_by = ${m.bought ? m.by?.trim() || null : null}
               where id = ${m.id} and household_id = ${householdId} and cleared_at is null`;
      return;
    case "removeItem":
      await db`update list_items set removed_at = now() where id = ${m.id} and household_id = ${householdId}`;
      return;
    case "restoreItem":
      await db`update list_items set removed_at = null where id = ${m.id} and household_id = ${householdId}`;
      return;
    case "clearBought":
      await db`update list_items set cleared_at = now()
               where household_id = ${householdId} and bought and cleared_at is null and removed_at is null`;
      return;
    case "saveProduct": {
      const cat = await validCategory(db, householdId, m.category);
      if (m.id) {
        await db`update products set name = ${m.name}, category = ${cat}, unit = ${m.unit}, favorite = ${m.favorite}, emoji = ${m.emoji ?? null}
                 where id = ${m.id} and household_id = ${householdId}`;
      } else {
        await db`insert into products (household_id, name, category, unit, favorite, emoji)
                 values (${householdId}, ${m.name}, ${cat}, ${m.unit}, ${m.favorite}, ${m.emoji ?? null})
                 on conflict (household_id, lower(name)) do update
                 set category = excluded.category, unit = excluded.unit, favorite = excluded.favorite, emoji = excluded.emoji`;
      }
      return;
    }
    case "deleteProduct":
      await db`delete from products where id = ${m.id} and household_id = ${householdId}`;
      return;
    case "saveCategory":
      await db`insert into categories (household_id, id, name, emoji, position)
               values (${householdId}, ${m.id}, ${m.name}, ${m.emoji ?? null},
                       (select coalesce(max(position), -1) + 1 from categories where household_id = ${householdId}))
               on conflict (household_id, id) do update set name = excluded.name, emoji = excluded.emoji`;
      return;
    case "deleteCategory":
      if (m.id === FALLBACK_CATEGORY) return;
      await db.begin(async (tx) => {
        await tx`update products set category = ${FALLBACK_CATEGORY} where household_id = ${householdId} and category = ${m.id}`;
        await tx`update list_items set category = ${FALLBACK_CATEGORY} where household_id = ${householdId} and category = ${m.id}`;
        await tx`delete from categories where household_id = ${householdId} and id = ${m.id}`;
      });
      return;
    case "reorderCategories":
      await db.begin(async (tx) => {
        for (const [position, id] of m.ids.entries()) {
          await tx`update categories set position = ${position} where household_id = ${householdId} and id = ${id}`;
        }
      });
      return;
    case "shopPing":
      await db`update households set shopping_at = now(), shopping_by = ${m.name?.trim() || null}, shopping_device = ${m.device} where id = ${householdId}`;
      return;
    case "shopStop":
      await db`update households set shopping_at = null where id = ${householdId} and shopping_device = ${m.device}`;
      return;
    case "renameHousehold":
      await db`update households set name = ${m.name} where id = ${householdId}`;
      return;
  }
}
