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

/**
 * Rollover automático de temporada (R-52/R-204): quando uma LIGA encerra, a
 * próxima temporada abre SOZINHA — mesmos clubes, mesma config, janela nova. É o
 * que faz o mundo não parar depois de um título; sem isto a liga acabava e o
 * mundo ficava sem calendário.
 *
 * Aqui é a temporada de UMA divisão que se repete. Mover clubes ENTRE divisões
 * (acesso/rebaixamento aplicado) depende de haver várias divisões e é o próximo
 * passo — o desfecho já é calculado (`season-outcome.ts`), falta a estrutura.
 */

export interface SeasonWindow {
  readonly startsOn: string;
  readonly endsOn: string;
}

/**
 * A janela da próxima temporada: começa no dia seguinte à homologação e dura o
 * MESMO tanto de dias que a temporada encerrada — a duração é uma decisão do
 * mundo, e repeti-la mantém o ritmo. Puro: as datas entram por parâmetro.
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
 * Abre a próxima edição da liga e a deixa AGENDADA (rascunho → lock → sorteio),
 * pronta para o motor do dia (MUNDO-V2) iniciá-la quando a data chegar.
 *
 * Idempotente por construção: só rola quando a edição CORRENTE está ENCERRADA —
 * depois de rolar, a corrente vira a nova edição (rascunho/agendada), então uma
 * reexecução no mesmo dia não abre uma segunda. `openNextEdition` ainda guarda a
 * mesma condição no banco (não abre se já existe edição na janela nova).
 */
export class RolloverLeague {
  public constructor(private readonly unitOfWork: CompetitionUnitOfWork) {}

  public async execute(
    input: RolloverLeagueInput,
  ): Promise<Result<{ opened: boolean }, DomainError>> {
    const decision = await this.unitOfWork.run(async (repos) => {
      const snap = await repos.competitions.findCompetitionById(
        input.gameWorldId,
        input.competitionId,
      );
      if (snap === null) return { opened: false as const };
      // Só liga rola assim (a copa é eliminação, o rollover dela é outro). E só
      // a partir da edição ENCERRADA — se a corrente já é rascunho/agendada, já
      // rolou.
      if (
        snap.type !== CompetitionType.LEAGUE ||
        snap.lifecycle !== CompetitionLifecycle.FINISHED ||
        snap.startsOn === null ||
        snap.endsOn === null
      ) {
        return { opened: false as const };
      }
      const window = nextSeasonWindow(
        snap.startsOn,
        snap.endsOn,
        input.occurredOn,
      );
      if (!window.ok) return { error: window.error };
      const opened = await repos.competitions.openNextEdition({
        gameWorldId: input.gameWorldId,
        competitionId: input.competitionId,
        startsOn: window.value.startsOn,
        endsOn: window.value.endsOn,
      });
      return { opened };
    });

    if ("error" in decision) return fail(decision.error);
    if (!decision.opened) return succeed({ opened: false });

    // A nova edição é a corrente (rascunho); travá-la materializa o sorteio e a
    // deixa AGENDADA — daí o motor do dia a inicia quando `startsOn` chega.
    const locked = await new LockCompetition(this.unitOfWork).execute({
      gameWorldId: input.gameWorldId,
      competitionId: input.competitionId,
    });
    if (!locked.ok) return locked;
    return succeed({ opened: true });
  }
}
