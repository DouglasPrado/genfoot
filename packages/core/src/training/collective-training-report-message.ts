/**
 * O aviso IN-APP do treino COLETIVO na virada — um RESUMO por clube/dia (não um
 * por jogador, para não virar spam). Fecha a lacuna que o dono viu: o plano
 * coletivo evolui, mas não notificava (só a sessão notificava).
 */
import {
  deterministicUuidV7,
  timestampOf,
} from "../foundation/deterministic-uuid.js";

import {
  NotificationType,
  type NotificationItemSnapshot,
} from "../notifications/notification-types.js";

export interface CollectiveTrainingNotificationInput {
  readonly gameWorldId: string;
  readonly worldSeed: string;
  readonly clubId: string;
  /** Quantos jogadores evoluíram no plano coletivo nesta virada. */
  readonly developedCount: number;
  readonly worldDate: string;
}

export function buildCollectiveTrainingNotification(
  input: CollectiveTrainingNotificationInput,
): NotificationItemSnapshot {
  const n = input.developedCount;
  return {
    id: deterministicUuidV7({
      worldSeed: input.worldSeed,
      context: `${input.gameWorldId}:notification:collective-training:${input.clubId}:${input.worldDate}`,
      timestampMilliseconds: timestampOf(input.worldDate),
    }),
    gameWorldId: input.gameWorldId as never,
    userId: null,
    clubId: input.clubId,
    type: NotificationType.TRAINING_REPORT,
    title: "Treino do elenco",
    message:
      n === 1
        ? "1 jogador evoluiu no treino coletivo."
        : `${n} jogadores evoluíram no treino coletivo.`,
    priority: 2,
    createdOn: input.worldDate,
  };
}
