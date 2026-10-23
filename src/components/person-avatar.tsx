import { cn } from "@/lib/utils";

const HUES = [25, 70, 150, 190, 230, 280, 320, 350];

function hueOf(name: string) {
  let h = 0;
  for (const c of name.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
}

/** Inicial de la persona en un círculo; el color sale del nombre, así siempre es el mismo para la misma persona. */
export function PersonAvatar({ name, label, className }: { name: string; label: string; className?: string }) {
  const hue = hueOf(name);
  return (
    <span
      role="img"
      aria-label={`${label} ${name}`}
      title={`${label} ${name}`}
      className={cn("inline-grid size-5 shrink-0 place-items-center rounded-full text-[0.65rem] leading-none font-bold", className)}
      style={{ background: `oklch(0.9 0.07 ${hue})`, color: `oklch(0.38 0.1 ${hue})` }}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
