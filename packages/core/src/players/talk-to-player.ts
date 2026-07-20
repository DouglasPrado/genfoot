import { DomainError, fail, succeed, type Result } from "@grinta/shared";
import type { GameWorldId } from "@grinta/shared";

import type { PlayerId } from "../genesis/genesis-types.js";

import { Player } from "./player.js";
import type { PlayerRepository } from "./player-repository.js";

/**
 * Conversa do treinador com o jogador — a DECISÃO que move a FORMA (R-221 Fase
 * 2c). Fecha o terceiro motor do atributo vivo: treino move o núcleo (2a), a
 * partida move a forma (2b), a decisão move a forma (aqui).
 *
 * Elogiar embala (+forma); criticar cobra (−forma). Determinístico e simples: o
 * risco/personalidade (uma crítica que sai pela culatra) é refinamento, não esta
 * fatia. Aplica pelo agregado (`Player.applyMatchForm` é um delta de forma
 * genérico, tetado em ±FORM_MAX) e a forma decai sozinha com o tempo (2b).
 *
 * Magnitudes são calibração minha (VAL-001), não constante de doc.
 */
export const TalkStance = {
  PRAISE: "PRAISE",
  CRITICIZE: "CRITICIZE",
} as const;
export type TalkStance = (typeof TalkStance)[keyof typeof TalkStance];

/** Quanto cada postura move a forma. */
const STANCE_FORM: Record<TalkStance, number> = {
  PRAISE: 3,
  CRITICIZE: -3,
};

export interface TalkToPlayerInput {
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly playerId: string;
  readonly stance: TalkStance;
}

export interface TalkToPlayerResult {
  readonly playerId: string;
  readonly formaModifier: number;
}

export class TalkToPlayer {
  public constructor(private readonly players: PlayerRepository) {}

  public async execute(
    input: TalkToPlayerInput,
  ): Promise<Result<TalkToPlayerResult, DomainError>> {
    const delta = STANCE_FORM[input.stance];
    if (delta === undefined) {
      return fail(
        new DomainError("INVALID_TALK_STANCE", "Postura de conversa inválida.", {
          stance: input.stance,
        }),
      );
    }

    const snapshot = await this.players.findPlayerById(
      input.gameWorldId as GameWorldId,
      input.playerId as PlayerId,
    );
    if (snapshot === null) {
      return fail(
        new DomainError("PLAYER_NOT_FOUND", "Jogador não encontrado.", {
          playerId: input.playerId,
        }),
      );
    }

    const loaded = Player.fromSnapshot(snapshot.player);
    if (!loaded.ok) return loaded;
    const player = loaded.value;

    player.applyMatchForm(delta);

    await this.players.savePlayer(
      { player: player.snapshot(), person: snapshot.person },
      snapshot.player.version,
    );

    return succeed({
      playerId: input.playerId,
      formaModifier: player.formaModifier,
    });
  }
}
