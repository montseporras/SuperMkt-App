"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon, NfcIcon, Share2Icon, ShieldAlertIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Actions } from "@/hooks/use-actions";
import { forgetHousehold } from "@/lib/client-api";
import { getName, setName as saveName } from "@/lib/device";
import { Label, inputClass } from "./fields";
import { Sheet } from "./sheet";

interface Props {
  open: boolean;
  onClose: () => void;
  token: string;
  householdName: string;
  actions: Actions;
}

export function ShareSheet({ open, onClose, token, householdName, actions }: Props) {
  const [qr, setQr] = useState("");
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(householdName);

  const url = typeof window === "undefined" ? "" : `${window.location.origin}/h/${token}`;

  useEffect(() => {
    const u = `${window.location.origin}/h/${token}`;
    QRCode.toDataURL(u, { margin: 1, width: 360, color: { dark: "#1f2d26", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [token]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Enlace copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar. Mantené presionado el enlace para copiarlo.");
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: "Compras de casa", text: `Sumate a la lista de compras de ${householdName}`, url });
    } catch {
      /* cancelado */
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()} title="Compartir el hogar" description="Quien tenga este enlace puede ver y editar la lista.">
      <div className="space-y-5 pt-2">
        <div className="flex justify-center">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="Código QR para entrar al hogar" width={180} height={180} className="size-44 rounded-2xl border bg-white p-2" />
          ) : (
            <div className="size-44 animate-pulse rounded-2xl bg-muted" />
          )}
        </div>

        <div>
          <Label htmlFor="share-url">Enlace del hogar</Label>
          <div className="flex gap-2">
            <input id="share-url" readOnly value={url} className={`${inputClass} min-w-0 flex-1 font-mono text-sm`} onFocus={(e) => e.currentTarget.select()} />
            <Button variant="outline" className="h-11 w-11 shrink-0 px-0" onClick={copy} aria-label="Copiar enlace">
              {copied ? <CheckIcon /> : <CopyIcon />}
            </Button>
          </div>
        </div>

        {typeof navigator !== "undefined" && "share" in navigator && (
          <Button className="h-12 w-full text-base" onClick={share}>
            <Share2Icon /> Enviar enlace
          </Button>
        )}

        <div className="flex gap-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
          <ShieldAlertIcon className="mt-0.5 size-5 shrink-0" />
          <p>Compartilo solo con quienes viven en tu casa. Si el enlace se filtra, creá un hogar nuevo y pasales el nuevo enlace.</p>
        </div>

        <details className="rounded-2xl border bg-card px-4 py-3 text-sm">
          <summary className="flex cursor-pointer items-center gap-2 text-base font-medium">
            <NfcIcon className="size-5 text-primary" /> Usar con una etiqueta NFC
          </summary>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-muted-foreground">
            <li>Copiá el enlace de arriba.</li>
            <li>
              Con una app como <b>NFC Tools</b> (Android o iPhone) elegí <i>Escribir → Agregar registro → URL</i> y pegalo.
            </li>
            <li>Acercá la etiqueta al celular para grabarla y pegala en la heladera.</li>
          </ol>
        </details>

        <div>
          <Label htmlFor="my-name">Tu nombre en este celular (opcional)</Label>
          <input
            id="my-name"
            className={inputClass}
            defaultValue={getName()}
            maxLength={30}
            placeholder="Ej: Ana"
            onChange={(e) => saveName(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">Se usa para avisar «Ana está en el súper» a los demás.</p>
        </div>

        <div>
          <Label htmlFor="hh-name">Nombre del hogar</Label>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim() && name.trim() !== householdName) void actions.rename(name.trim());
            }}
          >
            <input id="hh-name" className={`${inputClass} min-w-0 flex-1`} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
            <Button type="submit" variant="outline" className="h-11" disabled={!name.trim() || name.trim() === householdName}>
              Guardar
            </Button>
          </form>
        </div>
      <button
          type="button"
          className="w-full py-2 text-sm text-muted-foreground underline underline-offset-4"
          onClick={() => {
            forgetHousehold();
            router.push("/?nuevo=1");
          }}
        >
          Usar otro hogar en este dispositivo
        </button>
      </div>
    </Sheet>
  );
}
