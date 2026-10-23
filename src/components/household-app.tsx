"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpenIcon, FileDownIcon, HistoryIcon, ListChecksIcon, PlusIcon, ShoppingCartIcon, Share2Icon, WifiOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActions } from "@/hooks/use-actions";
import { useHousehold } from "@/hooks/use-household";
import { forgetHousehold, rememberHousehold } from "@/lib/client-api";
import { getDeviceId, needsName } from "@/lib/device";
import { cn } from "@/lib/utils";
import { CategoriesProvider } from "./categories-context";
import { AddSheet } from "./add-sheet";
import { CatalogView } from "./catalog-view";
import { ExportSheet } from "./export-sheet";
import { HistoryView } from "./history-view";
import { ListView } from "./list-view";
import { NamePrompt } from "./name-prompt";
import { PrintList } from "./print-list";
import { ShareSheet } from "./share-sheet";
import { ShopMode } from "./shop-mode";

type Tab = "list" | "catalog" | "history";

const TABS: Array<{ id: Tab; label: string; icon: typeof ListChecksIcon }> = [
  { id: "list", label: "Lista", icon: ListChecksIcon },
  { id: "catalog", label: "Catálogo", icon: BookOpenIcon },
  { id: "history", label: "Historial", icon: HistoryIcon },
];

