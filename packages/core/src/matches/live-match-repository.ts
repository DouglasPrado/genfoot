import type { GameWorldId } from "@grinta/shared";

import type { LiveMatchSnapshot } from "./live-match.js";

/**
 * A porta da partida ao vivo (C5-V2).
 *
 * **O tick corrente não é armazenado.** Ele é função do instante do apito
 * (`Match.startedAt`) e do relógio do mundo: `tickAt(agora − apito, duração do
 * dia, totalTicks)`. Guardar o tick numa coluna criaria uma segunda fonte de
 * verdade sobre "que minuto é" — e as duas divergiriam no primeiro tick perdido.
 * O kernel já recalcula o jogo inteiro a partir do log de ordens, então derivar
 * é mais barato E mais seguro do que acumular.
 *
 * O que É armazenado: o manifesto congelado no apito (`MatchSimulation`) e as
 * ordens do técnico (`MatchCommandLog`). Sem o manifesto congelado, a prévia ao
 * vivo e o resultado final poderiam discordar se a força do elenco mudasse no
 * meio do jogo.
 */
export interface LiveMatchRepository {
  /**
   * A partida ao vivo pelo id, com o tick já resolvido pelo relógio.
   * `null` se não existe neste mundo.
   */
  findLive(
    gameWorldId: GameWorldId,
    matchId: string,
  ): Promise<LiveMatchSnapshot | null>;

  /**
   * As partidas cujo apito já chegou e que ainda não começaram — o que o
   * relógio do mundo tem de iniciar.
   */
  dueToStart(
    gameWorldId: GameWorldId,
    worldDateIso: string,
  ): Promise<readonly string[]>;

  /**
   * As partidas em andamento cujo tempo real já se esgotou — o que o relógio
   * tem de encerrar.
   */
  dueToFinish(gameWorldId: GameWorldId): Promise<readonly string[]>;

  /**
   * Apita o início: congela o manifesto e marca a partida como LIVE.
   * Idempotente — iniciar de novo não reabre nem re-sorteia nada.
   */
  startMatch(
    gameWorldId: GameWorldId,
    matchId: string,
  ): Promise<LiveMatchSnapshot | null>;

  /**
   * Registra uma ordem do técnico no log. `expectedSequence` é a concorrência
   * otimista: duas ordens simultâneas não podem receber a mesma sequência, e a
   * segunda tem de perder — a ordem do log é a ordem-verdade do replay.
   */
  appendCommand(
    gameWorldId: GameWorldId,
    matchId: string,
    command: {
      readonly matchSequence: number;
      readonly tick: number;
      readonly actor: string;
      readonly commandType: string;
      readonly side: "HOME" | "AWAY";
      readonly delta: number;
      readonly idempotencyKey: string;
    },
  ): Promise<boolean>;
}
