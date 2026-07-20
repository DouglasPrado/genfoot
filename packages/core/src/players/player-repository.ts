import type { GameWorldId } from "@grinta/shared";

import type { PlayerId } from "../genesis/genesis-types.js";

import type {
  PersonLifecycleSnapshot,
  PlayerLifecycleSnapshot,
} from "./player-lifecycle-types.js";

/**
 * O agregado do jogador tal como ele atravessa a fronteira: o jogador **e** a
 * pessoa.
 *
 * `Person` viaja junto porque é 1:1 com `Player` (`personId @unique`) e não se
 * grava um sem o outro — a FK do banco recusa. Ela tem coluna `version`, o que
 * pela régua de R-187 sugeriria um root; mas o segundo teste, a CONTENÇÃO
 * (R-183), ela não passa: ninguém disputa a pessoa em paralelo com o jogador
 * dela. Fica dentro.
 *
 * Ressalva registrada: `Person` também pendura `StaffMember` (`schema.prisma`),
 * e quando a comissão técnica existir vale reexaminar — uma pessoa é jogador OU
 * membro de comissão, nunca os dois ao mesmo tempo, então a contenção segue
 * ausente, mas o dono da linha muda de contexto.
 */
export interface PlayerAggregateSnapshot {
  readonly player: PlayerLifecycleSnapshot;
  readonly person: PersonLifecycleSnapshot;
}

/**
 * O repositório de C4 — um agregado por JOGADOR (R-175).
 *
 * O que isto NÃO é: o `WorldPlayerLifecycleSnapshot` que o domínio tinha —
 * pessoas, jogadores, eventos de geração, histórico e casos médicos do mundo
 * inteiro num objeto só, com `revision` (`player-lifecycle-types.ts:226`). Um
 * mundo tem 368 jogadores na largada; carregar os 368 para treinar um é o
 * mega-agregado que a R-175 matou, e `revision` era a fila única que fazia dois
 * treinos concorrentes em jogadores diferentes brigarem por nada.
 *
 * A pessoa viaja junto do jogador de propósito: `Person` é 1:1 com `Player`
 * (`schema.prisma:1290`, `personId @unique`) e ninguém a disputa
 * separadamente — pela régua de R-183/R-187 (contenção + `version`), ela é
 * entidade dentro do agregado, não root.
 */
export interface PlayerRepository {
  findPlayerById(
    gameWorldId: GameWorldId,
    playerId: PlayerId,
  ): Promise<PlayerAggregateSnapshot | null>;

  /**
   * `expectedVersion === null` = criação. Qualquer outro valor é concorrência
   * otimista por agregado: se a versão mudou por baixo, a escrita falha.
   */
  savePlayer(
    snapshot: PlayerAggregateSnapshot,
    expectedVersion: number | null,
  ): Promise<void>;

  /**
   * Decai a FORMA de todos os jogadores do mundo em direção ao neutro (0) por
   * `days` dias (R-221 Fase 2b): a forma sara sozinha com o tempo. Atualização em
   * massa — a forma é um stat transiente, não um agregado disputado; rodá-la por
   * jogador seria caro e sem ganho. Idempotente no sentido de que decair 0 dias é
   * no-op e a forma nunca cruza o neutro.
   */
  decayForma(gameWorldId: GameWorldId, days: number): Promise<void>;

  /**
   * Move a FORMA de todo o elenco FIRST_TEAM de um clube por `delta` (± ),
   * tetada em ±FORM_MAX (R-221 Fase 2c — team-talk). Em massa, como a decayForma:
   * a conversa com o elenco é um efeito de time, não um agregado por vez.
   */
  nudgeClubForma(
    gameWorldId: GameWorldId,
    clubId: string,
    delta: number,
  ): Promise<void>;
}

