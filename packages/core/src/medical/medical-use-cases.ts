/**
 * Casos de uso do departamento médico — a máquina do episódio encostando no
 * estado OFICIAL do jogador.
 *
 * Cada caso: carrega o episódio, aplica a transição pura, grava com
 * `expectedVersion` (concorrência otimista) e sincroniza a disponibilidade do
 * jogador quando a máquina P4 muda (P4-1 no diagnóstico, P4-2 na alta). Sem
 * essa sincronia o departamento seria uma tela paralela — a escalação e o
 * treino leem `Player.availability`, não a tabela de lesões.
 */

import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import {
  advanceRehabStage,
  diagnoseInjury,
  dischargePlayer,
  forceReturn,
  openInjuryEpisode,
  orderMedicalExam,
  retireMedically,
  reviseDiagnosis,
  setMedicalPlan,
  type DiagnoseInjuryInput,
  type EpisodeTransition,
  type OpenInjuryEpisodeInput,
} from "./injury-episode.js";
import {
  MedicalEpisodeState,
  isEpisodeClosed,
  type InjuryEpisodeRepository,
  type InjuryEpisodeSnapshot,
  type TreatmentOption,
} from "./injury-episode-types.js";

/**
 * Porta para o estado oficial do jogador (máquina P4).
 *
 * O episódio médico não é dono de `Player.availability` — ele PEDE a mudança.
 * Manter isso explícito evita a tentação de a tela derivar disponibilidade da
 * lesão por conta própria.
 */
export interface PlayerAvailabilityWriter {
  /** P4-1: diagnóstico fechado → `INJURED`. */
  markInjured(gameWorldId: string, playerId: string): Promise<void>;
  /** P4-2: alta → `AVAILABLE`. */
  markAvailable(gameWorldId: string, playerId: string): Promise<void>;
  /** Aposentadoria médica → `RETIRED` (terminal, INV-4). */
  markRetired(gameWorldId: string, playerId: string): Promise<void>;
}

export interface MedicalCommandResult {
  readonly episode: InjuryEpisodeSnapshot;
  readonly events: EpisodeTransition["events"];
}

type CommandResult = Result<MedicalCommandResult, DomainError>;

const noOpenEpisode = (playerId: string) =>
  fail(
    new DomainError(
      "PLAYER_NOT_INJURED",
      "O jogador não tem episódio médico aberto.",
      { playerId },
    ),
  );

/**
 * O esqueleto comum: achar o episódio aberto, transicionar, gravar.
 *
 * A gravação usa a versão que veio do banco como `expectedVersion` — não a que
 * o cliente mandou. O comando declara a intenção; a versão é do agregado.
 */
abstract class EpisodeCommand {
  protected constructor(
    protected readonly repository: InjuryEpisodeRepository,
    protected readonly availability: PlayerAvailabilityWriter,
  ) {}

  protected async apply(
    gameWorldId: string,
    playerId: string,
    transition: (
      episode: InjuryEpisodeSnapshot,
    ) => Result<EpisodeTransition, DomainError>,
  ): Promise<CommandResult> {
    const current = await this.repository.findOpenByPlayer(
      gameWorldId,
      playerId,
    );
    if (current === null || isEpisodeClosed(current)) {
      return noOpenEpisode(playerId);
    }

    const result = transition(current);
    if (!result.ok) return result;

    await this.repository.save(result.value.episode, current.version);
    await this.syncAvailability(current, result.value.episode);
    return succeed({
      episode: result.value.episode,
      events: result.value.events,
    });
  }

  /** Só toca em `Player.availability` quando a máquina P4 realmente muda. */
  private async syncAvailability(
    before: InjuryEpisodeSnapshot,
    after: InjuryEpisodeSnapshot,
  ): Promise<void> {
    if (before.state === after.state) return;
    if (after.state === MedicalEpisodeState.DIAGNOSIS) {
      await this.availability.markInjured(after.gameWorldId, after.playerId);
      return;
    }
    if (after.state === MedicalEpisodeState.DISCHARGE) {
      await this.availability.markAvailable(after.gameWorldId, after.playerId);
      return;
    }
    if (after.state === MedicalEpisodeState.MEDICAL_RETIREMENT) {
      await this.availability.markRetired(after.gameWorldId, after.playerId);
    }
  }
}

// ---------------------------------------------------------------------------

/** MED-1 — abre o episódio. Chamado pelo gatilho (treino/partida), não pela UI. */
export class OpenInjuryEpisode {
  public constructor(private readonly repository: InjuryEpisodeRepository) {}

  public async execute(input: OpenInjuryEpisodeInput): Promise<CommandResult> {
    const existing = await this.repository.findOpenByPlayer(
      input.gameWorldId,
      input.playerId,
    );
    // Um episódio aberto por jogador: uma nova lesão em cima de um caso em
    // curso é agravamento do caso, não um segundo caso paralelo. Reabrir seria
    // perder o histórico do primeiro.
    if (existing !== null) {
      return succeed({ episode: existing, events: [] });
    }

    const result = openInjuryEpisode(input);
    if (!result.ok) return result;

    await this.repository.save(result.value.episode, null);
    return succeed({
      episode: result.value.episode,
      events: result.value.events,
    });
  }
}

