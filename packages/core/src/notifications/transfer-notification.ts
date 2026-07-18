import {
  deterministicUuidV7,
  timestampOf,
} from "../foundation/deterministic-uuid.js";

import {
  NotificationType,
  type NotificationItemSnapshot,
} from "./notification-types.js";

export interface TransferNotificationInput {
  readonly gameWorldId: string;
  readonly worldSeed: string;
  readonly buyingClubId: string;
  readonly playerId: string;
  readonly playerName: string;
  readonly feeMinor: bigint;
  readonly occurredOn: string;
}

/**
 * A notificação de que o clube fechou uma contratação (C12). Club-scoped
 * (`userId = null`): a pendência é do clube, e quem o gere a vê. Id determinístico
 * pelo fato ⇒ reprocessar não duplica. Prioridade média (3): é fato consumado,
 * não uma decisão que expira.
 */
export function buildTransferNotification(
  input: TransferNotificationInput,
): NotificationItemSnapshot {
  const reais = Number(input.feeMinor) / 100;
  return {
    id: deterministicUuidV7({
      worldSeed: input.worldSeed,
      context: `${input.gameWorldId}:notification:transfer:${input.playerId}:${input.occurredOn}`,
      timestampMilliseconds: timestampOf(input.occurredOn),
    }),
    gameWorldId: input.gameWorldId as never,
    userId: null,
    clubId: input.buyingClubId,
    type: NotificationType.TRANSFER_OFFER,
    title: "Contratação concluída",
    message: `${input.playerName} assinou por ${formatReais(reais)}.`,
    priority: 3,
    createdOn: input.occurredOn,
  };
}

function formatReais(reais: number): string {
  return `R$ ${reais.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
