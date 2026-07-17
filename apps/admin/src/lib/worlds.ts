"use client";

import { useCallback, useEffect, useState } from "react";

import { useSession } from "@/lib/session";

export interface KnownWorld {
  readonly id: string;
  readonly seed: string;
  readonly status: string;
  readonly currentDate: string;
  readonly clubCount: number;
}

/**
 * Os mundos que EXISTEM, vindos da API.
 *
 * Antes isto lia o `localStorage` — e o comentário anterior já sabia que estava
 * errado: "um endpoint de listagem no servidor é follow-up". O custo apareceu
 * quando o banco foi recriado: o console seguiu listando três mundos, DOIS deles
 * apagados, e clicar num fantasma dava tela vazia sem erro nenhum. Pior, a tela
 * de Usuários varre os mundos conhecidos — em qualquer navegador que não tivesse
 * criado os mundos ele mesmo, ela vinha vazia para sempre.
 *
 * Um console de operação mostra o que o servidor tem, não o que este navegador
 * lembra.
 */
export function useKnownWorlds() {
  const { api, session } = useSession();
  const [worlds, setWorlds] = useState<readonly KnownWorld[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (session === null) return;
    let alive = true;
    setLoading(true);
    api
      .worlds()
      .then((list) => {
        if (!alive) return;
        setWorlds(list);
        setError(null);
      })
      .catch(() => {
        if (!alive) return;
        // Lista vazia com erro NOMEADO. Cair calado em `[]` diria "não há
        // mundos" quando a verdade é "não consegui perguntar".
        setWorlds([]);
        setError("Falha ao listar os mundos.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [api, session, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { worlds, loading, error, refresh };
}