/** MED-2 — `medical:order-exam`. */
export class OrderMedicalExam extends EpisodeCommand {
  public constructor(
    repository: InjuryEpisodeRepository,
    availability: PlayerAvailabilityWriter,
  ) {
    super(repository, availability);
  }

  public async execute(input: {
    readonly gameWorldId: string;
    readonly playerId: string;
    readonly occurredOn: string;
  }): Promise<CommandResult> {
    return this.apply(input.gameWorldId, input.playerId, (episode) =>
      orderMedicalExam(episode, { occurredOn: input.occurredOn }),
    );
  }
}

/** MED-3 — resultado dos exames; é aqui que o jogador vira `INJURED`. */
export class DiagnoseInjury extends EpisodeCommand {
  public constructor(
    repository: InjuryEpisodeRepository,
    availability: PlayerAvailabilityWriter,
  ) {
    super(repository, availability);
  }

  public async execute(
    input: DiagnoseInjuryInput & {
      readonly gameWorldId: string;
      readonly playerId: string;
    },
  ): Promise<CommandResult> {
    return this.apply(input.gameWorldId, input.playerId, (episode) =>
      episode.diagnosis === null
        ? diagnoseInjury(episode, input)
        : reviseDiagnosis(episode, input),
    );
  }
}

/** MED-4 — `medical:set-plan` (`SetMedicalPlan` do doc 23). */
export class SetMedicalPlan extends EpisodeCommand {
  public constructor(
    repository: InjuryEpisodeRepository,
    availability: PlayerAvailabilityWriter,
  ) {
    super(repository, availability);
  }

  public async execute(input: {
    readonly gameWorldId: string;
    readonly playerId: string;
    readonly occurredOn: string;
    readonly option: TreatmentOption;
  }): Promise<CommandResult> {
    return this.apply(input.gameWorldId, input.playerId, (episode) =>
      setMedicalPlan(episode, {
        occurredOn: input.occurredOn,
        option: input.option,
      }),
    );
  }
}

/** MED-5/6/7 — avanço de estágio; de S7 vira liberação competitiva. */
export class AdvanceRehabStage extends EpisodeCommand {
  public constructor(
    repository: InjuryEpisodeRepository,
    availability: PlayerAvailabilityWriter,
  ) {
    super(repository, availability);
  }

  public async execute(input: {
    readonly gameWorldId: string;
    readonly playerId: string;
    readonly occurredOn: string;
  }): Promise<CommandResult> {
    return this.apply(input.gameWorldId, input.playerId, (episode) =>
      advanceRehabStage(episode, { occurredOn: input.occurredOn }),
    );
  }
}

/**
 * Retorno antecipado — o usuário assume risco DENTRO dos seus limites, e a
 * consequência é real (§6.3). O sorteio vem de fora para o desfecho ser
 * reproduzível.
 */
export class ForceMedicalReturn extends EpisodeCommand {
  public constructor(
    repository: InjuryEpisodeRepository,
    availability: PlayerAvailabilityWriter,
  ) {
    super(repository, availability);
  }

  public async execute(input: {
    readonly gameWorldId: string;
    readonly playerId: string;
    readonly occurredOn: string;
    readonly relapseRoll: number;
    readonly aggravationRoll?: number;
  }): Promise<CommandResult> {
    return this.apply(input.gameWorldId, input.playerId, (episode) =>
      forceReturn(episode, {
        occurredOn: input.occurredOn,
        relapseRoll: input.relapseRoll,
        ...(input.aggravationRoll === undefined
          ? {}
          : { aggravationRoll: input.aggravationRoll }),
      }),
    );
  }
}

/** MED-8 — alta: devolve o jogador a `AVAILABLE`. */
export class DischargeFromMedical extends EpisodeCommand {
  public constructor(
    repository: InjuryEpisodeRepository,
    availability: PlayerAvailabilityWriter,
  ) {
    super(repository, availability);
  }

  public async execute(input: {
    readonly gameWorldId: string;
    readonly playerId: string;
    readonly occurredOn: string;
  }): Promise<CommandResult> {
    return this.apply(input.gameWorldId, input.playerId, (episode) =>
      dischargePlayer(episode, { occurredOn: input.occurredOn }),
    );
  }
}

/** Aposentadoria médica — terminal absoluto, com rito de confirmação. */
export class RetirePlayerMedically extends EpisodeCommand {
  public constructor(
    repository: InjuryEpisodeRepository,
    availability: PlayerAvailabilityWriter,
  ) {
    super(repository, availability);
  }

  public async execute(input: {
    readonly gameWorldId: string;
    readonly playerId: string;
    readonly occurredOn: string;
    readonly confirmed: boolean;
  }): Promise<CommandResult> {
    return this.apply(input.gameWorldId, input.playerId, (episode) =>
      retireMedically(episode, {
        occurredOn: input.occurredOn,
        confirmed: input.confirmed,
      }),
    );
  }
}
