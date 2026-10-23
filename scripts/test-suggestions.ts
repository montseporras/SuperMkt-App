import assert from "node:assert/strict";
import { suggest } from "../src/lib/suggestions";
import type { ListItem } from "../src/lib/domain";

const DAY = 86_400_000;
const now = Date.parse("2026-10-23T12:00:00Z");
const row = (name: string, daysAgo: number): ListItem => ({
  id: crypto.randomUUID(), productId: null, emoji: null, name, category: "lacteos", quantity: 2, unit: "l",
  note: null, addedBy: null, boughtBy: null, bought: true, clearedAt: new Date(now - daysAgo * DAY).toISOString(), createdAt: new Date(now - daysAgo * DAY).toISOString(),
});

// Leche: cada 7 días, última hace 8 -> sugerida. Pan: cada 3 días, última hace 1 -> no. Sal: una sola compra -> no.
const history = [row("Leche", 22), row("Leche", 15), row("Leche", 8), row("Pan", 7), row("Pan", 4), row("Pan", 1), row("Sal", 30)];
const s = suggest(history, [], now);
assert.deepEqual(s.map((x) => x.name), ["Leche"]);
assert.equal(s[0].everDays, 7);
assert.equal(s[0].quantity, 2);
// Si ya está pendiente en la lista, no se sugiere.
assert.equal(suggest(history, [{ ...row("Leche", 0), bought: false, clearedAt: null }], now).length, 0);
// Un registro del mismo día no cuenta como dos compras.
assert.equal(suggest([row("Té", 20), row("Té", 20)], [], now).length, 0);
console.log("suggestions: OK");
