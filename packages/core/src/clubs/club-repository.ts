import type { GameWorldId } from "@grinta/shared";

import type { ClubId } from "../genesis/genesis-types.js";
import type {
  ClubCommandReceipt,
  ClubSnapshot,
  WorldClubPortfolioSnapshot,
} from "./club-types.js";

/**
 * A porta do clube (R-175): um agregado, um clube — não "o portfólio do mundo".
 *
 * `ClubPortfolioRepository` (abaixo) carrega TODOS os clubes do mundo para
 * mexer em um, e serializa todo o C3 numa revisão só. `Club` já é agregado no
 * domínio, com invariantes próprias e `version` próprio: aqui não há reescrita
 * do domínio, só a porta que faltava para ele falar direto com o banco.
 *
 * Sem `findAll`: quem precisa varrer clubes precisa de um modelo de leitura,
 * não da porta de escrita. A porta estreita é de propósito.
 */
export interface ClubRepository {
  findClubById(
    gameWorldId: GameWorldId,
    clubId: ClubId,
  ): Promise<ClubSnapshot | null>;
  saveClub(snapshot: ClubSnapshot, expectedVersion: number | null): Promise<void>;
}

/** @deprecated Mega-agregado do JSON. Some conforme C3 migra para `ClubRepository`. */
export interface ClubPortfolioRepository {
  findClubPortfolioByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldClubPortfolioSnapshot | null>;
  findClubCommandReceipt(
    gameWorldId: GameWorldId,
    idempotencyKey: string,
  ): Promise<ClubCommandReceipt | null>;
  saveClubPortfolio(
    snapshot: WorldClubPortfolioSnapshot,
    expectedRevision: number | null,
  ): Promise<void>;
}
