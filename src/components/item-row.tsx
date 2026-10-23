"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { formatQty, unitOf, type ListItem } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { QtyStepper } from "./fields";
import { PersonAvatar } from "./person-avatar";

interface Props {
  item: ListItem;
  onToggle: () => void;
  onQuantity: (q: number) => void;
  onEdit: () => void;
}

export function ItemRow({ item, onToggle, onQuantity, onEdit }: Props) {
  const sub = [unitOf(item.unit).label, item.note].filter(Boolean).join(" · ");
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <Checkbox
        checked={item.bought}
        onCheckedChange={onToggle}
        aria-label={item.bought ? `Desmarcar ${item.name}` : `Marcar ${item.name} como comprado`}
        className="size-6 rounded-lg after:-inset-3"
      />
      <button
        type="button"
        onClick={onEdit}
        className="min-w-0 flex-1 rounded-lg py-0.5 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label={`Editar ${item.name}`}
      >
        <span className={cn("block truncate text-base font-medium", item.bought && "text-muted-foreground line-through")}>{item.name}</span>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="truncate">{sub}</span>
          {item.addedBy && <PersonAvatar name={item.addedBy} label="Agregó" />}
          {item.bought && item.boughtBy && (
            <>
              <span aria-hidden>✓</span>
              <PersonAvatar name={item.boughtBy} label="Compró" />
            </>
          )}
        </span>
      </button>
      {item.bought ? (
        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{formatQty(item.quantity, item.unit)}</span>
      ) : (
        <QtyStepper value={item.quantity} unit={item.unit} onChange={onQuantity} />
      )}
    </li>
  );
}
