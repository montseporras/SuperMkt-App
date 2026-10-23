import { formatQty, type Category, type ListItem } from "@/lib/domain";
import { groupByCategory } from "@/lib/group";

/** Solo visible al imprimir (Ctrl+P / botón Imprimir). */
export function PrintList({ items, householdName, categories }: { items: ListItem[]; householdName: string; categories: Category[] }) {
  const groups = groupByCategory(items.filter((i) => !i.bought), categories);
  return (
    <div className="hidden bg-white p-8 text-black print:block">
      <h1 className="text-3xl font-bold">Compras de casa</h1>
      <p className="mb-1 text-gray-600">{householdName}</p>
      <p className="mb-6 text-sm text-gray-500">
        Generada el {new Intl.DateTimeFormat("es-AR", { dateStyle: "long", timeStyle: "short" }).format(new Date())}
      </p>
      {groups.length === 0 && <p>No hay productos pendientes.</p>}
      {groups.map((g) => (
        <section key={g.category.id} className="mb-5 break-inside-avoid">
          <h2 className="mb-1 rounded bg-emerald-50 px-3 py-1 text-sm font-bold tracking-wide text-emerald-900 uppercase">{g.category.label}</h2>
          <ul>
            {g.items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 border-b border-gray-200 py-1.5">
                <span className="size-4 shrink-0 rounded-sm border-2 border-gray-500" />
                <span className="flex-1">
                  {i.name}
                  {i.note && <span className="ml-2 text-sm text-gray-500">{i.note}</span>}
                </span>
                <b>{formatQty(i.quantity, i.unit)}</b>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
