import type { GameWorldId } from "@grinta/shared";

import type { ClubId } from "../genesis/genesis-types.js";
import type { ClubSnapshot } from "./club-types.js";

/**
 * A porta do clube (R-175): um agregado, um clube.
 *
 * Substitui o `ClubPortfolioRepository`, que carregava TODOS os clubes do mundo
 * para mexer em um e serializava todo o C3 numa revisão só. Ele morreu com o
 * `WorldClubPortfolio`.
 *
 * Sem `findAll`: quem precisa varrer clubes precisa de um modelo de leitura, não
 * da porta de escrita. A porta estreita é de propósito.
 */
export interface ClubRepository {
  findClubById(
    gameWorldId: GameWorldId,
    clubId: ClubId,
  ): Promise<ClubSnapshot | null>;
  saveClub(snapshot: ClubSnapshot, expectedVersion: number | null): Promise<void>;
}
