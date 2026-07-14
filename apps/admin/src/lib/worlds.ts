"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "grinta.admin.knownWorlds";

export interface KnownWorld {
  readonly id: string;
  readonly seed: string;
}

function read(): KnownWorld[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as KnownWorld[]) : [];
  } catch {
    return [];
  }
}

/**
 * Mundos conhecidos pelo console (criados/abertos), persistidos localmente.
 * A API expõe queries por-id; um endpoint de listagem no servidor é follow-up.
 */
export function useKnownWorlds() {
  const [worlds, setWorlds] = useState<KnownWorld[]>([]);

  useEffect(() => {
    setWorlds(read());
  }, []);

  const remember = useCallback((world: KnownWorld) => {
    setWorlds((current) => {
      if (current.some((entry) => entry.id === world.id)) return current;
      const next = [world, ...current];
      window.localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const forget = useCallback((id: string) => {
    setWorlds((current) => {
      const next = current.filter((entry) => entry.id !== id);
      window.localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { worlds, remember, forget };
}
