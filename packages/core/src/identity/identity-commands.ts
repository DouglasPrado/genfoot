import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import { deterministicUuidV7, timestampOf } from "../foundation/deterministic-uuid.js";

import { ClubControl, type ClubControlSnapshot } from "./club-control.js";
import {
  ClubEntryReservation,
  type ClubEntryReservationSnapshot,
} from "./club-entry-reservation.js";
import { AggregateType, IdentityEventType, identityEvent } from "./identity-events.js";
import type { IdentityRepositories, IdentityUnitOfWork } from "./identity-unit-of-work.js";
import { ClubReservationStatus, ControlStatus } from "./identity-types.js";
import { WorldParticipant, type WorldParticipantSnapshot } from "./world-participant.js";

/**
 * Comandos de C1 sobre agregados por entidade (R-175).
 *
 * O que sumiu em relação ao `identity-use-cases.ts` que isto substitui:
 *
 * - **`idempotencyKey` como campo do agregado**. Quem arbitra o efeito agora é
 *   a chave natural do banco: `@@unique([gameWorldId, userId])` na participação
 *   e os índices únicos parciais na reserva e no controle. O antigo varria
 *   `state.events` atrás de um replay — O(mundo) por comando — para fazer à mão
 *   o que o índice faz. A `IdempotencyKey` (R-176) fica no barramento, um ponto
 *   só, e não repetida em sete casos de uso.
 *
 *   **Mas ele não sumiu inteiro, e a distinção custou um bug.** Ele sobrevive
 *   como `attemptKey`: semente do id determinístico, não estado. O
 *   `WorldParticipant` é 1 por (mundo, conta) — o id pode sair da chave natural.
 *   Reserva e controle são 1 por VEZ e muitos ao longo do tempo: o clube
 *   circula, quem saiu volta. Sem discriminador de tentativa, soltar e reservar
 *   o mesmo clube no mesmo dia repetia o id e colidia na chave primária.
 * - **`rulesetVersion`**. Era checado contra o `rulesetVersion` do
 *   mega-agregado, que não existe mais. Volta com `GameRuleConfig` (R-182), que
 *   é onde config de mundo passa a morar.
 * - **`InitializeIdentity`**. Não há mais agregado de identidade do mundo para
 *   inicializar: os roots nascem quando o jogador age.
 *
 * Toda escrita passa pelo `UnitOfWork`: agregado e evento no MESMO commit
 * (Decisão 19.10).
 */

export interface JoinWorldInput {
  readonly gameWorldId: string;
  readonly accountId: string;
  readonly worldSeed: string;
  readonly occurredOn: string;
  readonly correlationId?: string;
}

export class JoinWorld {
  public constructor(private readonly unitOfWork: IdentityUnitOfWork) {}

  public execute(
    input: JoinWorldInput,
  ): Promise<Result<WorldParticipantSnapshot, DomainError>> {
    return run(this.unitOfWork, async (repositories) => {
      // A conta é global (R-172): o agregado do mundo não tem como saber se ela
      // existe. Quem enxerga a porta de plataforma é este caso de uso.
      const account = await repositories.accounts.findAccountById(input.accountId);
      if (account === null) {
        return fail(
          new DomainError("ACCOUNT_NOT_FOUND", "A conta não existe.", {
            accountId: input.accountId,
          }),
        );
      }

      const existing = await repositories.participants.findParticipantByAccount(
        input.gameWorldId,
        input.accountId,
      );

      // "1 participação por usuário/mundo" (schema.prisma:676): voltar REATIVA
      // a linha, não cria outra.
      if (existing !== null) {
        if (existing.status !== "ENDED") return succeed(existing);

        const loaded = WorldParticipant.fromSnapshot(existing);
        if (!loaded.ok) return loaded;
        const rejoined = loaded.value.rejoin(input.occurredOn);
        if (!rejoined.ok) return rejoined;

        await repositories.participants.saveParticipant(rejoined.value, existing.version);
        await emit(repositories, input, rejoined.value, {
          aggregateType: AggregateType.WORLD_PARTICIPANT,
          aggregateId: rejoined.value.id,
          aggregateVersion: rejoined.value.version,
          eventType: IdentityEventType.WORLD_PARTICIPATION_ACTIVATED,
          payload: { accountId: input.accountId, rejoined: true },
        });
        return succeed(rejoined.value);
      }

      const created = WorldParticipant.join(input);
      if (!created.ok) return created;
      const snapshot = created.value.snapshot();

      await repositories.participants.saveParticipant(snapshot, null);
      await emit(repositories, input, snapshot, {
        aggregateType: AggregateType.WORLD_PARTICIPANT,
        aggregateId: snapshot.id,
        aggregateVersion: snapshot.version,
        eventType: IdentityEventType.WORLD_PARTICIPATION_ACTIVATED,
        payload: { accountId: input.accountId, rejoined: false },
      });
      return succeed(snapshot);
    });
  }
}

