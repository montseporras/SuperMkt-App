"use client";

import { useState } from "react";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ListItem, UnitId } from "@/lib/domain";
import { useCategories } from "./categories-context";
import { Label, QtyStepper, UnitSelect, inputClass } from "./fields";
import { Sheet } from "./sheet";

interface Props {
  item: ListItem | null;
  onClose: () => void;
  onSave: (item: ListItem, patch: { quantity: number; unit: UnitId; note: string | null }) => void;
  onRemove: (item: ListItem) => void;
}

export function EditItemSheet({ item, onClose, onSave, onRemove }: Props) {
  const { find } = useCategories();
  return (
    <Sheet open={!!item} onOpenChange={(o) => !o && onClose()} title={item?.name ?? ""} description={item ? find(item.category).label : undefined}>
      {item && <EditForm key={item.id} item={item} onClose={onClose} onSave={onSave} onRemove={onRemove} />}
    </Sheet>
  );
}

function EditForm({ item, onClose, onSave, onRemove }: Omit<Props, "item"> & { item: ListItem }) {
  const [quantity, setQuantity] = useState(item.quantity);
  const [unit, setUnit] = useState<UnitId>(item.unit);
  const [note, setNote] = useState(item.note ?? "");

  return (
    <form
      className="space-y-5 pt-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(item, { quantity, unit, note: note.trim() || null });
        onClose();
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <QtyStepper value={quantity} unit={unit} onChange={setQuantity} size="lg" />
        <UnitSelect value={unit} onChange={setUnit} className="min-w-0 flex-1" />
      </div>
      <div>
        <Label htmlFor="edit-note">Nota (opcional)</Label>
        <input
          id="edit-note"
          className={inputClass}
          value={note}
          maxLength={140}
          placeholder="Ej: descremada, marca X"
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <Button
          type="button"
          variant="destructive"
          className="h-12 px-4"
          aria-label={`Eliminar ${item.name}`}
          onClick={() => {
            onRemove(item);
            onClose();
          }}
        >
          <Trash2Icon className="size-5" />
        </Button>
        <Button type="submit" className="h-12 text-base">
          Guardar
        </Button>
      </div>
    </form>
  );
}
