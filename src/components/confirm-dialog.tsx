"use client";

import { Button } from "@/components/ui/button";
import { Sheet } from "./sheet";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, destructive, onConfirm }: Props) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-12 text-base" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            className="h-12 text-base"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="h-1" />
    </Sheet>
  );
}