export interface ReserveClubInput {
  readonly gameWorldId: string;
  readonly accountId: string;
  readonly clubId: string;
  readonly worldSeed: string;
  readonly occurredOn: string;
  readonly expiresOn: string;
  /**
   * Discrimina tentativas — semente do id da reserva, vinda do
   * `idempotencyKey` do comando. Sem ela, soltar e reservar o mesmo clube no
   * mesmo dia repetiria o id: a reserva é 1 por VEZ, muitas ao longo do tempo.
   */
  readonly attemptKey: string;
  readonly correlationId?: string;
}

export class ReserveClub {
  public constructor(private readonly unitOfWork: IdentityUnitOfWork) {}

  public execute(
    input: ReserveClubInput,
  ): Promise<Result<ClubEntryReservationSnapshot, DomainError>> {
    return run(this.unitOfWork, async (repositories) => {
      const participant = await activeParticipant(repositories, input);
      if (!participant.ok) return participant;

      const loaded = WorldParticipant.fromSnapshot(participant.value);
      if (!loaded.ok) return loaded;
      if (loaded.value.isInCooldownOn(input.occurredOn)) {
        return fail(
          new DomainError(
            "ACCOUNT_COOLDOWN_ACTIVE",
            "A conta está em cooldown neste mundo.",
            { untilOn: participant.value.cooldownUntilOn },
          ),
        );
      }

      const taken = await clubIsTaken(repositories, input.gameWorldId, input.clubId);
      if (!taken.ok) return taken;

      const created = ClubEntryReservation.hold({
        ...input,
        worldParticipantId: participant.value.id,
      });
      if (!created.ok) return created;
      const snapshot = created.value.snapshot();

      await repositories.reservations.saveReservation(snapshot, null);
      await emit(repositories, input, snapshot, {
        aggregateType: AggregateType.CLUB_ENTRY_RESERVATION,
        aggregateId: snapshot.id,
        aggregateVersion: snapshot.version,
        eventType: IdentityEventType.CLUB_RESERVED,
        payload: { clubId: input.clubId, expiresOn: snapshot.expiresOn },
      });
      return succeed(snapshot);
    });
  }
}

export interface ConfirmOnboardingInput {
  readonly gameWorldId: string;
  readonly reservationId: string;
  readonly worldSeed: string;
  readonly occurredOn: string;
  readonly correlationId?: string;
}

export class ConfirmOnboarding {
  public constructor(private readonly unitOfWork: IdentityUnitOfWork) {}

  public execute(
    input: ConfirmOnboardingInput,
  ): Promise<Result<ClubControlSnapshot, DomainError>> {
    return run(this.unitOfWork, async (repositories) => {
      const reservation = await repositories.reservations.findReservationById(
        input.gameWorldId,
        input.reservationId,
      );
      if (reservation === null) {
        return fail(
          new DomainError("RESERVATION_NOT_FOUND", "Reserva não encontrada.", {
            reservationId: input.reservationId,
          }),
        );
      }

      // Confirmar reserva vencida daria a vaga a quem perdeu o prazo.
      if (
        reservation.status === ClubReservationStatus.HELD &&
        input.occurredOn > reservation.expiresOn
      ) {
        return fail(
          new DomainError("CLUB_SLOT_RESERVATION_EXPIRED", "A reserva venceu.", {
            expiresOn: reservation.expiresOn,
          }),
        );
      }

      const loaded = ClubEntryReservation.fromSnapshot(reservation);
      if (!loaded.ok) return loaded;
      const confirmed = loaded.value.confirm();
      if (!confirmed.ok) return confirmed;

      const created = ClubControl.start({
        gameWorldId: input.gameWorldId,
        clubId: reservation.clubId,
        worldParticipantId: reservation.worldParticipantId,
        worldSeed: input.worldSeed,
        occurredOn: input.occurredOn,
        // A própria reserva é o discriminador natural: confirmar a reserva X
        // cria o controle de X, e reconfirmar devolve o mesmo id.
        attemptKey: reservation.id,
      });
      if (!created.ok) return created;
      const control = created.value.snapshot();

      await repositories.reservations.saveReservation(confirmed.value, reservation.version);
      // Se o clube já tiver controle ativo, é AQUI que a corrida se decide: o
      // índice único parcial recusa, e a transação inteira desfaz — inclusive
      // a confirmação da reserva.
      await repositories.controls.saveControl(control, null);
      await emit(repositories, input, control, {
        aggregateType: AggregateType.CLUB_CONTROL,
        aggregateId: control.id,
        aggregateVersion: control.version,
        eventType: IdentityEventType.CLUB_CONTROL_ACTIVATED,
        payload: { clubId: control.clubId, reservationId: reservation.id },
      });
      return succeed(control);
    });
  }
}

