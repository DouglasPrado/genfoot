"use client";

import {
  createClient,
  GrintaApiError,
  QueryCache,
  type GrintaClient,
  type Role,
} from "@grinta/api-client";
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
  /** Cache de query segregado por escopo (FR-009), limpo no logout. */
  readonly cache: QueryCache;
  login(input: {
    subject: string;
    role: Role;
    adminKey?: string;
  }): Promise<void>;
  logout(): void;
  /** Reautenticação (step-up): reemite um token admin com a chave e devolve um
   *  client efêmero para uma única ação sensível, sem trocar a sessão. */
  stepUp(adminKey: string): Promise<GrintaClient>;
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
  const [cache] = useState(() => new QueryCache());

  useEffect(() => {
    setSession(loadStored());
    setHydrated(true);
  }, []);

  const api = useMemo(
    () =>
      createClient({
        baseUrl: BASE_URL,
        ...(session ? { token: session.token } : {}),
        // Telemetria segura (FR-013): só IDs, nunca payload/PII.
        onTelemetry: (event) => {
          if (typeof console !== "undefined") {
            console.info("[telemetry]", JSON.stringify(event));
          }
        },
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
    cache.clear(); // revalida na troca de escopo/sessão (FR-009)
    window.localStorage.removeItem(STORAGE_KEY);
  }, [cache]);

  const stepUp = useCallback<SessionContextValue["stepUp"]>(
    async (adminKey) => {
      const anon = createClient({ baseUrl: BASE_URL });
      const subject = session?.subject ?? "operador";
      try {
        const issued = await anon.session({ subject, role: "admin", adminKey });
        return anon.withToken(issued.token);
      } catch (err) {
        if (err instanceof GrintaApiError) throw err;
        throw new Error("Falha na reautenticação.");
      }
    },
    [session],
  );

  const value = useMemo(
    () => ({ session, hydrated, api, cache, login, logout, stepUp }),
    [session, hydrated, api, cache, login, logout, stepUp],
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
