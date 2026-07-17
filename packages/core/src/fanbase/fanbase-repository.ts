import type { GameWorldId } from "@grinta/shared";

import type { ClubId } from "../genesis/genesis-types.js";

/**
 * O que a gênese grava por clube (C10). Escreve as colunas de torcida do `Club`
 * que C3 NÃO toca de propósito (o club repository declara `fanBaseSize`,
 * `boardPatience`, `pressureLevel` como "do C10"): aqui está o dono delas.
 *
 * Não é um agregado versionado ainda — a torcida vira root com contenção (R-183)
 * quando o motor de reação existir (partida altera pressão em paralelo à edição
 * do técnico). Na gênese é escrita única, dentro da transação atômica.
 */
export interface FanbaseSeed {
  readonly clubId: ClubId;
  readonly headcount: number;
  readonly boardPatience: number;
  readonly pressureLevel: number;
}

export interface FanbaseRepository {
  /**
   * Semeia a torcida dos clubes de um mundo. Idempotente por clube: reexecutar a
   * gênese não duplica nem sobrescreve uma torcida que já evoluiu — só materializa
   * a que ainda está zerada (`fanBaseSize = 0`).
   */
  seedFanbases(
    gameWorldId: GameWorldId,
    seeds: readonly FanbaseSeed[],
  ): Promise<void>;
}
