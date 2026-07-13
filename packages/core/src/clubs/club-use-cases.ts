import {
  DomainError,
  fail,
  succeed,
  type GameWorldId,
  type Result,
} from "@grinta/shared";

import type { WorldGenesisSnapshot } from "../genesis/genesis-types.js";
import type { GameWorldSnapshot } from "../world/world-types.js";
import { buildClubPortfolioFromGenesis } from "./club-bootstrap.js";
import type { ClubPortfolioRepository } from "./club-repository.js";
import type {
  ClubCommand,
  ClubCommandReceipt,
  ClubSnapshot,
  SquadSnapshot,
  WorldClubPortfolioSnapshot,
} from "./club-types.js";
import { WorldClubPortfolio } from "./world-club-portfolio.js";

export class InitializeClubPortfolio {
  public constructor(private readonly repository: ClubPortfolioRepository) {}

  public async execute(
    world: GameWorldSnapshot,
    genesis: WorldGenesisSnapshot,
  ): Promise<Result<WorldClubPortfolioSnapshot, DomainError>> {
    if (world.id !== genesis.gameWorldId) {
      return fail(
        new DomainError("CLUB_WORLD_MISMATCH", "Gênese fora do mundo."),
      );
    }
    const existing = await this.repository.findClubPortfolioByWorldId(world.id);
    if (existing !== null) {
      const loaded = WorldClubPortfolio.fromSnapshot(existing);
      return loaded.ok ? succeed(loaded.value.snapshot()) : loaded;
    }
    const snapshot = buildClubPortfolioFromGenesis(world, genesis);
    const loaded = WorldClubPortfolio.fromSnapshot(snapshot);
    if (!loaded.ok) return loaded;
    await this.repository.saveClubPortfolio(snapshot, null);
    return succeed(snapshot);
  }
}

export class ExecuteClubCommand {
  public constructor(private readonly repository: ClubPortfolioRepository) {}

  public async execute(
    command: ClubCommand,
  ): Promise<Result<ClubCommandReceipt, DomainError>> {
    const snapshot = await this.repository.findClubPortfolioByWorldId(
      command.gameWorldId,
    );
    if (snapshot === null) {
      return fail(
        new DomainError(
          "CLUB_PORTFOLIO_NOT_FOUND",
          "O portfólio de clubes não foi inicializado.",
        ),
      );
    }
    const loaded = WorldClubPortfolio.fromSnapshot(snapshot);
    if (!loaded.ok) return loaded;
    const result = loaded.value.execute(command);
    if (!result.ok) return result;
    if (loaded.value.snapshot().revision !== snapshot.revision) {
      await this.repository.saveClubPortfolio(
        loaded.value.snapshot(),
        snapshot.revision,
      );
    }
    return result;
  }
}

export class InspectClubPortfolio {
  public constructor(private readonly repository: ClubPortfolioRepository) {}

  public async world(
    gameWorldId: GameWorldId,
  ): Promise<Result<WorldClubPortfolioSnapshot, DomainError>> {
    const snapshot =
      await this.repository.findClubPortfolioByWorldId(gameWorldId);
    return snapshot === null
      ? fail(
          new DomainError(
            "CLUB_PORTFOLIO_NOT_FOUND",
            "Portfólio não encontrado.",
          ),
        )
      : succeed(snapshot);
  }

  public async club(
    gameWorldId: GameWorldId,
    clubId: string,
  ): Promise<
    Result<
      Readonly<{ club: ClubSnapshot; squad: SquadSnapshot | null }>,
      DomainError
    >
  > {
    const world = await this.world(gameWorldId);
    if (!world.ok) return world;
    const club = world.value.clubs.find(({ id }) => id === clubId);
    if (club === undefined) {
      return fail(new DomainError("CLUB_NOT_FOUND", "Clube não encontrado."));
    }
    return succeed({
      club,
      squad:
        world.value.squads.find((squad) => squad.clubId === club.id) ?? null,
    });
  }
}