export interface ReleaseClubReservationInput {
  readonly gameWorldId: string;
  readonly reservationId: string;
  readonly worldSeed: string;
  readonly occurredOn: string;
  readonly correlationId?: string;
}

export class ReleaseClubReservation {
  public constructor(private readonly unitOfWork: IdentityUnitOfWork) {}

  public execute(
    input: ReleaseClubReservationInput,
  ): Promise<Result<ClubEntryReservationSnapshot, DomainError>> {
    return run(this.unitOfWork, async (repositories) => {
      const reservation = await repositories.reservations.findReservationById(
        input.gameWorldId,
        input.reservationId,
      );
      if (reservation === null) {
        return fail(
          new DomainError("RESERVATION_NOT_FOUND", "Reserva não encontrada.", {
            reservationId: input.reservationId,
          }),
        );
      }

      const loaded = ClubEntryReservation.fromSnapshot(reservation);
      if (!loaded.ok) return loaded;
      const released = loaded.value.release();
      if (!released.ok) return released;
      if (released.value.version === reservation.version) return succeed(released.value);

      await repositories.reservations.saveReservation(released.value, reservation.version);
      await emit(repositories, input, released.value, {
        aggregateType: AggregateType.CLUB_ENTRY_RESERVATION,
        aggregateId: released.value.id,
        aggregateVersion: released.value.version,
        eventType: IdentityEventType.CLUB_RESERVATION_RELEASED,
        payload: { clubId: released.value.clubId },
      });
      return succeed(released.value);
    });
  }
}

export interface EndClubControlInput {
  readonly gameWorldId: string;
  readonly controlId: string;
  readonly reason: string;
  readonly worldSeed: string;
  readonly occurredOn: string;
  /** Config do mundo; volta para `GameRuleConfig` com a reescrita de C2 (R-182). */
  readonly cooldownDays: number;
  readonly correlationId?: string;
}

export class EndClubControl {
  public constructor(private readonly unitOfWork: IdentityUnitOfWork) {}

  public execute(
    input: EndClubControlInput,
  ): Promise<Result<ClubControlSnapshot, DomainError>> {
    return run(this.unitOfWork, async (repositories) => {
      const control = await repositories.controls.findControlById(
        input.gameWorldId,
        input.controlId,
      );
      if (control === null) {
        return fail(
          new DomainError("CONTROL_NOT_FOUND", "Controle não encontrado.", {
            controlId: input.controlId,
          }),
        );
      }

      const loaded = ClubControl.fromSnapshot(control);
      if (!loaded.ok) return loaded;
      const ended = loaded.value.end(input.reason, input.occurredOn);
      if (!ended.ok) return ended;
      if (ended.value.version === control.version) return succeed(ended.value);

      await repositories.controls.saveControl(ended.value, control.version);
      await emit(repositories, input, ended.value, {
        aggregateType: AggregateType.CLUB_CONTROL,
        aggregateId: ended.value.id,
        aggregateVersion: ended.value.version,
        eventType: IdentityEventType.CLUB_CONTROL_ENDED,
        payload: { clubId: ended.value.clubId, reason: input.reason },
      });

      // Sair do clube põe a conta de castigo no mundo (R-25). O cooldown é
      // atributo da participação, não agregado — 1 por (conta, mundo).
      const participant = await repositories.participants.findParticipantById(
        input.gameWorldId,
        ended.value.worldParticipantId,
      );
      if (participant === null) return succeed(ended.value);

      const holder = WorldParticipant.fromSnapshot(participant);
      if (!holder.ok) return holder;
      const cooled = holder.value.startCooldown(addDays(input.occurredOn, input.cooldownDays));
      if (!cooled.ok) return cooled;
      if (cooled.value.version === participant.version) return succeed(ended.value);

      await repositories.participants.saveParticipant(cooled.value, participant.version);
      await emit(repositories, input, cooled.value, {
        aggregateType: AggregateType.WORLD_PARTICIPANT,
        aggregateId: cooled.value.id,
        aggregateVersion: cooled.value.version,
        eventType: IdentityEventType.COOLDOWN_STARTED,
        payload: { untilOn: cooled.value.cooldownUntilOn },
      });
      return succeed(ended.value);
    });
  }
}

/**
 * Trocar de clube é reservar outro — o cooldown de quem saiu é que decide se
 * pode. O controle atual (se houver) é encerrado antes, pelo `EndClubControl`.
 */
