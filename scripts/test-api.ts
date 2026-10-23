// Prueba de integración contra el servidor en marcha (npm run dev + npm run db:dev).
// Uso: npm run test:api   (BASE_URL opcional, por defecto http://localhost:3000)
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

type Snap = {
  household: { name: string };
  products: Array<{ id: string; emoji?: string | null; name: string; favorite: boolean; useCount: number }>;
  items: Array<{ id: string; emoji?: string | null; name: string; quantity: number; unit: string; bought: boolean; note: string | null }>;
  history: Array<{ id: string; name: string; clearedAt: string | null }>;
};

const post = (token: string, body: unknown) =>
  fetch(`${BASE}/api/h/${token}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const op = async (token: string, body: unknown) => {
  const r = await post(token, body);
  assert.equal(r.status, 200, `op ${JSON.stringify(body)} -> ${r.status}`);
  return (await r.json()) as Snap;
};
const get = async (token: string) => (await (await fetch(`${BASE}/api/h/${token}`)).json()) as Snap;

let passed = 0;
const test = async (name: string, fn: () => Promise<void>) => {
  await fn();
  passed++;
  console.log(`  ✔ ${name}`);
};

async function main() {
  const create = async (name: string) => ((await (await fetch(`${BASE}/api/households`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) })).json()) as { token: string }).token;
  const A = await create("Casa A");
  const B = await create("Casa B");

  await test("el hogar nuevo trae catálogo inicial y lista vacía", async () => {
    const s = await get(A);
    assert.equal(s.household.name, "Casa A");
    assert.ok(s.products.length >= 20);
    assert.equal(s.items.length, 0);
  });

  await test("token inválido o inexistente => 404 (sin filtrar datos)", async () => {
    assert.equal((await fetch(`${BASE}/api/h/corto`)).status, 404);
    assert.equal((await fetch(`${BASE}/api/h/${"x".repeat(32)}`)).status, 404);
    assert.equal((await post("x".repeat(32), { op: "clearBought" })).status, 404);
  });

  await test("validación: operaciones y datos inválidos => 400", async () => {
    assert.equal((await post(A, { op: "addItem", name: "", category: "otras", quantity: 1, unit: "u" })).status, 400);
    assert.equal((await post(A, { op: "addItem", name: "X", category: "otras", quantity: -2, unit: "u" })).status, 400);
    assert.equal((await post(A, { op: "addItem", name: "X", category: "Mal Id!", quantity: 1, unit: "u" })).status, 400);
    assert.equal((await post(A, { op: "dropTables" })).status, 400);
  });

  let milkId = "";
  await test("agregar desde el catálogo y evitar duplicados (suma cantidad)", async () => {
    const cat = await get(A);
    const leche = cat.products.find((p) => p.name === "Leche")!;
    await op(A, { op: "addItem", productId: leche.id, name: "Leche", category: "lacteos", quantity: 1, unit: "l" });
    const s = await op(A, { op: "addItem", productId: leche.id, name: "leche", category: "lacteos", quantity: 2, unit: "l" });
    assert.equal(s.items.length, 1);
    assert.equal(s.items[0].quantity, 3);
    assert.equal(s.products.find((p) => p.id === leche.id)!.useCount, 2);
    milkId = s.items[0].id;
  });

  await test("misma cosa con otra unidad => renglón separado", async () => {
    const s = await op(A, { op: "addItem", name: "Leche", category: "lacteos", quantity: 500, unit: "ml" });
    assert.equal(s.items.length, 2);
  });

  await test("producto nuevo manual, con y sin guardado en catálogo + nota", async () => {
    let s = await op(A, { op: "addItem", name: "Granola", category: "almacen", quantity: 1, unit: "paq", note: "sin pasas", saveToCatalog: true });
    assert.ok(s.products.some((p) => p.name === "Granola"));
    assert.equal(s.items.find((i) => i.name === "Granola")!.note, "sin pasas");
    s = await op(A, { op: "addItem", name: "Velas", category: "otras", quantity: 1, unit: "u", saveToCatalog: false });
    assert.ok(!s.products.some((p) => p.name === "Velas"));
  });

  await test("cantidad, edición, marcar/desmarcar comprado", async () => {
    let s = await op(A, { op: "setQuantity", id: milkId, quantity: 6 });
    assert.equal(s.items.find((i) => i.id === milkId)!.quantity, 6);
    s = await op(A, { op: "updateItem", id: milkId, quantity: 1.5, unit: "l", note: "descremada" });
    const m = s.items.find((i) => i.id === milkId)!;
    assert.deepEqual([m.quantity, m.note], [1.5, "descremada"]);
    s = await op(A, { op: "toggleBought", id: milkId, bought: true });
    assert.equal(s.items.find((i) => i.id === milkId)!.bought, true);
    s = await op(A, { op: "toggleBought", id: milkId, bought: false });
    assert.equal(s.items.find((i) => i.id === milkId)!.bought, false);
  });

  await test("eliminar y restaurar", async () => {
    let s = await op(A, { op: "removeItem", id: milkId });
    assert.ok(!s.items.some((i) => i.id === milkId));
    s = await op(A, { op: "restoreItem", id: milkId });
    assert.ok(s.items.some((i) => i.id === milkId));
  });

  await test("agregar un producto ya comprado lo reabre en vez de duplicarlo", async () => {
    await op(A, { op: "toggleBought", id: milkId, bought: true });
    const s = await op(A, { op: "addItem", name: "Leche", category: "lacteos", quantity: 2, unit: "l" });
    const m = s.items.filter((i) => i.name === "Leche" && i.unit === "l");
    assert.equal(m.length, 1);
    assert.deepEqual([m[0].bought, m[0].quantity], [false, 2]);
  });

  await test("vaciar comprados => pasan al historial; 'repetir' los vuelve a la lista", async () => {
    await op(A, { op: "toggleBought", id: milkId, bought: true });
    const s = await op(A, { op: "clearBought" });
    assert.ok(!s.items.some((i) => i.id === milkId));
    const h = s.history.find((i) => i.name === "Leche")!;
    assert.ok(h.clearedAt);
    const s2 = await op(A, { op: "addMany", items: [{ name: "Leche", category: "lacteos", quantity: 2, unit: "l" }, { name: "Pan", category: "almacen", quantity: 1, unit: "u" }] });
    assert.ok(s2.items.some((i) => i.name === "Leche" && !i.bought));
    assert.ok(s2.items.some((i) => i.name === "Pan"));
  });

  await test("catálogo: crear, editar (favorito) y eliminar", async () => {
    let s = await op(A, { op: "saveProduct", name: "Mate", category: "almacen", unit: "paq", favorite: true });
    const mate = s.products.find((p) => p.name === "Mate")!;
    assert.equal(mate.favorite, true);
    s = await op(A, { op: "saveProduct", id: mate.id, name: "Yerba", category: "almacen", unit: "paq", favorite: false });
    assert.equal(s.products.find((p) => p.id === mate.id)!.name, "Yerba");
    s = await op(A, { op: "deleteProduct", id: mate.id });
    assert.ok(!s.products.some((p) => p.id === mate.id));
  });

  await test("renombrar hogar", async () => {
    assert.equal((await op(A, { op: "renameHousehold", name: "Casa de Ana" })).household.name, "Casa de Ana");
  });

  await test("aislamiento: otro hogar no ve ni puede tocar datos ajenos", async () => {
    const b = await get(B);
    assert.equal(b.items.length, 0);
    assert.equal(b.household.name, "Casa B");
    const a = await get(A);
    const foreign = a.items[0].id;
    await op(B, { op: "removeItem", id: foreign });
    await op(B, { op: "toggleBought", id: foreign, bought: true });
    const a2 = await get(A);
    const it = a2.items.find((i) => i.id === foreign);
    assert.ok(it && !it.bought, "el ítem ajeno no debe cambiar");
  });

  await test("concurrencia: 10 altas simultáneas del mismo producto suman sin duplicar", async () => {
    await Promise.all(Array.from({ length: 10 }, () => op(B, { op: "addItem", name: "Café", category: "almacen", quantity: 1, unit: "paq" })));
    const s = await get(B);
    const cafe = s.items.filter((i) => i.name === "Café");
    assert.equal(cafe.length, 1);
    assert.equal(cafe[0].quantity, 10);
  });

  await test("emoji propio en producto y en sus ítems; id generado por el cliente", async () => {
    const id = crypto.randomUUID();
    const s = await op(A, { op: "addItem", id, name: "Yerba mate", category: "almacen", quantity: 1, unit: "paq", saveToCatalog: true, emoji: "🧉" });
    const p = s.products.find((x) => x.name === "Yerba mate")!;
    assert.equal(p.emoji, "🧉");
    const it = s.items.find((x) => x.id === id)!;
    assert.ok(it, "el ítem usa el id del cliente");
    assert.equal(it.emoji, "🧉");
    const s2 = await op(A, { op: "saveProduct", id: p.id, name: "Yerba mate", category: "almacen", unit: "paq", favorite: false, emoji: "🌿" });
    assert.equal(s2.items.find((x) => x.id === id)!.emoji, "🌿");
  });

  await test("categorías propias: crear, mover productos al borrar, reordenar, proteger «otras»", async () => {
    let s = (await get(A)) as Snap & { categories: Array<{ id: string; label: string; emoji: string | null }> };
    assert.equal(s.categories.length, 9);
    s = (await op(A, { op: "saveCategory", id: "c_mascotas", name: "Mascotas", emoji: "🐶" })) as typeof s;
    assert.deepEqual(s.categories.at(-1), { id: "c_mascotas", label: "Mascotas", emoji: "🐶" });
    // un producto/ítem en la categoría nueva
    s = (await op(A, { op: "addItem", name: "Alimento balanceado", category: "c_mascotas", quantity: 1, unit: "paq", saveToCatalog: true })) as typeof s;
    assert.equal((s.items.find((i) => i.name === "Alimento balanceado") as { category?: string }).category, "c_mascotas");
    // categoría inexistente => cae en «otras»
    s = (await op(A, { op: "addItem", name: "Cosa", category: "c_noexiste", quantity: 1, unit: "u" })) as typeof s;
    assert.equal((s.items.find((i) => i.name === "Cosa") as { category?: string }).category, "otras");
    // reordenar: mascotas primero
    const ids = ["c_mascotas", ...s.categories.map((c) => c.id).filter((id) => id !== "c_mascotas")];
    s = (await op(A, { op: "reorderCategories", ids })) as typeof s;
    assert.equal(s.categories[0].id, "c_mascotas");
    // «otras» no se borra
    s = (await op(A, { op: "deleteCategory", id: "otras" })) as typeof s;
    assert.ok(s.categories.some((c) => c.id === "otras"));
    // borrar: sus ítems y productos pasan a «otras»
    s = (await op(A, { op: "deleteCategory", id: "c_mascotas" })) as typeof s;
    assert.ok(!s.categories.some((c) => c.id === "c_mascotas"));
    assert.equal((s.items.find((i) => i.name === "Alimento balanceado") as { category?: string }).category, "otras");
    // aislamiento: la categoría de A no existe en B
    const b = (await get(B)) as typeof s;
    assert.equal(b.categories.length, 9);
    assert.equal((await post(A, { op: "saveCategory", id: "Mal Id", name: "x" })).status, 400);
  });

  await test("quién agregó y quién compró cada producto", async () => {
    type W = { items: Array<{ id: string; name: string; addedBy: string | null; boughtBy: string | null; bought: boolean }> };
    const id = crypto.randomUUID();
    let s = (await op(A, { op: "addItem", id, by: "Ana", name: "Aceitunas", category: "almacen", quantity: 1, unit: "u" })) as unknown as W;
    assert.equal(s.items.find((i) => i.id === id)!.addedBy, "Ana");
    s = (await op(A, { op: "toggleBought", id, bought: true, by: "Luis" })) as unknown as W;
    const it = s.items.find((i) => i.id === id)!;
    assert.deepEqual([it.bought, it.boughtBy, it.addedBy], [true, "Luis", "Ana"]);
    s = (await op(A, { op: "toggleBought", id, bought: false })) as unknown as W;
    assert.equal(s.items.find((i) => i.id === id)!.boughtBy, null);
  });

  await test("presencia en el súper: la ven los demás y vence", async () => {
    type P = Snap & { shopping: { by: string | null; device: string } | null };
    assert.equal(((await get(A)) as P).shopping, null);
    const s = (await op(A, { op: "shopPing", device: "dispositivo-ana-1", name: "Ana" })) as P;
    assert.deepEqual(s.shopping, { by: "Ana", device: "dispositivo-ana-1" });
    assert.equal(((await get(B)) as P).shopping, null, "otro hogar no la ve");
    await op(A, { op: "shopStop", device: "otro-dispositivo" });
    assert.ok(((await get(A)) as P).shopping, "otro dispositivo no puede cortarla");
    assert.equal(((await op(A, { op: "shopStop", device: "dispositivo-ana-1" })) as P).shopping, null);
  });

  console.log(`\n${passed} pruebas OK`);
}

main().catch((e) => {
  console.error("\n✘ FALLÓ:", e);
  process.exit(1);
});
