"use client";

import { createClient, type GrintaClient, type Role } from "@grinta/api-client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// Vazio = same-origin: as chamadas vão para /api/v1/* na própria origem e o
// Next.js as reescreve para a API (sem CORS). Override direto via env se preciso.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const STORAGE_KEY = "grinta.admin.session";

export interface AdminSession {
  readonly token: string;
  readonly subject: string;
  readonly role: Role;
}

interface SessionContextValue {
  readonly session: AdminSession | null;
  /** false até o localStorage ser lido no cliente (evita mismatch de hidratação). */
  readonly hydrated: boolean;
  readonly api: GrintaClient;
  login(input: {
    subject: string;
    role: Role;
    adminKey?: string;
  }): Promise<void>;
  logout(): void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function loadStored(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AdminSession) : null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  // Inicia null no servidor E no primeiro render do cliente; o localStorage é
  // lido só após o mount, evitando o mismatch de hidratação.
  const [session, setSession] = useState<AdminSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSession(loadStored());
    setHydrated(true);
  }, []);

  const api = useMemo(
    () =>
      createClient({
        baseUrl: BASE_URL,
        ...(session ? { token: session.token } : {}),
      }),
    [session],
  );

  const login = useCallback<SessionContextValue["login"]>(async (input) => {
    const anon = createClient({ baseUrl: BASE_URL });
    const issued = await anon.session(input);
    const next: AdminSession = {
      token: issued.token,
      subject: issued.subject,
      role: issued.role,
    };
    setSession(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({ session, hydrated, api, login, logout }),
    [session, hydrated, api, login, logout],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (ctx === null) {
    throw new Error("useSession precisa do SessionProvider.");
  }
  return ctx;
}
