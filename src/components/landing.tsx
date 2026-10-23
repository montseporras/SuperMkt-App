"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRightIcon, HomeIcon, LinkIcon, Loader2Icon, NfcIcon, ShoppingBasketIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError, createHousehold, extractToken, listHouseholds, recallHousehold, type SavedHousehold } from "@/lib/client-api";
import { inputClass, Label } from "./fields";

export function Landing() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [saved, setSaved] = useState<SavedHousehold[]>([]);
  const [name, setName] = useState("Mi casa");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // El servidor ya redirige con la cookie. Esto cubre el caso en que solo quedó el dato local
  // (por ejemplo, si el navegador borró la cookie).
  useEffect(() => {
    const last = recallHousehold();
    const wantsNew = new URLSearchParams(window.location.search).has("nuevo");
    if (last && !wantsNew) router.replace(`/h/${last}`);
    else {
      // localStorage solo existe en el navegador, por eso se lee acá y no durante el render.
      /* eslint-disable react-hooks/set-state-in-effect */
      setSaved(listHouseholds());
      setChecking(false);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [router]);

  if (checking) {
    return (
      <main className="grid min-h-dvh place-items-center" aria-busy="true">
        <Loader2Icon className="size-8 animate-spin text-primary" aria-label="Abriendo tu hogar" />
      </main>
    );
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const token = await createHousehold(name.trim() || "Mi casa");
      router.push(`/h/${token}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear el hogar. Intentá de nuevo.");
      setBusy(false);
    }
  };

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const token = extractToken(code);
    if (!token) return setError("Ese enlace o código no parece válido.");
    router.push(`/h/${token}`);
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-5 py-10">
      <header className="text-center">
        <span className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-primary text-primary-foreground shadow-sm">
          <ShoppingBasketIcon className="size-8" />
        </span>
        <h1 className="text-3xl font-bold tracking-tight">Compras de casa</h1>
        <p className="mt-2 text-muted-foreground">La lista de compras compartida de tu hogar. Sin registros: un enlace, o un toque con el celular.</p>
      </header>

      {saved.length > 0 && (
        <section className="space-y-2" aria-label="Tus hogares">
          <h2 className="px-1 text-sm font-semibold text-muted-foreground">Tus hogares en este celular</h2>
          <ul className="space-y-2">
            {saved.map((h) => (
              <li key={h.token}>
                <button
                  type="button"
                  onClick={() => router.push(`/h/${h.token}`)}
                  className="flex w-full items-center gap-3 rounded-2xl border bg-card px-4 py-3.5 text-left shadow-xs transition hover:bg-muted"
                >
                  <span className="grid size-10 place-items-center rounded-full bg-accent text-primary">
                    <HomeIcon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-base font-medium">{h.name}</span>
                  <ChevronRightIcon className="size-5 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form onSubmit={create} className="space-y-3 rounded-3xl border bg-card p-5 shadow-xs">
        <h2 className="text-lg font-semibold">Crear un hogar nuevo</h2>
        <div>
          <Label htmlFor="hh">Nombre</Label>
          <input id="hh" className={inputClass} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button type="submit" className="h-12 w-full text-base" disabled={busy}>
          {busy && <Loader2Icon className="animate-spin" />} Crear hogar
        </Button>
      </form>

      <form onSubmit={join} className="space-y-3 rounded-3xl border bg-card p-5 shadow-xs">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <LinkIcon className="size-5 text-primary" /> Ya tengo un enlace
        </h2>
        <input aria-label="Enlace o código del hogar" className={inputClass} placeholder="Pegá el enlace o el código" value={code} onChange={(e) => setCode(e.target.value)} />
        <Button type="submit" variant="outline" className="h-12 w-full text-base" disabled={!code.trim()}>
          Entrar
        </Button>
      </form>

      {error && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <NfcIcon className="mt-0.5 size-4 shrink-0" />
        Al crear el hogar vas a poder copiar su enlace y grabarlo en una etiqueta NFC para pegarla en la heladera.
      </p>
    </main>
  );
}