export class RequestClubSwitch {
  public constructor(private readonly unitOfWork: IdentityUnitOfWork) {}

  public execute(
    input: ReserveClubInput,
  ): Promise<Result<ClubEntryReservationSnapshot, DomainError>> {
    return new ReserveClub(this.unitOfWork).execute(input);
  }
}

// ─── auxiliares ──────────────────────────────────────────────────────────────

/**
 * Uma falha de DOMÍNIO tem de desfazer a transação — senão a escrita parcial
 * fica. Prisma só desfaz por exceção, então empacotamos o erro, lançamos, e
 * desempacotamos fora. O `Result` do chamador não muda.
 */
class Rollback extends Error {
  public constructor(public readonly domainError: DomainError) {
    super(domainError.message);
  }
}

async function run<T>(
  unitOfWork: IdentityUnitOfWork,
  work: (repositories: IdentityRepositories) => Promise<Result<T, DomainError>>,
): Promise<Result<T, DomainError>> {
  try {
    return await unitOfWork.run(async (repositories) => {
      const result = await work(repositories);
      if (!result.ok) throw new Rollback(result.error);
      return result;
    });
  } catch (error) {
    if (error instanceof Rollback) return fail(error.domainError);
    throw error;
  }
}

async function activeParticipant(
  repositories: IdentityRepositories,
  input: { gameWorldId: string; accountId: string },
): Promise<Result<WorldParticipantSnapshot, DomainError>> {
  const participant = await repositories.participants.findParticipantByAccount(
    input.gameWorldId,
    input.accountId,
  );
  if (participant === null || participant.status !== "ACTIVE") {
    return fail(
      new DomainError(
        "PARTICIPATION_NOT_FOUND",
        "A conta não participa deste mundo.",
        { accountId: input.accountId },
      ),
    );
  }
  return succeed(participant);
}

/**
 * A vaga está tomada por reserva ainda retida OU por controle ativo.
 *
 * Esta é a invariante que NÃO virou constraint: ela cruza dois agregados, e o
 * `world-identity.ts:573` só a resolvia com tudo em memória. Aqui ela é uma
 * checagem — e a palavra final continua sendo do índice único parcial do
 * `ClubControl`, na hora de confirmar. A reserva é retenção mole com prazo
 * (R-25); a vaga só é tomada de fato quando o controle nasce.
 */
async function clubIsTaken(
  repositories: IdentityRepositories,
  gameWorldId: string,
  clubId: string,
): Promise<Result<true, DomainError>> {
  const held = await repositories.reservations.findHeldReservationForClub(
    gameWorldId,
    clubId,
  );
  if (held !== null) {
    // Reserva de outro é retenção MOLE com prazo (R-25): o clube pode voltar em
    // minutos. É diferente de ter dono.
    return fail(
      new DomainError("CLUB_SLOT_UNAVAILABLE", "O clube já está reservado.", { clubId }),
    );
  }
  const control = await repositories.controls.findActiveControlForClub(
    gameWorldId,
    clubId,
  );
  if (control !== null && control.status === ControlStatus.ACTIVE) {
    return fail(
      new DomainError("CLUB_ALREADY_CONTROLLED", "O clube já tem gestor.", { clubId }),
    );
  }
  return succeed(true);
}

async function emit(
  repositories: IdentityRepositories,
  context: { gameWorldId: string; worldSeed: string; occurredOn: string; correlationId?: string },
  subject: { id: string },
  event: {
    aggregateType: (typeof AggregateType)[keyof typeof AggregateType];
    aggregateId: string;
    aggregateVersion: number;
    eventType: (typeof IdentityEventType)[keyof typeof IdentityEventType];
    payload: Readonly<Record<string, unknown>>;
  },
): Promise<void> {
  await repositories.events.append([
    identityEvent({
      // Determinístico: reprocessar o mesmo comando produz o mesmo eventId, e o
      // unique do log recusa o duplicado em vez de bifurcar a história.
      eventId: deterministicUuidV7({
        worldSeed: context.worldSeed,
        context: `identity-event:${event.eventType}:${event.aggregateId}:${event.aggregateVersion}`,
        timestampMilliseconds: timestampOf(context.occurredOn),
      }),
      gameWorldId: context.gameWorldId,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      aggregateVersion: event.aggregateVersion,
      eventType: event.eventType,
      payload: event.payload,
      occurredOn: context.occurredOn,
      actorId: null,
      correlationId: context.correlationId ?? null,
      causationId: null,
    }),
  ]);
}

/** Aritmética de data do mundo (R-177). Sem relógio de máquina. */
function addDays(worldDate: string, days: number): string {
  const date = new Date(`${worldDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