export function HouseholdApp({ token }: { token: string }) {
  const { snap, status, offline, queued, refresh, mutate } = useHousehold(token);
  const actions = useActions(mutate);
  const [tab, setTab] = useState<Tab>("list");
  const [add, setAdd] = useState<{ open: boolean; query: string }>({ open: false, query: "" });
  const [shop, setShop] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [askName, setAskName] = useState(false);

  const householdName = snap?.household.name;
  useEffect(() => {
    if (householdName) rememberHousehold(token, householdName);
  }, [token, householdName]);

  // La primera vez que se entra desde este celular se pregunta el nombre (para las iniciales).
  const ready = !!snap;
  useEffect(() => {
    // localStorage solo existe en el navegador.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ready && needsName()) setAskName(true);
  }, [ready]);

  const pendingCount = useMemo(() => snap?.items.filter((i) => !i.bought).length ?? 0, [snap]);
  const boughtCount = (snap?.items.length ?? 0) - pendingCount;

  if (status === "notfound") {
    return (
      <Centered title="Este enlace no es válido" text="Puede que esté incompleto o que el hogar ya no exista. Pedí el enlace de nuevo o creá un hogar nuevo.">
        <Button render={<Link href="/?nuevo=1" onClick={forgetHousehold} />} className="h-12 px-6 text-base">
          Ir al inicio
        </Button>
      </Centered>
    );
  }
  if (status === "error") {
    return (
      <Centered title="No pudimos conectar" text="Revisá tu conexión e intentá de nuevo.">
        <Button className="h-12 px-6 text-base" onClick={() => void refresh()}>
          Reintentar
        </Button>
      </Centered>
    );
  }
  if (!snap) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pt-8" aria-busy="true" aria-label="Cargando">
        <div className="h-9 w-56 animate-pulse rounded-xl bg-muted" />
        <div className="h-24 animate-pulse rounded-3xl bg-muted" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  const openAdd = (query = "") => setAdd({ open: true, query });

  return (
    <CategoriesProvider value={snap.categories}>
      <div className="print:hidden">
        {offline && (
          <div role="status" className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-sm text-amber-900">
            <WifiOffIcon className="size-4" /> Sin conexión{queued > 0 ? ` · ${queued} ${queued === 1 ? "cambio guardado" : "cambios guardados"} en este celular, se enviarán solos` : ". Reintentando…"}
          </div>
        )}

        {snap.shopping && snap.shopping.device !== getDeviceId() && !shop && (
          <div role="status" className="flex items-center justify-center gap-2 bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            <ShoppingCartIcon className="size-4" /> {snap.shopping.by || "Alguien"} está en el súper ahora. Lo que marque se tilda acá.
          </div>
        )}

        <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-32 md:pb-12">
          <header className="mb-5 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Compras de casa</h1>
              <p className="truncate text-sm text-muted-foreground">{snap.household.name}</p>
            </div>
            <Button variant="outline" className="h-11 shrink-0 px-4" onClick={() => setSharing(true)} aria-label="Compartir el hogar">
              <Share2Icon /> <span className="hidden sm:inline">Compartir</span>
            </Button>
          </header>

          {/* Pestañas: barra inferior en móvil, píldoras arriba en pantallas grandes */}
          <nav
            aria-label="Secciones"
            className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:static md:mb-5 md:inline-grid md:w-auto md:grid-cols-3 md:gap-1 md:rounded-full md:border md:bg-card md:p-1 md:pb-1"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium transition md:h-10 md:flex-row md:gap-2 md:rounded-full md:px-5 md:text-sm",
                  tab === t.id ? "text-primary md:bg-primary md:text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <t.icon className="size-6 md:size-4" />
                {t.label}
              </button>
            ))}
          </nav>

          {tab === "list" && (
            <div className="space-y-5">
              <section className="rounded-3xl bg-primary p-5 text-primary-foreground shadow-sm" aria-label="Resumen">
                <div className="flex items-end justify-between gap-4">
                  <div aria-live="polite">
                    <p className="text-5xl leading-none font-bold tabular-nums">{pendingCount}</p>
                    <p className="mt-1 text-sm opacity-90">{pendingCount === 1 ? "producto pendiente" : "productos pendientes"}</p>
                  </div>
                  <Button
                    onClick={() => openAdd()}
                    className="h-14 rounded-2xl bg-white px-5 text-base font-semibold text-primary hover:bg-white/90"
                  >
                    <PlusIcon className="size-5" /> Agregar producto
                  </Button>
                </div>
                {boughtCount > 0 && (
                  <p className="mt-3 text-xs opacity-80">
                    {boughtCount} ya {boughtCount === 1 ? "comprado" : "comprados"}
                  </p>
                )}
              </section>

              <div className="grid grid-cols-3 gap-2">
                <Shortcut icon={BookOpenIcon} label="Catálogo" onClick={() => setTab("catalog")} />
                <Shortcut icon={ShoppingCartIcon} label="Modo súper" onClick={() => setShop(true)} />
                <Shortcut icon={FileDownIcon} label="Exportar" onClick={() => setExporting(true)} />
              </div>

              <ListView items={snap.items} history={snap.history} products={snap.products} actions={actions} onAdd={openAdd} />
            </div>
          )}
          {tab === "catalog" && <CatalogView products={snap.products} actions={actions} />}
          {tab === "history" && <HistoryView history={snap.history} actions={actions} />}
        </div>

        {askName && <NamePrompt householdName={snap.household.name} onDone={() => setAskName(false)} />}
        <AddSheet open={add.open} initialQuery={add.query} onClose={() => setAdd({ open: false, query: "" })} products={snap.products} items={snap.items} actions={actions} />
        <ExportSheet open={exporting} onClose={() => setExporting(false)} items={snap.items} householdName={snap.household.name} categories={snap.categories} />
        <ShareSheet key={snap.household.name} open={sharing} onClose={() => setSharing(false)} token={token} householdName={snap.household.name} actions={actions} />
        {shop && <ShopMode token={token} items={snap.items} others={snap.shopping && snap.shopping.device !== getDeviceId() ? snap.shopping.by || "Alguien" : null} actions={actions} onClose={() => setShop(false)} />}
      </div>
      <PrintList items={snap.items} householdName={snap.household.name} categories={snap.categories} />
    </CategoriesProvider>
  );
}

function Shortcut({ icon: Icon, label, onClick }: { icon: typeof BookOpenIcon; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border bg-card text-sm font-medium shadow-xs transition active:scale-95 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Icon className="size-6 text-primary" />
      {label}
    </button>
  );
}

function Centered({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted-foreground">{text}</p>
      {children}
    </main>
  );
}
