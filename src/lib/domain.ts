export interface Category {
  id: string;
  label: string;
  emoji: string | null;
}

export type CategoryId = string;

/** Categorías con las que arranca cada hogar nuevo (después cada hogar las edita a gusto). */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: "lacteos", label: "Lácteos", emoji: "🥛" },
  { id: "carnes", label: "Carnes", emoji: "🥩" },
  { id: "verduras", label: "Verduras", emoji: "🥬" },
  { id: "frutas", label: "Frutas", emoji: "🍎" },
  { id: "almacen", label: "Almacén", emoji: "🍝" },
  { id: "bebidas", label: "Bebidas", emoji: "🥤" },
  { id: "limpieza", label: "Limpieza", emoji: "🧽" },
  { id: "higiene", label: "Higiene", emoji: "🧴" },
  { id: "otras", label: "Otras", emoji: "🛒" },
];

/** La categoría "otras" no se puede borrar: recibe los productos de las categorías eliminadas. */
export const FALLBACK_CATEGORY = "otras";

const UNKNOWN: Category = { id: FALLBACK_CATEGORY, label: "Otras", emoji: "🛒" };
export const categoryOf = (categories: Category[], id: string): Category => categories.find((c) => c.id === id) ?? categories.find((c) => c.id === FALLBACK_CATEGORY) ?? UNKNOWN;

export const UNITS = [
  { id: "u", label: "unidades", short: "u." },
  { id: "kg", label: "kg", short: "kg" },
  { id: "g", label: "gramos", short: "g" },
  { id: "l", label: "litros", short: "l" },
  { id: "ml", label: "ml", short: "ml" },
  { id: "paq", label: "paquetes", short: "paq." },
  { id: "caja", label: "cajas", short: "cajas" },
  { id: "bot", label: "botellas", short: "bot." },
  { id: "lata", label: "latas", short: "latas" },
  { id: "doc", label: "docenas", short: "doc." },
] as const;

export type UnitId = (typeof UNITS)[number]["id"];
export const UNIT_IDS = UNITS.map((u) => u.id) as [UnitId, ...UnitId[]];

export const unitOf = (id: string) => UNITS.find((u) => u.id === id) ?? UNITS[0];

/** Formatea cantidad + unidad: "2 kg", "1,5 l". */
export function formatQty(quantity: number, unit: string) {
  const n = Number.isInteger(quantity) ? String(quantity) : quantity.toLocaleString("es-AR", { maximumFractionDigits: 2 });
  return `${n} ${unitOf(unit).short}`;
}

/** Paso de los botones +/−: enteros para unidades, 0,5 para kg/l, 100 para g/ml. */
export function stepFor(unit: string) {
  if (unit === "g" || unit === "ml") return 100;
  if (unit === "kg" || unit === "l") return 0.5;
  return 1;
}

export interface Product {
  id: string;
  name: string;
  category: CategoryId;
  unit: UnitId;
  favorite: boolean;
  useCount: number;
  emoji: string | null;
}

export interface ListItem {
  id: string;
  productId: string | null;
  emoji: string | null;
  name: string;
  category: CategoryId;
  quantity: number;
  unit: UnitId;
  note: string | null;
  bought: boolean;
  addedBy: string | null;
  boughtBy: string | null;
  clearedAt: string | null;
  createdAt: string;
}

export interface Snapshot {
  household: { name: string };
  categories: Category[];
  /** Alguien está comprando ahora (visto por los demás). */
  shopping: { by: string | null; device: string } | null;
  products: Product[];
  items: ListItem[];
  history: ListItem[];
}

export const SEED_PRODUCTS: Array<Pick<Product, "name" | "category" | "unit"> & { favorite?: boolean }> = [
  { name: "Leche", category: "lacteos", unit: "l", favorite: true },
  { name: "Huevos", category: "lacteos", unit: "doc" },
  { name: "Queso", category: "lacteos", unit: "g" },
  { name: "Yogur", category: "lacteos", unit: "u" },
  { name: "Manteca", category: "lacteos", unit: "u" },
  { name: "Carne picada", category: "carnes", unit: "kg" },
  { name: "Pollo", category: "carnes", unit: "kg" },
  { name: "Jamón", category: "carnes", unit: "g" },
  { name: "Tomate", category: "verduras", unit: "kg" },
  { name: "Cebolla", category: "verduras", unit: "kg" },
  { name: "Papa", category: "verduras", unit: "kg" },
  { name: "Lechuga", category: "verduras", unit: "u" },
  { name: "Zanahoria", category: "verduras", unit: "kg" },
  { name: "Banana", category: "frutas", unit: "kg" },
  { name: "Manzana", category: "frutas", unit: "kg" },
  { name: "Limón", category: "frutas", unit: "u" },
  { name: "Pan", category: "almacen", unit: "u", favorite: true },
  { name: "Arroz", category: "almacen", unit: "paq" },
  { name: "Fideos", category: "almacen", unit: "paq" },
  { name: "Aceite", category: "almacen", unit: "bot" },
  { name: "Azúcar", category: "almacen", unit: "paq" },
  { name: "Café", category: "almacen", unit: "paq" },
  { name: "Agua", category: "bebidas", unit: "bot" },
  { name: "Gaseosa", category: "bebidas", unit: "bot" },
  { name: "Detergente", category: "limpieza", unit: "u" },
  { name: "Lavandina", category: "limpieza", unit: "bot" },
  { name: "Papel higiénico", category: "higiene", unit: "paq" },
  { name: "Shampoo", category: "higiene", unit: "u" },
  { name: "Jabón", category: "higiene", unit: "u" },
];
