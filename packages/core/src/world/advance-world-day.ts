import { succeed, type DomainError, type Result } from "@grinta/shared";
import type { GameWorldId } from "@grinta/shared";

import {
  FinishCompetition,
  StartCompetition,
  type CompetitionUnitOfWork,
} from "../competitions/author-competition.js";
import type { CompetitionReadModel } from "../competitions/competition-read-model.js";
import type { MatchPlayRepository } from "../matches/match-play-repository.js";
import { simulateScheduledMatch } from "../matches/match-simulation.js";

import { AdvanceWorldDays } from "./world-use-cases.js";
import type { WorldRepository } from "./world-repository.js";

/**
 * AdvanceWorldOneDay (MUNDO-V2) — o motor do dia. Avança a data lógica UM dia e
 * roda o trabalho do dia, na ordem que faz o campeonato acontecer sozinho:
 *
 * 1. a data anda (R-177);
 * 2. as competições que chegaram na data de início VÃO A EM_ANDAMENTO;
 * 3. as partidas vencidas (data ≤ hoje) são jogadas — a tabela/artilharia evoluem;
 * 4. as competições cujo término passou são HOMOLOGADAS (pagam prêmios, oficializam).
 *
 * Orquestra os use cases existentes; cada passo é atômico e idempotente, então
 * reexecutar (o scheduler pode) apenas completa o que faltou.
 */
export interface AdvanceWorldDayDeps {
  readonly worlds: WorldRepository;
  readonly competitionUnitOfWork: CompetitionUnitOfWork;
  readonly competitionReadModel: CompetitionReadModel;
  readonly matchPlay: MatchPlayRepository;
}

export interface AdvanceWorldDayInput {
  readonly gameWorldId: string;
}

export interface AdvanceWorldDayResult {
  readonly newDate: string;
  readonly competitionsStarted: number;
  readonly matchesPlayed: number;
  readonly competitionsHomologated: number;
}

export class AdvanceWorldOneDay {
  public constructor(private readonly deps: AdvanceWorldDayDeps) {}

  public async execute(
    input: AdvanceWorldDayInput,
  ): Promise<Result<AdvanceWorldDayResult, DomainError>> {
    const worldId = input.gameWorldId as GameWorldId;

    // 1. A data anda um dia.
    const advanced = await new AdvanceWorldDays(this.deps.worlds).execute(
      worldId,
      1,
    );
    if (!advanced.ok) return advanced;
    const newDate = advanced.value.world.currentDate;
    // O seed é o do próprio mundo — sempre, não um parâmetro (determinismo R-182).
    const worldSeed = advanced.value.world.seed;

    // 2. Abrir as competições que chegaram na data de início.
    const all = await this.deps.competitionReadModel.listCompetitions(worldId);
    let started = 0;
    for (const c of all) {
      if (
        c.lifecycle === "SCHEDULED" &&
        c.startsOn !== null &&
        c.startsOn <= newDate
      ) {
        const r = await new StartCompetition(
          this.deps.competitionUnitOfWork,
        ).execute({ gameWorldId: worldId, competitionId: c.competitionId });
        if (r.ok) started += 1;
      }
    }

    // 3. Jogar as partidas vencidas.
    const due = await this.deps.matchPlay.matchesDueBy(worldId, newDate);
    if (due.length > 0) {
      const results = due.map((m) =>
        simulateScheduledMatch(worldSeed, {
          matchId: m.matchId,
          homeClubId: m.homeClubId,
          awayClubId: m.awayClubId,
          homeStrength: m.homeStrength,
          awayStrength: m.awayStrength,
          homeScorers: m.homeScorers,
          awayScorers: m.awayScorers,
        }),
      );
      await this.deps.matchPlay.saveResults(worldId, results);
    }

    // 4. Homologar as competições cujo término já passou.
    const afterPlay =
      await this.deps.competitionReadModel.listCompetitions(worldId);
    let homologated = 0;
    for (const c of afterPlay) {
      if (
        c.lifecycle === "RUNNING" &&
        c.endsOn !== null &&
        c.endsOn < newDate
      ) {
        const r = await new FinishCompetition(
          this.deps.competitionUnitOfWork,
        ).execute({
          gameWorldId: worldId,
          competitionId: c.competitionId,
          worldSeed: worldSeed,
          occurredOn: newDate,
        });
        if (r.ok) homologated += 1;
      }
    }

    return succeed({
      newDate,
      competitionsStarted: started,
      matchesPlayed: due.length,
      competitionsHomologated: homologated,
    });
  }
}
