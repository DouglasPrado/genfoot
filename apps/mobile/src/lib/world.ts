import { useCallback, useEffect, useState } from "react";
import { GrintaApiError } from "@grinta/api-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSession } from "@/lib/session";
import { useWorldSelection } from "@/lib/world-selection";
import type { WorldListSource } from "@/screens/onboarding/world-pick-model";
import { queryStateForApiError } from "@/lib/world-query-state";
import {
  mobileScopeKey,
  readCachedQuery,
  writeCachedQuery,
} from "@/lib/persistent-client-state";

/** Estados de uma query de mundo (parte dos estados obrigatórios do registry). */
export type QueryState = "loading" | "ready" | "empty" | "error" | "offline";

/**
 * O mundo escolhido pelo jogador, ou `null` se ele ainda não escolheu (R-208).
 *
 * Era uma constante de BUILD (`EXPO_PUBLIC_WORLD_ID`, com UUID hardcoded de
 * fallback). O `null` é a mudança que importa: sem escolha o app não consulta
 * nada, em vez de consultar um mundo fantasma em silêncio.
 */
export function useWorldId(): string | null {
  return useWorldSelection().worldId;
}

/**
 * O mundo escolhido, para telas que só existem DEPOIS da escolha.
 *
 * Lança se não houver mundo — e lançar é o comportamento certo: essas telas são
 * inalcançáveis sem seleção (o splash roteia para a lista antes), então `null`
 * aqui é bug de roteamento, não estado do jogador. A alternativa era devolver
 * `""` e deixar a query sair com id vazio: voltaria o fantasma silencioso que a
 * R-208 matou, só que com outra cara.
 */
export function useRequiredWorldId(): string {
  const worldId = useWorldId();
  if (worldId === null) {
    throw new Error(
      "Tela escopada em mundo renderizada sem mundo escolhido (R-208): " +
        "o roteamento deveria ter levado à lista de mundos antes.",
    );
  }
  return worldId;
}

/**
 * A lista de mundos que a API serve (`GET /worlds`) — a fonte da `M-WORLD-PICK`.
 *
 * NÃO é `useWorldQuery`: aquela é escopada num mundo, e esta é a query que os
 * DESCOBRE. É a única leitura do app que não pressupõe um mundo escolhido.
 */
export function useWorldsList(): {
  readonly worlds: readonly WorldListSource[];
  readonly state: QueryState;
  readonly refetch: () => void;
} {
  const { client, status: sessionStatus } = useSession();
  const [worlds, setWorlds] = useState<readonly WorldListSource[]>([]);
  const [state, setState] = useState<QueryState>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (client === null) {
        setState(sessionStatus === "connecting" ? "loading" : "offline");
        return;
      }
      setState("loading");
      try {
        const lista = await client.worlds();
        if (cancelled) return;
        setWorlds(lista);
        setState(lista.length === 0 ? "empty" : "ready");
      } catch (e) {
        if (cancelled) return;
        setState(e instanceof GrintaApiError ? "error" : "offline");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt, client, sessionStatus]);

  const refetch = useCallback(() => setAttempt((n) => n + 1), []);
  return { worlds, state, refetch };
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
  params?: Record<string, string>,
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

  // Serializa os params para caber nas deps do efeito e na chave de cache sem
  // reabrir a query a cada render (o objeto muda de identidade, o texto não).
  const paramsKey = params ? JSON.stringify(params) : "";
  useEffect(() => {
    if (queryType === null) return;
    // Sem mundo escolhido não há o que consultar (R-208). Fica em `loading`: a
    // tela que importa nesse momento é a lista de mundos, e inventar um id aqui
    // era exatamente o fallback silencioso que a R-208 matou.
    if (worldId === null) return;
    let cancelled = false;
    // Params entram na chave de cache: o elenco do clube A não pode servir cache
    // ao clube B. `queryType` sozinho colidiria entre recortes.
    const cacheKey = paramsKey ? `${queryType}?${paramsKey}` : queryType;
    const scopeKey = mobileScopeKey(
      session?.subject ?? "anonymous",
      worldId,
      controlScope,
    );
    void (async () => {
      const cached = await readCachedQuery<T>(
        AsyncStorage,
        scopeKey,
        cacheKey,
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
            : await client.query<T>(worldId, queryType, params ? { params } : undefined);
        if (cancelled) return;
        setData(env.data);
        setAsOf(env.asOf);
        setIsStale(false);
        setErrorCode(null);
        setState(looksEmpty(env.data) ? "empty" : "ready");
        await writeCachedQuery(AsyncStorage, scopeKey, cacheKey, {
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
          setState(queryStateForApiError(e.standard.code, cached !== null));
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
    paramsKey,
    session,
    sessionStatus,
    setControlScope,
    worldId,
  ]);

  const refetch = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, state, errorCode, asOf, isStale, refetch };
}
