import type { GameWorldId } from "@grinta/shared";

import type { ClubId, SquadId } from "../genesis/genesis-types.js";

import type { SquadSnapshot } from "./club-types.js";

/**
 * O repositório do elenco (C3).
 *
 * O `Squad` é de C3 — "o elenco/hierarquia interna é dado do Clube/Estrutura"
 * (`12-context-map-e-blueprint.md:59`) —, não de C4. Um agregado por elenco: um
 * clube tem um elenco por temporada e categoria, e ninguém disputa o elenco de
 * um clube com outro.
 *
 * `findSquadByClub` busca o elenco vigente da PRIMEIRA equipe: é o que a gênese
 * checa para não duplicar, e o que a tela do elenco lê. Quando a base existir
 * (#34), o clube terá mais de um, e a busca ganha a categoria.
 */
export interface SquadRepository {
  findFirstTeamSquad(
    gameWorldId: GameWorldId,
    clubId: ClubId,
  ): Promise<SquadSnapshot | null>;

  findSquadById(
    gameWorldId: GameWorldId,
    squadId: SquadId,
  ): Promise<SquadSnapshot | null>;

  /** A base (YOUTH_ACADEMY) de um clube — para a promoção base→profissional (C8). */
  findYouthSquad(
    gameWorldId: GameWorldId,
    clubId: ClubId,
  ): Promise<SquadSnapshot | null>;

  /**
   * `expectedVersion === null` = criação. Qualquer outro valor é concorrência
   * otimista por agregado (R-175): a escrita reescreve os membros por completo
   * (deleteMany + createMany), como o adapter de clube faz com as coleções — um
   * elenco é o conjunto dos seus membros, não a soma incremental deles.
   */
  saveSquad(
    snapshot: SquadSnapshot,
    expectedVersion: number | null,
  ): Promise<void>;
}
