import type { ListItem } from "./domain";

export interface Suggestion {
  name: string;
  productId: string | null;
  category: ListItem["category"];
  quantity: number;
  unit: ListItem["unit"];
  emoji: string | null;
  everDays: number; // cada cuántos días suele comprarlo
  sinceDays: number; // hace cuántos días lo compró por última vez
}

const DAY = 86_400_000;

/**
 * Sugiere productos que "ya deberían estar por acabarse": compras pasadas (historial) con un ritmo
 * regular, cuyo último pedido fue hace más del 85 % del intervalo habitual y que no están en la lista.
 * Sin IA: promedio simple de los días entre compras (necesita 2 o más compras en días distintos).
 */
export function suggest(history: ListItem[], current: ListItem[], now = Date.now()): Suggestion[] {
  const inList = new Set(current.filter((i) => !i.bought).map((i) => i.name.toLowerCase()));
  const byName = new Map<string, ListItem[]>();
  for (const i of history) {
    if (!i.clearedAt) continue;
    const k = i.name.toLowerCase();
    byName.set(k, [...(byName.get(k) ?? []), i]);
  }
  const out: Suggestion[] = [];
  for (const [key, rows] of byName) {
    if (inList.has(key)) continue;
    const days = [...new Set(rows.map((r) => Math.floor(new Date(r.clearedAt!).getTime() / DAY)))].sort((a, b) => a - b);
    if (days.length < 2) continue;
    const gaps = days.slice(1).map((d, i) => d - days[i]);
    const every = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const since = (now - days[days.length - 1] * DAY) / DAY;
    if (every < 2 || since < every * 0.85) continue;
    const last = [...rows].sort((a, b) => b.clearedAt!.localeCompare(a.clearedAt!))[0];
    out.push({
      name: last.name,
      productId: last.productId,
      category: last.category,
      quantity: last.quantity,
      unit: last.unit,
      emoji: last.emoji,
      everDays: Math.round(every),
      sinceDays: Math.floor(since),
    });
  }
  // Los más "atrasados" primero.
  return out.sort((a, b) => b.sinceDays / b.everDays - a.sinceDays / a.everDays).slice(0, 6);
}
