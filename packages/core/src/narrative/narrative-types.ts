import type { GameWorldId } from "@grinta/shared";

/**
 * C11 — imprensa e narrativa. A imprensa NARRA fatos reais, nunca inventa
 * (doc 11 §10). VERTICAL A: a transferência (um fato real do mundo) vira uma
 * manchete, no mesmo commit do fato — narração e fato nascem juntos.
 *
 * O que isto ainda NÃO é: a máquina de pautas da IA (§10, conduzida pela IA de
 * imprensa/torcida), as narrativas que acumulam reputação (§11), as 8 posturas
 * de comunicação (R-71). Aqui a imprensa relata o que aconteceu; a curadoria e o
 * efeito sobre torcida/reputação são o próximo passo.
 */
export const NarrativeType = {
  FAN_PRESSURE: "FAN_PRESSURE",
  MEDIA_RUMOR: "MEDIA_RUMOR",
  PLAYER_UNHAPPY: "PLAYER_UNHAPPY",
  BOARD_PRESSURE: "BOARD_PRESSURE",
  DERBY_HYPE: "DERBY_HYPE",
  TITLE_RACE: "TITLE_RACE",
  RELEGATION_RISK: "RELEGATION_RISK",
  TRANSFER_SPECULATION: "TRANSFER_SPECULATION",
  COMEBACK_STORY: "COMEBACK_STORY",
} as const;

export type NarrativeType =
  (typeof NarrativeType)[keyof typeof NarrativeType];

export interface NarrativeItemSnapshot {
  readonly id: string;
  readonly gameWorldId: GameWorldId;
  readonly clubId: string | null;
  readonly playerId: string | null;
  readonly type: NarrativeType;
  readonly title: string;
  readonly description: string;
  /** Intensidade 1–5 (peso da manchete no feed). */
  readonly intensity: number;
  readonly occurredOn: string;
}

/** Uma manchete como a tela a lê (M-25 / feed de imprensa). */
export interface NarrativeFeedItem {
  readonly id: string;
  readonly clubId: string | null;
  readonly type: NarrativeType;
  readonly title: string;
  readonly description: string;
  readonly intensity: number;
  readonly occurredOn: string;
}

export interface NarrativeFeedView {
  readonly items: readonly NarrativeFeedItem[];
}

export interface NarrativeRepository {
  /**
   * Acrescenta uma manchete. Idempotente por `id` (determinístico pelo fato):
   * reprocessar o mesmo fato não duplica a notícia.
   */
  append(item: NarrativeItemSnapshot): Promise<void>;
}

export interface NarrativeReadModel {
  /** As manchetes mais recentes do mundo, mais nova primeiro. */
  recentForWorld(
    gameWorldId: GameWorldId,
    limit: number,
  ): Promise<NarrativeFeedView>;
}
