import { useCallback, useEffect, useState } from "react";
import { GrintaApiError } from "@grinta/api-client";
import { useSession } from "@/lib/session";
import { DEFAULT_WORLD_ID } from "@/lib/config";

/** Estados de uma query de mundo (parte dos estados obrigatórios do registry). */
export type QueryState = "loading" | "ready" | "empty" | "error" | "offline";

/** Mundo atualmente selecionado pelo app (config; futura seleção multi-mundo). */
export function useWorldId(): string {
  return DEFAULT_WORLD_ID;
}

function looksEmpty(data: unknown): boolean {
  if (data == null) return true;
  if (Array.isArray(data)) return data.length === 0;
  return false;
}

interface WorldQueryResult<T> {
  readonly data: T | null;
  readonly state: QueryState;
  readonly errorCode: string | null;
  readonly asOf: string | null;
  readonly refetch: () => void;
}

/**
 * Consulta uma projeção do mundo ativo (`GET /worlds/:id[/:type]`) via o client
 * autenticado da sessão. Passe `"world"` para o snapshot do mundo. Mapeia
 * *_NOT_FOUND (contexto não inicializado) para `empty`, falha de sessão para
 * `offline`, e demais erros para `error`.
 */
export function useWorldQuery<T = unknown>(queryType: string | null): WorldQueryResult<T> {
  const { client, status: sessionStatus } = useSession();
  const worldId = useWorldId();
  const [data, setData] = useState<T | null>(null);
  const [state, setState] = useState<QueryState>("loading");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (queryType === null) return;
    let cancelled = false;
    if (client === null) {
      setState(sessionStatus === "connecting" ? "loading" : "offline");
      return;
    }
    setState("loading");
    void (async () => {
      try {
        const env =
          queryType === "world"
            ? await client.query<T>(worldId)
            : await client.query<T>(worldId, queryType);
        if (cancelled) return;
        setData(env.data);
        setAsOf(env.asOf);
        setErrorCode(null);
        setState(looksEmpty(env.data) ? "empty" : "ready");
      } catch (e) {
        if (cancelled) return;
        if (e instanceof GrintaApiError) {
          setErrorCode(e.standard.code);
          setState(/NOT_FOUND/.test(e.standard.code) ? "empty" : "error");
        } else {
          setErrorCode("NETWORK");
          setState("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, sessionStatus, worldId, queryType, attempt]);

  const refetch = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, state, errorCode, asOf, refetch };
}
