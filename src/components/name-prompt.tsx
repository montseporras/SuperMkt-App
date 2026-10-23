"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { setName, skipName } from "@/lib/device";
import { inputClass } from "./fields";
import { Sheet } from "./sheet";

/** Se muestra una sola vez por dispositivo: el nombre se usa para las iniciales (quién agregó / quién compró). */
export function NamePrompt({ householdName, onDone }: { householdName: string; onDone: () => void }) {
  const [value, setValue] = useState("");
  const save = () => {
    if (value.trim()) setName(value);
    else skipName();
    onDone();
  };
  return (
    <Sheet
      open
      onOpenChange={(o) => {
        if (!o) {
          skipName();
          onDone();
        }
      }}
      title="¿Cómo te llamás?"
      description={`Así los demás de ${householdName} ven quién agregó y quién compró cada cosa.`}
      footer={
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <Button
            variant="outline"
            className="h-12 px-5 text-base"
            onClick={() => {
              skipName();
              onDone();
            }}
          >
            Ahora no
          </Button>
          <Button className="h-12 text-base" disabled={!value.trim()} onClick={save}>
            Guardar
          </Button>
        </div>
      }
    >
      <form
        className="pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) save();
        }}
      >
        <input aria-label="Tu nombre" autoFocus className={`${inputClass} h-12 text-lg`} placeholder="Ej: Ana" maxLength={30} value={value} onChange={(e) => setValue(e.target.value)} />
        <p className="mt-2 text-xs text-muted-foreground">Queda guardado en este celular. Lo podés cambiar cuando quieras en «Compartir».</p>
      </form>
    </Sheet>
  );
}
