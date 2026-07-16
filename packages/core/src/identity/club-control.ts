import { DomainError, WorldDate, fail, succeed, type Result } from "@grinta/shared";
import type { GameWorldId } from "@grinta/shared";

import { deterministicUuidV7, timestampOf } from "../foundation/deterministic-uuid.js";

import {
  ControlStatus,
  type ClubControlId,
  type IdentityClubRef,
} from "./identity-types.js";
import type { WorldParticipantId } from "./world-participant.js";

/**
 * Quem comanda um clube, e desde quando (R-175). Um agregado por controle.
 *
 * Quatro divergências fechadas aqui:
 *
 * 1. **Aponta para a participação, não para a conta.** O snapshot antigo tinha
 *    `accountId`; o schema tem `worldParticipantId` (schema.prisma:895). Não é
 *    renomeio: a conta é global (R-172) e não sabe de mundo — quem sabe é a
 *    participação. Produzir essa FK era impossível até o `WorldParticipant`
 *    ganhar `id`.
 * 2. **Data, não tick** (R-177). Era `startsAtWorldTick: BigInt`, o único lugar
 *    do schema com tick — e não existia conversor data↔tick em lado nenhum.
 * 3. **`endedReason` existe.** `ClubControlEndedEvent.reason` é obrigatório
 *    (identity-types.ts:119) e o schema não tinha coluna: o motivo nascia no
 *    evento e evaporava na gravação. É a única pergunta que interessa quando um
 *    gestor perde o clube.
 * 4. **Sem `controlType`** (R-180): IA é a AUSÊNCIA de controle. O enum exigia
 *    um `WorldParticipant` fantasma numa FK NOT NULL.
 *
 * "1 controle ativo por clube" deixa de ser varredura de array
 * (`world-identity.ts:545`) e passa a ser índice único parcial no Postgres.
 */
export interface ClubControlSnapshot {
  readonly id: ClubControlId;
  readonly gameWorldId: GameWorldId;
  readonly clubId: IdentityClubRef;
  readonly worldParticipantId: WorldParticipantId;
  readonly status: ControlStatus;
  /** Data do mundo (R-177), nunca tick nem relógio de máquina. */
  readonly startsOn: string;
  readonly endedOn: string | null;
  readonly endedReason: string | null;
  readonly version: number;
}

export interface StartClubControlInput {
  readonly gameWorldId: GameWorldId | string;
  readonly clubId: IdentityClubRef | string;
  readonly worldParticipantId: WorldParticipantId | string;
  readonly worldSeed: string;
  readonly occurredOn: string;
}

export class ClubControl {
  private constructor(private state: ClubControlSnapshot) {}

  public static start(input: StartClubControlInput): Result<ClubControl, DomainError> {
    const date = WorldDate.parse(input.occurredOn);
    if (!date.ok) return date;

    return succeed(
      new ClubControl({
        id: deterministicUuidV7<"ClubControl">({
          worldSeed: input.worldSeed,
          context: `club-control:${input.gameWorldId}:${input.clubId}:${input.worldParticipantId}`,
          timestampMilliseconds: timestampOf(date.value.toString()),
        }),
        gameWorldId: input.gameWorldId as GameWorldId,
        clubId: input.clubId as IdentityClubRef,
        worldParticipantId: input.worldParticipantId as WorldParticipantId,
        status: ControlStatus.ACTIVE,
        startsOn: date.value.toString(),
        endedOn: null,
        endedReason: null,
        version: 1,
      }),
    );
  }

  public static fromSnapshot(
    snapshot: ClubControlSnapshot,
  ): Result<ClubControl, DomainError> {
    if (snapshot.version < 1) return fail(invalid("versão inválida."));

    // Estado, data e motivo têm de contar a mesma história. Um controle ativo
    // com motivo de encerramento é o mesmo fato se contradizendo.
    const ended = snapshot.status === ControlStatus.ENDED;
    if (!ended && (snapshot.endedOn !== null || snapshot.endedReason !== null)) {
      return fail(invalid("controle ativo não pode ter fim nem motivo."));
    }
    if (ended && snapshot.endedOn === null) {
      return fail(invalid("controle encerrado exige data de fim."));
    }
    if (ended && (snapshot.endedReason ?? "").trim() === "") {
      return fail(invalid("controle encerrado exige motivo."));
    }
    if (snapshot.endedOn !== null && snapshot.endedOn < snapshot.startsOn) {
      return fail(invalid("fim não pode anteceder o início."));
    }
    return succeed(new ClubControl(snapshot));
  }

  public end(
    reason: string,
    occurredOn: string,
  ): Result<ClubControlSnapshot, DomainError> {
    if (this.state.status === ControlStatus.ENDED) return succeed(this.state);

    const motive = reason.trim();
    if (motive === "") return fail(invalid("motivo do encerramento é obrigatório."));

    const date = WorldDate.parse(occurredOn);
    if (!date.ok) return date;
    if (date.value.toString() < this.state.startsOn) {
      return fail(invalid("fim não pode anteceder o início."));
    }

    this.state = {
      ...this.state,
      status: ControlStatus.ENDED,
      endedOn: date.value.toString(),
      endedReason: motive,
      version: this.state.version + 1,
    };
    return succeed(this.state);
  }

  public snapshot(): ClubControlSnapshot {
    return this.state;
  }
}

function invalid(message: string): DomainError {
  return new DomainError("CONTROLE_INVALIDO", message);
}
