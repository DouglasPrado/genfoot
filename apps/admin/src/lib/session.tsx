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
  useRef,
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
  /**
   * Chamada autenticada para o que não passa pelo SDK (multipart). Carrega o
   * token e derruba a sessão em 401, como o `api` — a tela não trata nada disso.
   * `path` é relativo à base da API (ex.: `/api/v1/worlds/x/images/banner`).
   */
  authorizedFetch(path: string, init: RequestInit): Promise<Response>;
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
  /**
   * O `logout` é lido por REF dentro do fetch. Pô-lo na dependência do `api`
   * recriaria o client a cada render do provider, e todo componente que tem
   * `api` no array de efeito refaria as queries em loop.
   */
  const logoutRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    setSession(loadStored());
    setHydrated(true);
  }, []);

  const api = useMemo(
    () =>
      createClient({
        baseUrl: BASE_URL,
        ...(session ? { token: session.token } : {}),
        /**
         * Sessão morta derruba a sessão local, em vez de encher a tela de erro.
         *
         * O `SessionStore` da API é um `Map` em memória (`session-store.ts:15`):
         * reiniciar a API invalida todo token, e o admin seguia mandando um
         * token que não existe mais — cada clique virava UNAUTHENTICATED e
         * parecia defeito de tela. O token está no localStorage e sobrevive ao
         * que o emitiu; quem descobre que ele morreu é a primeira resposta 401.
         *
         * Interceptar no `fetch` pega TODA chamada — query, command, catálogo —
         * sem cada tela ter de lembrar de tratar 401 por conta própria.
         *
         * **`session !== null` é obrigatório, e a falta dele derrubava o login a
         * cada F5.** No primeiro render a sessão é `null` — o localStorage só é
         * lido depois do mount, para não haver mismatch de hidratação. Uma query
         * que dispare nessa janela vai SEM token e leva 401 — 401 esperado, que
         * não diz nada sobre a sessão guardada. Sem esta guarda, o interceptor
         * chamava `logout()` e apagava o localStorage a cada carregamento: um
         * interceptor de expiração que expirava a sessão sozinho.
         *
         * 401 só significa "a sessão morreu" quando havia sessão para morrer.
         */
        fetch: async (input, init) => {
          const response = await globalThis.fetch(input, init);
          if (response.status === 401 && session !== null) logoutRef.current();
          return response;
        },
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

  // O `AppShell` já manda para /login quando a sessão some — então derrubar a
  // sessão aqui é o bastante para a expiração levar o operador ao login.
  logoutRef.current = logout;

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

  /**
   * O caminho autenticado para o que NÃO passa pelo SDK — hoje, o upload de
   * imagem, que é multipart (o `GrintaClient` só fala JSON, e o boundary quem
   * compõe é o browser).
   *
   * Existe para manter a invariante que o interceptor do `api` já garante: token
   * em toda chamada, e 401 derruba a sessão. Sem isto, a tela de upload usava
   * `fetch` cru e escapava do interceptor — token morto virava um erro vermelho
   * no campo, enquanto o resto do app seguia como se a sessão estivesse viva. O
   * comentário do interceptor já dizia por que: cada tela lembrar de tratar 401
   * por conta própria é o que não deve acontecer.
   */
  const authorizedFetch = useCallback(
    async (path: string, init: RequestInit): Promise<Response> => {
      const response = await globalThis.fetch(`${BASE_URL}${path}`, {
        ...init,
        headers: {
          ...init.headers,
          ...(session === null
            ? {}
            : { authorization: `Bearer ${session.token}` }),
        },
      });
      if (response.status === 401 && session !== null) logoutRef.current();
      return response;
    },
    [session],
  );

  const value = useMemo(
    () => ({
      session,
      hydrated,
      api,
      cache,
      login,
      logout,
      stepUp,
      authorizedFetch,
    }),
    [session, hydrated, api, cache, login, logout, stepUp, authorizedFetch],
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
