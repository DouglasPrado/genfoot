"use client";

import { useCallback, useEffect, useState } from "react";

import { useToast } from "@/components/ui/toast";
import { useSession } from "@/lib/session";

export interface KnownWorld {
  readonly id: string;
  readonly seed: string;
  readonly status: string;
  readonly currentDate: string;
  readonly clubCount: number;
  /**
   * Identidade do mundo, vinda da query oficial de DETALHE (a listagem ainda não
   * carrega esses campos). `null` = nunca definida — a UI cai no `seed` e num
   * placeholder, nunca inventa.
   */
  readonly name: string | null;
  readonly description: string | null;
  readonly bannerUrl: string | null;
  readonly squarePhotoUrl: string | null;
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
  const { error: showError } = useToast();
  const [worlds, setWorlds] = useState<readonly KnownWorld[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (session === null) return;
    let alive = true;
    setLoading(true);
    api
      .worlds()
      .then(async (list) => {
        // Enriquece cada linha com a IDENTIDADE (nome, descrição, foto, capa)
        // via a query oficial de detalhe — o endpoint de lista não a carrega
        // ainda. Falha de um detalhe não derruba a lista: aquele mundo só fica
        // sem identidade (cai no seed/placeholder).
        const details = await Promise.all(
          list.map((world) => api.world(world.id).catch(() => null)),
        );
        if (!alive) return;
        setWorlds(
          list.map((world, index) => {
            const detail = details[index];
            return {
              id: world.id,
              seed: world.seed,
              status: world.status,
              currentDate: world.currentDate,
              clubCount: world.clubCount,
              name: detail?.name ?? null,
              description: detail?.description ?? null,
              bannerUrl: detail?.bannerUrl ?? null,
              squarePhotoUrl: detail?.squarePhotoUrl ?? null,
            };
          }),
        );
        setFailed(false);
      })
      .catch(() => {
        if (!alive) return;
        // Lista vazia com erro NOMEADO. Cair calado em `[]` diria "não há
        // mundos" quando a verdade é "não consegui perguntar".
        setWorlds([]);
        setFailed(true);
        showError("Falha ao listar os mundos.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [api, session, tick, showError]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { worlds, loading, failed, refresh };
}
