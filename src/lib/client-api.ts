import type { Snapshot } from "./domain";
import type { Mutation } from "./schemas";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function parse(res: Response): Promise<Snapshot> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data?.error ?? "Error de conexión", res.status);
  return data as Snapshot;
}

export async function fetchSnapshot(token: string): Promise<Snapshot> {
  return parse(await fetch(`/api/h/${token}`, { cache: "no-store" }));
}

export async function sendMutation(token: string, m: Mutation): Promise<Snapshot> {
  return parse(
    await fetch(`/api/h/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(m),
    }),
  );
}

export async function createHousehold(name: string): Promise<string> {
  const res = await fetch("/api/households", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data?.error ?? "No se pudo crear el hogar", res.status);
  return data.token as string;
}

const LAST_KEY = "cdc:last-household";
const LIST_KEY = "cdc:households";
const COOKIE = "cdc_last";

export interface SavedHousehold {
  token: string;
  name: string;
}

const readList = (): SavedHousehold[] => {
  try {
    const v = JSON.parse(localStorage.getItem(LIST_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((h) => h && typeof h.token === "string") : [];
  } catch {
    return [];
  }
};

/**
 * Recuerda el hogar en este dispositivo: lista local (con nombre) + cookie de 1 año.
 * La cookie permite que el servidor redirija directo a la lista, sin pasar por la pantalla de inicio.
 */
export const rememberHousehold = (token: string, name?: string) => {
  try {
    localStorage.setItem(LAST_KEY, token);
    const list = readList();
    const prev = list.find((h) => h.token === token);
    const next = [{ token, name: name ?? prev?.name ?? "Mi casa" }, ...list.filter((h) => h.token !== token)].slice(0, 10);
    localStorage.setItem(LIST_KEY, JSON.stringify(next));
  } catch {}
  document.cookie = `${COOKIE}=${token}; Max-Age=31536000; Path=/; SameSite=Lax`;
};
export const listHouseholds = (): SavedHousehold[] => readList();
export const recallHousehold = (): string | null => {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
};
/** Deja de abrir este hogar automáticamente (sigue en la lista de hogares guardados). */
export const forgetHousehold = () => {
  try {
    localStorage.removeItem(LAST_KEY);
  } catch {}
  document.cookie = `${COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
};
export const removeSavedHousehold = (token: string) => {
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(readList().filter((h) => h.token !== token)));
  } catch {}
};

/** Acepta un enlace completo (…/h/<token>) o el código pelado. */
export function extractToken(input: string): string | null {
  const m = input.trim().match(/([A-Za-z0-9_-]{20,64})\/?(?:[?#].*)?$/);
  return m ? m[1] : null;
}
