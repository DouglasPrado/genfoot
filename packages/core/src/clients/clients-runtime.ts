import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import {
  CommandTrackingSignal,
  CommandTrackingStatus,
  OfflineIntentStatus,
  RealtimeApply,
  type OfflineIntent,
  type RealtimeApplyResult,
} from "./clients-types.js";

/**
 * Whitelist offline enumerada e versionada: apenas ações reversíveis e de baixo
 * risco. Ausência da lista = proibido. Transferência, finanças, escalação final,
 * resultado e admin são explicitamente proibidos offline.
 */
export const OFFLINE_COMMAND_WHITELIST: readonly string[] = [
  "SET_LINEUP_DRAFT",
  "TOGGLE_TRAINING_FOCUS",
  "MARK_NOTIFICATION_READ",
  "DISMISS_NOTIFICATION",
  "ACKNOWLEDGE_MESSAGE",
];

export function isOfflineCommandAllowed(
  commandType: string,
  whitelist: readonly string[] = OFFLINE_COMMAND_WHITELIST,
): boolean {
  return whitelist.includes(commandType);
}

/**
 * Aplica um evento de realtime a um cursor por sequence: duplicata é ignorada,
 * um salto de sequence sinaliza GAP (buscar delta/snapshot) e o contíguo avança.
 */
export function classifyRealtimeEvent(
  lastSequence: number,
  eventSequence: number,
): RealtimeApplyResult {
  if (eventSequence <= lastSequence) {
    return { result: RealtimeApply.DUPLICATE, lastSequence };
  }
  if (eventSequence === lastSequence + 1) {
    return { result: RealtimeApply.APPLIED, lastSequence: eventSequence };
  }
  return { result: RealtimeApply.GAP, lastSequence };
}

/**
 * Máquina de tracking de command. O timeout nunca vira sucesso: leva a
 * UNKNOWN_RECOVERING até que o estado oficial (query/event) resolva.
 */
export function advanceCommandTracking(
  status: CommandTrackingStatus,
  signal: CommandTrackingSignal,
): Result<CommandTrackingStatus, DomainError> {
  const invalid = (): Result<CommandTrackingStatus, DomainError> =>
    fail(
      new DomainError(
        "INVALID_COMMAND_TRANSITION",
        "Transição de tracking inválida.",
        { status, signal },
      ),
    );
  switch (signal) {
    case CommandTrackingSignal.SUBMIT:
      return status === CommandTrackingStatus.DRAFT
        ? succeed(CommandTrackingStatus.SUBMITTING)
        : invalid();
    case CommandTrackingSignal.ACCEPT:
      return status === CommandTrackingStatus.SUBMITTING ||
        status === CommandTrackingStatus.UNKNOWN_RECOVERING
        ? succeed(CommandTrackingStatus.ACCEPTED)
        : invalid();
    case CommandTrackingSignal.APPLY:
      return status === CommandTrackingStatus.ACCEPTED ||
        status === CommandTrackingStatus.UNKNOWN_RECOVERING
        ? succeed(CommandTrackingStatus.APPLIED)
        : invalid();
    case CommandTrackingSignal.REJECT:
      return status === CommandTrackingStatus.SUBMITTING ||
        status === CommandTrackingStatus.ACCEPTED ||
        status === CommandTrackingStatus.UNKNOWN_RECOVERING
        ? succeed(CommandTrackingStatus.REJECTED)
        : invalid();
    case CommandTrackingSignal.TIMEOUT:
      return status === CommandTrackingStatus.SUBMITTING
        ? succeed(CommandTrackingStatus.UNKNOWN_RECOVERING)
        : invalid();
    default:
      return invalid();
  }
}

/**
 * Fila local de intents offline reversíveis. Enfileira apenas commands da
 * whitelist; ao reconectar, revalida por TTL e submete cada intent uma única vez.
 */
export class OfflineIntentQueue {
  private intents: OfflineIntent[] = [];

  public constructor(
    private readonly whitelist: readonly string[] = OFFLINE_COMMAND_WHITELIST,
  ) {}

  public enqueue(
    input: Readonly<{
      id: string;
      commandType: string;
      idempotencyKey: string;
      createdOn: string;
      expiresOn: string;
    }>,
  ): Result<OfflineIntent, DomainError> {
    if (!isOfflineCommandAllowed(input.commandType, this.whitelist)) {
      return fail(
        new DomainError(
          "COMMAND_FORBIDDEN_OFFLINE",
          "Command não permitido offline.",
          { commandType: input.commandType },
        ),
      );
    }
    const duplicate = this.intents.find(
      (intent) => intent.idempotencyKey === input.idempotencyKey,
    );
    if (duplicate !== undefined) return succeed(duplicate);
    if (input.expiresOn < input.createdOn) {
      return fail(
        new DomainError("INVALID_INTENT", "TTL do intent inválido."),
      );
    }
    const intent: OfflineIntent = {
      id: input.id,
      commandType: input.commandType,
      idempotencyKey: input.idempotencyKey,
      createdOn: input.createdOn,
      expiresOn: input.expiresOn,
      status: OfflineIntentStatus.QUEUED,
    };
    this.intents = [...this.intents, intent];
    return succeed(intent);
  }

  /**
   * Revalida a fila em `now`: intents vencidos expiram sem executar; os válidos
   * são submetidos uma única vez (mudam de QUEUED para SUBMITTED).
   */
  public revalidate(now: string): readonly OfflineIntent[] {
    const submitted: OfflineIntent[] = [];
    this.intents = this.intents.map((intent) => {
      if (intent.status !== OfflineIntentStatus.QUEUED) return intent;
      if (now > intent.expiresOn) {
        return { ...intent, status: OfflineIntentStatus.EXPIRED };
      }
      const next = { ...intent, status: OfflineIntentStatus.SUBMITTED };
      submitted.push(next);
      return next;
    });
    return submitted;
  }

  public snapshot(): readonly OfflineIntent[] {
    return this.intents;
  }
}
