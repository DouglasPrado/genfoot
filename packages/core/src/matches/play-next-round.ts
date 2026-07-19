import { DomainError, fail, succeed, type GameWorldId, type Result } from "@grinta/shared";

import type { MatchPlayRepository } from "./match-play-repository.js";
import {
  simulateScheduledMatch,
  type SimulatedMatchResult,
} from "./match-simulation.js";

export interface PlayNextRoundResult {
  readonly roundNumber: number;
  readonly results: readonly SimulatedMatchResult[];
}

/**
 * Joga a próxima rodada não disputada da liga — C5.
 *
 * Simula cada partida da rodada com o kernel determinístico e grava os
 * resultados. Não inventa placar: ele emerge das forças no kernel (doc 05). A
 * tabela se preenche sozinha depois, porque é projeção dos jogos terminados
 * (R-178) — este comando não a toca.
 *
 * Recusa quando não há rodada a jogar (a temporada acabou), em vez de gravar
 * nada — "nada para jogar" é um estado, não um erro silencioso.
 */
export class PlayNextRound {
  public constructor(
    private readonly worldSeed: string,
    private readonly repository: MatchPlayRepository,
  ) {}

  public async execute(
    gameWorldId: GameWorldId,
  ): Promise<Result<PlayNextRoundResult, DomainError>> {
    const round = await this.repository.nextUnplayedRound(gameWorldId);
    if (round.length === 0) {
      return fail(
        new DomainError(
          "NO_ROUND_TO_PLAY",
          "Não há rodada agendada para jogar — a temporada terminou.",
        ),
      );
    }

    const results = round.map((match) =>
      simulateScheduledMatch(this.worldSeed, {
        matchId: match.matchId,
        homeClubId: match.homeClubId,
        awayClubId: match.awayClubId,
        homeStrength: match.homeStrength,
        awayStrength: match.awayStrength,
        homeScorers: match.homeScorers,
        awayScorers: match.awayScorers,
      }),
    );

    await this.repository.saveResults(gameWorldId, results);
    return succeed({ roundNumber: round[0]!.roundNumber, results });
  }
}
