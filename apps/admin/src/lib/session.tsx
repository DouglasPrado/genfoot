"use client";

import { createClient, type GrintaClient, type Role } from "@grinta/api-client";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const STORAGE_KEY = "grinta.admin.session";

export interface AdminSession {
  readonly token: string;
  readonly subject: string;
  readonly role: Role;
}

interface SessionContextValue {
  readonly session: AdminSession | null;
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
  const [session, setSession] = useState<AdminSession | null>(loadStored);

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
    () => ({ session, api, login, logout }),
    [session, api, login, logout],
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
