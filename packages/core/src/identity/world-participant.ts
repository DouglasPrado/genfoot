import { DomainError, WorldDate, fail, succeed, type Result } from "@grinta/shared";
import type { EntityId, GameWorldId } from "@grinta/shared";

import { deterministicUuidV7, timestampOf } from "../foundation/deterministic-uuid.js";

import { ParticipationStatus, type IdentityAccountRef } from "./identity-types.js";

export type WorldParticipantId = EntityId<"WorldParticipant">;

/**
 * Vínculo conta ↔ mundo (R-175). Um agregado por participação — não uma coleção
 * dentro de `WorldIdentity`.
 *
 * O que muda em relação ao `WorldParticipationSnapshot` que isto substitui:
 *
 * - **ganha `id`.** O tipo antigo identificava por `(accountId, gameWorldId)`, e
 *   `ClubControl.worldParticipantId` (schema.prisma:895) é NOT NULL: a FK era
 *   impossível de produzir a partir do domínio.
 * - **ganha `version`**, para concorrência otimista por linha. Antes, duas
 *   contas entrando no mesmo mundo disputavam o `revision` do mundo inteiro.
 * - **ganha `leftOn`.** O tipo antigo tinha `status: ENDED` e nenhum campo de
 *   quando — o fato existia sem data.
 *
 * "1 participação por usuário/mundo" é decisão do modelo físico
 * (`@@unique([gameWorldId, userId])`, schema.prisma:676): voltar ao mundo
 * REATIVA esta linha, não cria outra. O histórico das passagens anteriores vive
 * no `DomainEventLog` (R-176) — é para isso que ele existe.
 */
export interface WorldParticipantSnapshot {
  readonly id: WorldParticipantId;
  readonly gameWorldId: GameWorldId;
  readonly accountId: IdentityAccountRef;
  readonly status: ParticipationStatus;
  /** Data do mundo (R-177), nunca o relógio da máquina. */
  readonly joinedOn: string;
  readonly leftOn: string | null;
  readonly version: number;
}

export interface JoinWorldInput {
  readonly gameWorldId: GameWorldId | string;
  readonly accountId: IdentityAccountRef | string;
  readonly worldSeed: string;
  readonly occurredOn: string;
}

export class WorldParticipant {
  private constructor(private state: WorldParticipantSnapshot) {}

  public static join(input: JoinWorldInput): Result<WorldParticipant, DomainError> {
    const date = WorldDate.parse(input.occurredOn);
    if (!date.ok) return date;

    // A conta é global (R-172): quem prova que ela existe é o caso de uso, que
    // enxerga a porta de plataforma. Este agregado não tem como saber — e o
    // Postgres arbitra de qualquer jeito, pela FK para UserAccount.
    return succeed(
      new WorldParticipant({
        id: deterministicUuidV7<"WorldParticipant">({
          worldSeed: input.worldSeed,
          context: `world-participant:${input.gameWorldId}:${input.accountId}`,
          timestampMilliseconds: timestampOf(date.value.toString()),
        }),
        gameWorldId: input.gameWorldId as GameWorldId,
        accountId: input.accountId as IdentityAccountRef,
        status: ParticipationStatus.ACTIVE,
        joinedOn: date.value.toString(),
        leftOn: null,
        version: 1,
      }),
    );
  }

  public static fromSnapshot(
    snapshot: WorldParticipantSnapshot,
  ): Result<WorldParticipant, DomainError> {
    if (snapshot.version < 1) {
      return fail(invalid("versão inválida."));
    }
    // Estado e data têm que concordar: ACTIVE com data de saída, ou ENDED sem
    // ela, são o mesmo fato contado de dois jeitos que se contradizem.
    if (snapshot.status === ParticipationStatus.ACTIVE && snapshot.leftOn !== null) {
      return fail(invalid("participação ativa não pode ter data de saída."));
    }
    if (snapshot.status === ParticipationStatus.ENDED && snapshot.leftOn === null) {
      return fail(invalid("participação encerrada exige data de saída."));
    }
    if (snapshot.leftOn !== null && snapshot.leftOn < snapshot.joinedOn) {
      return fail(invalid("saída não pode anteceder o ingresso."));
    }
    return succeed(new WorldParticipant(snapshot));
  }

  public leave(occurredOn: string): Result<WorldParticipantSnapshot, DomainError> {
    if (this.state.status === ParticipationStatus.ENDED) return succeed(this.state);

    const date = WorldDate.parse(occurredOn);
    if (!date.ok) return date;
    if (date.value.toString() < this.state.joinedOn) {
      return fail(invalid("saída não pode anteceder o ingresso."));
    }

    this.state = {
      ...this.state,
      status: ParticipationStatus.ENDED,
      leftOn: date.value.toString(),
      version: this.state.version + 1,
    };
    return succeed(this.state);
  }

  /** Reativa a MESMA participação: o id não muda, e a FK do controle segue válida. */
  public rejoin(occurredOn: string): Result<WorldParticipantSnapshot, DomainError> {
    if (this.state.status === ParticipationStatus.ACTIVE) return succeed(this.state);

    const date = WorldDate.parse(occurredOn);
    if (!date.ok) return date;
    if (this.state.leftOn !== null && date.value.toString() < this.state.leftOn) {
      return fail(invalid("retorno não pode anteceder a saída."));
    }

    this.state = {
      ...this.state,
      status: ParticipationStatus.ACTIVE,
      leftOn: null,
      version: this.state.version + 1,
    };
    return succeed(this.state);
  }

  public snapshot(): WorldParticipantSnapshot {
    return this.state;
  }
}

function invalid(message: string): DomainError {
  return new DomainError("PARTICIPACAO_INVALIDA", message);
}
