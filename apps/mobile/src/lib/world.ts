import { useCallback, useEffect, useState } from "react";
import { GrintaApiError } from "@grinta/api-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSession } from "@/lib/session";
import { DEFAULT_WORLD_ID } from "@/lib/config";
import {
  mobileScopeKey,
  readCachedQuery,
  writeCachedQuery,
} from "@/lib/persistent-client-state";

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
  readonly isStale: boolean;
  readonly refetch: () => void;
}

/**
 * Consulta uma projeção do mundo ativo (`GET /worlds/:id[/:type]`) via o client
 * autenticado da sessão. Passe `"world"` para o snapshot do mundo. Mapeia
 * *_NOT_FOUND (contexto não inicializado) para `empty`, falha de sessão para
 * `offline`, e demais erros para `error`.
 */
export function useWorldQuery<T = unknown>(
  queryType: string | null,
): WorldQueryResult<T> {
  const {
    client,
    session,
    status: sessionStatus,
    controlScope,
    setControlScope,
  } = useSession();
  const worldId = useWorldId();
  const [data, setData] = useState<T | null>(null);
  const [state, setState] = useState<QueryState>("loading");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (queryType === null) return;
    let cancelled = false;
    const scopeKey = mobileScopeKey(
      session?.subject ?? "anonymous",
      worldId,
      controlScope,
    );
    void (async () => {
      const cached = await readCachedQuery<T>(
        AsyncStorage,
        scopeKey,
        queryType,
      );
      if (cancelled) return;
      if (cached !== null) {
        setData(cached.data);
        setAsOf(cached.asOf);
        setIsStale(true);
      }
      if (client === null) {
        setState(sessionStatus === "connecting" ? "loading" : "offline");
        return;
      }
      setState("loading");
      try {
        const env =
          queryType === "world"
            ? await client.query<T>(worldId)
            : await client.query<T>(worldId, queryType);
        if (cancelled) return;
        setData(env.data);
        setAsOf(env.asOf);
        setIsStale(false);
        setErrorCode(null);
        setState(looksEmpty(env.data) ? "empty" : "ready");
        await writeCachedQuery(AsyncStorage, scopeKey, queryType, {
          data: env.data,
          asOf: env.asOf,
          projectionVersion: env.projectionVersion,
        });
        if (queryType === "identity-detail" && session !== null) {
          const projection = env.data as {
            readonly accounts?: readonly {
              readonly id: string;
              readonly idempotencyKey: string;
            }[];
            readonly controls?: readonly {
              readonly id: string;
              readonly accountId: string;
              readonly status: string;
            }[];
          };
          const account = projection.accounts?.find(
            (candidate) =>
              candidate.idempotencyKey === `mobile-account:${session.subject}`,
          );
          const activeControl = projection.controls?.find(
            (candidate) =>
              candidate.accountId === account?.id &&
              candidate.status === "ACTIVE",
          );
          setControlScope(activeControl?.id ?? null);
        }
      } catch (e) {
        if (cancelled) return;
        if (e instanceof GrintaApiError) {
          setErrorCode(e.standard.code);
          setState(
            /NOT_FOUND/.test(e.standard.code)
              ? "empty"
              : cached !== null
                ? "offline"
                : "error",
          );
        } else {
          setErrorCode("NETWORK");
          setState(cached !== null ? "offline" : "error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    attempt,
    client,
    controlScope,
    queryType,
    session,
    sessionStatus,
    setControlScope,
    worldId,
  ]);

  const refetch = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, state, errorCode, asOf, isStale, refetch };
}
