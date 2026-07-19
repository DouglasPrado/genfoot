import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type Result,
} from "@grinta/shared";

import {
  LockCompetition,
  type CompetitionUnitOfWork,
} from "./author-competition.js";
import { CompetitionLifecycle } from "./competition-config.js";
import { CompetitionType } from "./competition-types.js";
import { applyPromotionRelegation } from "./promotion-relegation.js";

/**
 * Rollover automático de temporada (R-52/R-204): quando uma LIGA encerra, a
 * próxima temporada abre SOZINHA. É o que faz o mundo não parar depois de um
 * título; sem isto a liga acabava e o mundo ficava sem calendário.
 *
 * Duas formas: a liga AVULSA (`championshipId` nulo) repete os mesmos clubes; a
 * divisão de um CAMPEONATO espera todas as divisões encerrarem e então aplica o
 * acesso/rebaixamento — os clubes trocam de divisão (`promotion-relegation.ts`)
 * antes de abrir a temporada seguinte.
 */

export interface SeasonWindow {
  readonly startsOn: string;
  readonly endsOn: string;
}

/**
 * A janela da próxima temporada: começa no dia seguinte à homologação e dura o
 * MESMO tanto de dias que a temporada encerrada. Puro: as datas entram por
 * parâmetro.
 */
export function nextSeasonWindow(
  finishedStartsOn: string,
  finishedEndsOn: string,
  occurredOn: string,
): Result<SeasonWindow, DomainError> {
  const start = WorldDate.parse(finishedStartsOn);
  const end = WorldDate.parse(finishedEndsOn);
  const closed = WorldDate.parse(occurredOn);
  if (!start.ok) return start;
  if (!end.ok) return end;
  if (!closed.ok) return closed;

  const lengthDays = start.value.differenceInDays(end.value);
  if (lengthDays <= 0) {
    return fail(
      new DomainError(
        "INVALID_SEASON_WINDOW",
        "A temporada encerrada não tem duração positiva para repetir.",
      ),
    );
  }
  const nextStart = closed.value.addDays(1);
  const nextEnd = nextStart.addDays(lengthDays);
  return succeed({
    startsOn: nextStart.toString(),
    endsOn: nextEnd.toString(),
  });
}

export interface RolloverLeagueInput {
  readonly gameWorldId: string;
  readonly competitionId: string;
  /** Data do mundo na homologação da temporada que fecha (R-177). */
  readonly occurredOn: string;
}

/**
 * Abre a próxima temporada de uma liga que encerrou e a deixa AGENDADA (rascunho
 * → lock → sorteio), pronta para o motor do dia (MUNDO-V2) iniciá-la.
 *
 * Idempotente: liga avulsa só rola a partir da edição ENCERRADA (depois de
 * rolar, a corrente vira rascunho/agendada); campeonato só rola quando TODAS as
 * divisões encerraram (depois de rolar, nenhuma está encerrada). Uma reexecução
 * no mesmo dia não abre uma segunda temporada.
 */
export class RolloverLeague {
  public constructor(private readonly unitOfWork: CompetitionUnitOfWork) {}

  public async execute(
    input: RolloverLeagueInput,
  ): Promise<Result<{ opened: boolean }, DomainError>> {
    const snap = await this.unitOfWork.run((repos) =>
      repos.competitions.findCompetitionById(
        input.gameWorldId,
        input.competitionId,
      ),
    );
    if (
      snap === null ||
      snap.type !== CompetitionType.LEAGUE ||
      snap.lifecycle !== CompetitionLifecycle.FINISHED
    ) {
      return succeed({ opened: false });
    }

    return snap.championshipId === null
      ? this.rolloverStandalone(input, snap.startsOn, snap.endsOn)
      : this.rolloverChampionship(input, snap.championshipId);
  }

  /** Liga avulsa: repete os mesmos clubes na temporada seguinte. */
  private async rolloverStandalone(
    input: RolloverLeagueInput,
    startsOn: string | null,
    endsOn: string | null,
  ): Promise<Result<{ opened: boolean }, DomainError>> {
    if (startsOn === null || endsOn === null) return succeed({ opened: false });
    const window = nextSeasonWindow(startsOn, endsOn, input.occurredOn);
    if (!window.ok) return window;

    const opened = await this.unitOfWork.run((repos) =>
      repos.competitions.openNextEdition({
        gameWorldId: input.gameWorldId,
        competitionId: input.competitionId,
        startsOn: window.value.startsOn,
        endsOn: window.value.endsOn,
      }),
    );
    if (!opened) return succeed({ opened: false });
    return this.lockOne(input.gameWorldId, input.competitionId);
  }

  /**
   * Campeonato: só rola quando TODAS as divisões encerraram; aplica o
   * acesso/rebaixamento (os clubes trocam de divisão) e abre a temporada
   * seguinte de cada divisão com o elenco novo.
   */
  private async rolloverChampionship(
    input: RolloverLeagueInput,
    championshipId: string,
  ): Promise<Result<{ opened: boolean }, DomainError>> {
    const outcome = await this.unitOfWork.run(
      async (
        repos,
      ): Promise<{ openedIds: string[]; error?: DomainError }> => {
        const divisions = await repos.competitions.findChampionshipDivisions(
          input.gameWorldId,
          championshipId,
        );
        // As divisões correm em paralelo; espera-se que todas fechem para saber
        // quem sobe e quem desce entre elas.
        if (
          divisions.length === 0 ||
          !divisions.every(
            (d) => d.lifecycle === CompetitionLifecycle.FINISHED,
          )
        ) {
          return { openedIds: [] };
        }

        const rosters = applyPromotionRelegation(
          divisions.map((d) => ({
            tier: d.tier,
            orderedClubIds: d.orderedClubIds,
            promotionSlots: d.promotionSlots,
            relegationSlots: d.relegationSlots,
          })),
        );
        const rosterByTier = new Map(rosters.map((r) => [r.tier, r.clubIds]));

        const openedIds: string[] = [];
        for (const d of divisions) {
          if (d.startsOn === null || d.endsOn === null) continue;
          const window = nextSeasonWindow(
            d.startsOn,
            d.endsOn,
            input.occurredOn,
          );
          if (!window.ok) return { openedIds, error: window.error };
          const roster = rosterByTier.get(d.tier);
          const ok = await repos.competitions.openNextEdition({
            gameWorldId: input.gameWorldId,
            competitionId: d.competitionId,
            startsOn: window.value.startsOn,
            endsOn: window.value.endsOn,
            ...(roster !== undefined ? { clubIds: roster } : {}),
          });
          if (ok) openedIds.push(d.competitionId);
        }
        return { openedIds };
      },
    );

    if (outcome.error) return fail(outcome.error);
    if (outcome.openedIds.length === 0) return succeed({ opened: false });

    // Trava (materializa o sorteio de) cada divisão nova.
    for (const competitionId of outcome.openedIds) {
      const locked = await this.lockOne(input.gameWorldId, competitionId);
      if (!locked.ok) return locked;
    }
    return succeed({ opened: true });
  }

  private async lockOne(
    gameWorldId: string,
    competitionId: string,
  ): Promise<Result<{ opened: boolean }, DomainError>> {
    const locked = await new LockCompetition(this.unitOfWork).execute({
      gameWorldId,
      competitionId,
    });
    if (!locked.ok) return locked;
    return succeed({ opened: true });
  }
}
