import { emojiForProduct } from "@/lib/product-icon";
import { cn } from "@/lib/utils";

/** Emoji propio del producto; si no se reconoce, la inicial en un círculo (nunca un emoji equivocado). */
export function ProductIcon({ name, emoji: custom, className }: { name: string; emoji?: string | null; className?: string }) {
  const emoji = custom || emojiForProduct(name);
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full text-lg leading-none",
        emoji ? "" : "bg-secondary text-sm font-semibold text-secondary-foreground",
        className,
      )}
    >
      {emoji ?? name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
