import type { GameWorldId } from "@grinta/shared";

/**
 * C12 — inbox e notificações. VERTICAL A: a transferência escreve uma
 * notificação para o clube comprador (a pendência "você contratou fulano"), no
 * mesmo commit do fato. A tela da home já lê o RESUMO (`openNotificationCount`,
 * `timelineCount`); esta é a fonte dele.
 *
 * `NARRATIVE` (C11) é imprensa PÚBLICA — o mundo inteiro vê a manchete. A
 * `Notification` é PESSOAL do clube: a caixa de entrada do técnico. São coisas
 * diferentes nascidas do mesmo fato.
 *
 * O que isto ainda NÃO é: as threads/deep-links da MF-0B, o mark-as-read (um
 * command), a prioridade fina, os outros geradores (partida, board, finanças).
 * Aqui a notificação é club-scoped e imutável; o resto do inbox vem depois.
 */
export const NotificationType = {
  MATCH_EVENT: "MATCH_EVENT",
  MATCH_DECISION_POINT: "MATCH_DECISION_POINT",
  TRANSFER_OFFER: "TRANSFER_OFFER",
  CONTRACT_ALERT: "CONTRACT_ALERT",
  INJURY_ALERT: "INJURY_ALERT",
  FINANCE_ALERT: "FINANCE_ALERT",
  FAN_REACTION: "FAN_REACTION",
  BOARD_MESSAGE: "BOARD_MESSAGE",
  COMPETITION_UPDATE: "COMPETITION_UPDATE",
  SCOUT_REPORT: "SCOUT_REPORT",
  TRAINING_REPORT: "TRAINING_REPORT",
} as const;

export type NotificationType =
  (typeof NotificationType)[keyof typeof NotificationType];

export interface NotificationItemSnapshot {
  readonly id: string;
  readonly gameWorldId: GameWorldId;
  /** O usuário-alvo, quando pessoal. `null` = notificação do CLUBE (quem o gerir). */
  readonly userId: string | null;
  readonly clubId: string | null;
  readonly type: NotificationType;
  readonly title: string;
  readonly message: string;
  readonly priority: number;
  readonly createdOn: string;
}

/** O resumo do inbox como a home o lê (M-HOME). */
export interface InboxSummary {
  /** Notificações não lidas — as PENDÊNCIAS do card da home. */
  readonly openNotificationCount: number;
  /** Total de eventos do período (por ora, todas as notificações do clube). */
  readonly timelineCount: number;
  /** Relatórios (scout/treino) — 0 até C8 existir. */
  readonly reportCount: number;
}

export interface NotificationRepository {
  /**
   * Acrescenta uma notificação. Idempotente por `id` determinístico (pelo fato):
   * reprocessar o mesmo fato não duplica a pendência.
   */
  append(item: NotificationItemSnapshot): Promise<void>;
}

/** Um item do inbox como a LISTA de avisos o mostra (título, corpo, quando). */
export interface InboxNotificationView {
  readonly id: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly message: string;
  readonly priority: number;
  readonly isRead: boolean;
  readonly createdOn: string;
}

export interface InboxReadModel {
  /**
   * O resumo do inbox dos clubes que o usuário controla. Club-scoped: a caixa de
   * entrada é do clube, e o técnico vê a dos clubes que gere.
   */
  summaryForClubs(
    gameWorldId: GameWorldId,
    clubIds: readonly string[],
  ): Promise<InboxSummary>;
  /** A LISTA de avisos de um clube (mais recentes primeiro), para a tela de avisos. */
  listForClub(
    gameWorldId: GameWorldId,
    clubId: string,
    limit?: number,
  ): Promise<readonly InboxNotificationView[]>;
}
