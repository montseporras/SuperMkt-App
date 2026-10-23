"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Snapshot } from "@/lib/domain";
import type { Mutation } from "@/lib/schemas";
import { ApiError, fetchSnapshot, rememberHousehold, sendMutation } from "@/lib/client-api";

export type Status = "loading" | "ready" | "notfound" | "error";

const POLL_MS = 5000;

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

/**
 * Estado compartido del hogar. El servidor es la fuente de verdad, pero la app es "offline-first":
 * - cada acción se aplica al instante en pantalla (optimista) y entra en una cola guardada en el dispositivo;
 * - la cola se envía en orden; sin conexión queda pendiente y se reintenta sola al volver la señal;
 * - la última lista se guarda en el dispositivo, así abre aunque no haya internet;
 * - cada 5 s (y al volver a la pestaña) se consulta el servidor para ver los cambios de los demás.
 */
export function useHousehold(token: string) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [offline, setOffline] = useState(false);
  const [queued, setQueued] = useState(0);

  const snapKey = `cdc:snap:${token}`;
  const queueKey = `cdc:queue:${token}`;
  const queue = useRef<Mutation[]>([]);
  const flushing = useRef(false);
  const mutationSeq = useRef(0);
  const lastJson = useRef("");

  const apply = useCallback(
    (next: Snapshot) => {
      const json = JSON.stringify(next);
      if (json !== lastJson.current) {
        lastJson.current = json;
        setSnap(next);
        write(snapKey, next);
      }
    },
    [snapKey],
  );

  const persistQueue = useCallback(() => {
    write(queueKey, queue.current);
    setQueued(queue.current.length);
  }, [queueKey]);

  const refresh = useCallback(async () => {
    if (flushing.current || queue.current.length > 0) return; // los cambios locales van primero
    const seqAtStart = mutationSeq.current;
    try {
      const next = await fetchSnapshot(token);
      setOffline(false);
      if (!flushing.current && queue.current.length === 0 && mutationSeq.current === seqAtStart) {
        apply(next);
        setStatus("ready");
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setStatus("notfound");
      else {
        setOffline(true);
        setStatus((s) => (s === "loading" ? "error" : s));
      }
    }
  }, [token, apply]);

  /** Envía la cola en orden. Se detiene ante un error de red o de servidor y reintenta luego. */
  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    let last: Snapshot | null = null;
    try {
      while (queue.current.length > 0) {
        try {
          last = await sendMutation(token, queue.current[0]);
          queue.current.shift();
          persistQueue();
          setOffline(false);
        } catch (e) {
          if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
            // El servidor la rechazó: reintentar no sirve. Se descarta para no trabar la cola.
            queue.current.shift();
            persistQueue();
            toast.error(e.status === 404 ? "El hogar ya no existe" : "Un cambio no se pudo guardar");
            continue;
          }
          setOffline(true);
          return;
        }
      }
    } finally {
      flushing.current = false;
    }
    if (last && queue.current.length === 0) apply(last);
    else if (queue.current.length === 0) void refresh();
  }, [token, apply, persistQueue, refresh]);

  useEffect(() => {
    rememberHousehold(token);
    // Arranque: lista guardada en el dispositivo (abre sin conexión) + cola pendiente de la sesión anterior.
    const cached = read<Snapshot | null>(snapKey, null);
    queue.current = read<Mutation[]>(queueKey, []);
    setQueued(queue.current.length);
    if (cached?.categories) {
      lastJson.current = JSON.stringify(cached);
      setSnap(cached);
      setStatus("ready");
    }
    // Carga inicial desde el servidor (sistema externo): el setState ocurre tras el await.
    void (queue.current.length > 0 ? flush() : refresh());
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void (queue.current.length > 0 ? flush() : refresh());
    };
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    window.addEventListener("online", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
      window.removeEventListener("online", tick);
    };
  }, [token, snapKey, queueKey, refresh, flush]);

  /** Aplica `optimistic` al instante y encola la acción. Siempre devuelve true: se guardó en el dispositivo. */
  const mutate = useCallback(
    async (m: Mutation, optimistic?: (s: Snapshot) => Snapshot): Promise<boolean> => {
      mutationSeq.current++;
      if (optimistic) {
        setSnap((s) => {
          if (!s) return s;
          const next = optimistic(s);
          lastJson.current = JSON.stringify(next);
          write(snapKey, next);
          return next;
        });
      }
      queue.current.push(m);
      persistQueue();
      void flush();
      return true;
    },
    [snapKey, persistQueue, flush],
  );

  return { snap, status, offline, queued, mutate, refresh };
}
