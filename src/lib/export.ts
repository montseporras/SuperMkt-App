import { formatQty, type Category, type ListItem } from "./domain";
import { groupByCategory } from "./group";

const dateLong = (d: Date) =>
  new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);

export const fileDate = (d = new Date()) => d.toISOString().slice(0, 10);

/** Texto plano (con formato de WhatsApp) de los productos pendientes. */
export function listAsText(items: ListItem[], householdName: string, categories: Category[]): string {
  const groups = groupByCategory(items.filter((i) => !i.bought), categories);
  if (groups.length === 0) return `🛒 *${householdName}*\nNo hay productos pendientes.`;
  const lines = [`🛒 *Compras de casa* · ${householdName}`, ""];
  for (const g of groups) {
    lines.push(`*${g.category.label}*`);
    for (const i of g.items) lines.push(`• ${i.name} — ${formatQty(i.quantity, i.unit)}${i.note ? ` (${i.note})` : ""}`);
    lines.push("");
  }
  return lines.join("\n").trim();
}

/** Genera el PDF en el navegador (jsPDF se carga solo cuando se necesita). */
export async function buildPdf(items: ListItem[], householdName: string, categories: Category[]): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 16;
  const bottom = 282;
  const green: [number, number, number] = [47, 125, 91];
  const pending = items.filter((i) => !i.bought);
  const groups = groupByCategory(pending, categories);

  let y = 0;
  const header = () => {
    doc.setFillColor(...green);
    doc.rect(0, 0, W, 4, "F");
    doc.setTextColor(30, 40, 35);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Compras de casa", M, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(95, 105, 100);
    doc.text(householdName, M, 27);
    doc.text(`Generada el ${dateLong(new Date())}`, M, 32.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...green);
    doc.text(`${pending.length} ${pending.length === 1 ? "producto" : "productos"}`, W - M, 20, { align: "right" });
    y = 42;
  };
  header();

  if (groups.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(95, 105, 100);
    doc.text("No hay productos pendientes.", M, y);
  }

  for (const g of groups) {
    if (y + 8 + 9 > bottom) {
      doc.addPage();
      header();
    }
    doc.setFillColor(232, 243, 237);
    doc.roundedRect(M, y - 5, W - 2 * M, 8, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(35, 85, 62);
    doc.text(g.category.label.toUpperCase(), M + 3, y + 0.4);
    y += 9;

    for (const item of g.items) {
      if (y + 9 > bottom) {
        doc.addPage();
        header();
      }
      doc.setDrawColor(120, 130, 125);
      doc.setLineWidth(0.4);
      doc.roundedRect(M + 3, y - 3.6, 4.6, 4.6, 0.8, 0.8, "S");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(30, 40, 35);
      const name = doc.splitTextToSize(item.name, 85)[0] as string;
      doc.text(name, M + 11, y);
      if (item.note) {
        doc.setFontSize(9.5);
        doc.setTextColor(120, 130, 125);
        doc.text(doc.splitTextToSize(item.note, 60)[0] as string, M + 11 + doc.getTextWidth(name) * (12 / 9.5) + 3, y);
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(30, 40, 35);
      doc.text(formatQty(item.quantity, item.unit), W - M - 3, y, { align: "right" });
      doc.setDrawColor(235, 238, 236);
      doc.setLineWidth(0.2);
      doc.line(M, y + 3, W - M, y + 3);
      y += 8.5;
    }
    y += 4;
  }

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(150, 158, 154);
    doc.text(`Página ${p} de ${pages}`, W / 2, 291, { align: "center" });
  }
  return doc.output("blob");
}
