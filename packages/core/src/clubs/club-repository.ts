import type { GameWorldId } from "@grinta/shared";

import type {
  ClubCommandReceipt,
  WorldClubPortfolioSnapshot,
} from "./club-types.js";

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
