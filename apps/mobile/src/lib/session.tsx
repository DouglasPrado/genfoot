import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@clerk/expo";
import { GrintaClient, type SessionResponse } from "@grinta/api-client";
import { API_BASE_URL, DEV_SUBJECT } from "@/lib/config";

export type ConnectionStatus = "connecting" | "online" | "offline";

interface SessionValue {
  readonly client: GrintaClient | null;
  readonly session: SessionResponse | null;
  readonly status: ConnectionStatus;
  readonly contractVersion: string | null;
  readonly controlScope: string | null;
  readonly setControlScope: (controlId: string | null) => void;
  readonly retry: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Abre e mantém a sessão do jogador contra a API oficial. Em dev abre uma
 * sessão anônima/dev para iterar visual; num app real isto vira um fluxo de
 * login. Reexpõe o client já autenticado (com token) para as telas.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  // O efeito lê getToken por ref: se a identidade da função mudar a cada
  // render, tê-la nas deps reabriria a sessão em loop — status preso em
  // "connecting" e todas as queries eternamente em loading.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [contractVersion, setContractVersion] = useState<string | null>(null);
  const [authedClient, setAuthedClient] = useState<GrintaClient | null>(null);
  const [controlScope, setControlScope] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Client base (sem token) — estável entre renders.
  const baseClient = useRef<GrintaClient | null>(null);
  if (baseClient.current === null) {
    baseClient.current = new GrintaClient({ baseUrl: API_BASE_URL });
  }

  useEffect(() => {
    let cancelled = false;
    const base = baseClient.current;
    if (base === null) return;
    if (!isLoaded) return;
    setStatus("connecting");
    (async () => {
      try {
        const health = await base.health();
        if (cancelled) return;
        setContractVersion(health.contractVersion);

        // Sem conta, não há sessão de jogo: o splash manda ao login (MF-00).
        // Antes abríamos uma sessão de desenvolvimento aqui, e por isso o app
        // mostrava clube e caixa para quem estava deslogado.
        const clerkToken = await getTokenRef.current();
        if (cancelled) return;
        if (clerkToken === null) {
          setSession(null);
          setAuthedClient(null);
          setStatus("online");
          return;
        }

        const opened = await base.session({
          subject: DEV_SUBJECT,
          role: "user",
          clerkToken,
        });
        if (cancelled) return;
        setSession(opened);
        setAuthedClient(base.withToken(opened.token));
        setStatus("online");
      } catch (error) {
        if (cancelled) return;
        /**
         * O erro VAI para o log. Este catch era vazio, e o custo apareceu na
         * primeira vez que o app não conectou: a tela dizia "sem conexão" e a
         * causa — rede? contrato? o /auth/session recusando o token? — tinha
         * sido jogada fora. "Offline" virava o nome de qualquer falha.
         *
         * O usuário segue vendo "sem conexão", que é o que ele pode fazer algo
         * a respeito. Quem precisa da causa é quem lê o log.
         */
        console.error("[session] bootstrap falhou:", error);
        setStatus("offline");
      }
    })();
    return () => {
      cancelled = true;
    };
    // `isLoaded`/`isSignedIn` nas deps: ao entrar ou sair, a sessão do jogo é
    // reaberta ou descartada junto.
  }, [attempt, isLoaded, isSignedIn]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const value = useMemo<SessionValue>(
    () => ({
      client: authedClient,
      session,
      status,
      contractVersion,
      controlScope,
      setControlScope,
      retry,
    }),
    [authedClient, session, status, contractVersion, controlScope, retry],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (ctx === null) {
    throw new Error("useSession precisa estar dentro de <SessionProvider>.");
  }
  return ctx;
}
