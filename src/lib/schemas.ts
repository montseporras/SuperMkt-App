import { z } from "zod";
import { UNIT_IDS } from "./domain";

const name = z.string().trim().min(1, "Escribí un nombre").max(80);
const category = z.string().regex(/^[a-z0-9_]{1,40}$/);
const unit = z.enum(UNIT_IDS);
const quantity = z.number().positive().max(99999);
const id = z.string().uuid();
const note = z.string().trim().max(140).nullish();
const emoji = z.string().trim().max(16).nullish();
const by = z.string().trim().max(30).nullish(); // nombre de quien hace la acción

export const createHouseholdSchema = z.object({ name: z.string().trim().min(1).max(60).default("Mi casa") });

export const mutationSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("addItem"),
    id: id.optional(), // generado por el cliente: permite agregar sin conexión
    by,
    emoji,
    productId: id.nullish(),
    name,
    category,
    quantity,
    unit,
    note,
    saveToCatalog: z.boolean().optional(),
  }),
  z.object({
    op: z.literal("addMany"),
    items: z.array(z.object({ id: id.optional(), by, name, category, quantity, unit, note, productId: id.nullish() })).min(1).max(100),
  }),
  z.object({ op: z.literal("updateItem"), id, quantity, unit, note }),
  z.object({ op: z.literal("setQuantity"), id, quantity }),
  z.object({ op: z.literal("toggleBought"), id, bought: z.boolean(), by }),
  z.object({ op: z.literal("removeItem"), id }),
  z.object({ op: z.literal("restoreItem"), id }),
  z.object({ op: z.literal("clearBought") }),
  z.object({ op: z.literal("saveProduct"), id: id.nullish(), name, category, unit, favorite: z.boolean(), emoji }),
  z.object({ op: z.literal("deleteProduct"), id }),
  z.object({ op: z.literal("saveCategory"), id: category, name: z.string().trim().min(1).max(30), emoji }),
  z.object({ op: z.literal("deleteCategory"), id: category }),
  z.object({ op: z.literal("reorderCategories"), ids: z.array(category).min(1).max(60) }),
  z.object({ op: z.literal("shopPing"), device: z.string().min(8).max(64), name: z.string().trim().max(30).nullish() }),
  z.object({ op: z.literal("shopStop"), device: z.string().min(8).max(64) }),
  z.object({ op: z.literal("renameHousehold"), name: z.string().trim().min(1).max(60) }),
]);

export type Mutation = z.infer<typeof mutationSchema>;
