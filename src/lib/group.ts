import { categoryOf, type Category, type ListItem } from "./domain";

export interface Group {
  category: Category;
  items: ListItem[];
}

/** Agrupa por categoría en el orden elegido por el hogar; omite las vacías. */
export function groupByCategory(items: ListItem[], categories: Category[]): Group[] {
  const byId = new Map<string, ListItem[]>();
  for (const i of items) {
    const key = categories.some((c) => c.id === i.category) ? i.category : categoryOf(categories, i.category).id;
    byId.set(key, [...(byId.get(key) ?? []), i]);
  }
  return categories
    .filter((c) => byId.has(c.id))
    .map((category) => ({ category, items: byId.get(category.id)!.sort((a, b) => a.name.localeCompare(b.name, "es")) }));
}
