/**
 * Texto do aviso de treino completo — puro e testável, no mesmo espírito de
 * `transfer-notification` (o texto do fato vive no core). Serve os DOIS canais: o
 * push remoto (Expo, quando houver Apple Developer Program) e o aviso IN-APP
 * (model `Notification`, testável já). O envio/persistência é infra; aqui só se
 * monta o que o jogador lê.
 */
import {
  deterministicUuidV7,
  timestampOf,
} from "../foundation/deterministic-uuid.js";
import { attributeLabelPt } from "../players/attribute-labels.js";

import {
  NotificationType,
  type NotificationItemSnapshot,
} from "./notification-types.js";

/** O que uma habilidade rendeu, para o texto do aviso. */
export interface TrainingChangeText {
  readonly attributeCode: string;
  readonly before: number;
  readonly after: number;
}

export interface TrainingReportMessageInput {
  readonly playerName: string;
  readonly changes: readonly TrainingChangeText[];
}

export interface PushMessageText {
  readonly title: string;
  readonly body: string;
}

/**
 * "Kauã Martins completou o treino" / "Finalização 30→31 · Passe curto 40→41".
 * Lista as habilidades que subiram (before→after); se nenhuma subiu (teto/sem
 * headroom), diz que não rendeu.
 */
export function buildTrainingReportMessage(
  input: TrainingReportMessageInput,
): PushMessageText {
  const gained = input.changes.filter((c) => c.after > c.before);
  const body =
    gained.length > 0
      ? gained
          .map(
            (c) => `${attributeLabelPt(c.attributeCode)} ${c.before}→${c.after}`,
          )
          .join(" · ")
      : "sem ganho neste treino";
  return {
    title: `${input.playerName} completou o treino`,
    body,
  };
}

export interface TrainingReportNotificationInput {
  readonly gameWorldId: string;
  readonly worldSeed: string;
  readonly clubId: string;
  readonly playerId: string;
  readonly playerName: string;
  readonly changes: readonly TrainingChangeText[];
  readonly worldDate: string;
}

/**
 * A notificação IN-APP de treino completo (C12). Club-scoped (`userId = null`):
 * quem gere o clube a vê. Id determinístico pelo (jogador, dia) ⇒ resettlar não
 * duplica. Prioridade baixa (2): é fato consumado, não decisão que expira.
 */
export function buildTrainingReportNotification(
  input: TrainingReportNotificationInput,
): NotificationItemSnapshot {
  const text = buildTrainingReportMessage(input);
  return {
    id: deterministicUuidV7({
      worldSeed: input.worldSeed,
      context: `${input.gameWorldId}:notification:training:${input.playerId}:${input.worldDate}`,
      timestampMilliseconds: timestampOf(input.worldDate),
    }),
    gameWorldId: input.gameWorldId as never,
    userId: null,
    clubId: input.clubId,
    type: NotificationType.TRAINING_REPORT,
    title: text.title,
    message: text.body,
    priority: 2,
    createdOn: input.worldDate,
  };
}
