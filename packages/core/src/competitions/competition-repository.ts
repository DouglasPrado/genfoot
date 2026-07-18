import type { GameWorldId } from "@grinta/shared";

import type { CompetitionId } from "../genesis/genesis-types.js";

import type { CompetitionGenesis } from "./competition-types.js";

/**
 * O repositório de C7 (R-175). Competição, temporada, edição e partidas.
 *
 * `materializeGenesis` grava a estrutura inteira de uma edição de forma
 * idempotente — a competição já existente é pulada, como a gênese faz com clubes
 * e jogadores. Não é "salvar um agregado": é semear a liga inicial, um efeito da
 * gênese (R-185).
 */
export interface CompetitionRepository {
  findCompetition(
    gameWorldId: GameWorldId,
    competitionId: CompetitionId,
  ): Promise<{ readonly id: string } | null>;

  /** Grava competição + temporada + edição + partidas. Idempotente por competição. */
  materializeGenesis(genesis: CompetitionGenesis): Promise<boolean>;
}
