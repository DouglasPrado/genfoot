import {
  DomainError,
  fail,
  succeed,
  type GameWorldId,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import type { GameWorldSnapshot } from "../world/world-types.js";
import type { MarketRepository } from "./market-repository.js";
import type {
  LoanAgreementSnapshot,
  MarketClubRef,
  MarketListingSnapshot,
  MarketPersonRef,
  MarketPlayerRef,
  MarketSummary,
  NegotiationSnapshot,
  PlayerContractSnapshot,
  PlayerLinkKind,
  ScoutingReportSnapshot,
  TransferAgreementSnapshot,
  WorldMarketSnapshot,
} from "./market-types.js";
import { WorldMarket } from "./world-market.js";

async function loadMarket(
  repository: MarketRepository,
  gameWorldId: GameWorldId,
): Promise<Result<WorldMarket, DomainError>> {
  const snapshot = await repository.findMarketByWorldId(gameWorldId);
  if (snapshot === null) {
    return fail(
      new DomainError(
        "MARKET_NOT_FOUND",
        "O mercado do mundo ainda não foi inicializado.",
        { gameWorldId },
      ),
    );
  }
  return WorldMarket.fromSnapshot(snapshot);
}

async function mutate<T>(
  repository: MarketRepository,
  gameWorldId: GameWorldId,
  apply: (market: WorldMarket) => Result<T, DomainError>,
): Promise<Result<T, DomainError>> {
  const loaded = await loadMarket(repository, gameWorldId);
  if (!loaded.ok) return loaded;
  const expectedRevision = loaded.value.snapshot().revision;
  const result = apply(loaded.value);
  if (!result.ok) return result;
  if (loaded.value.snapshot().revision !== expectedRevision) {
    await repository.saveMarket(loaded.value.snapshot(), expectedRevision);
  }
  return result;
}

export class InitializeMarket {
  public constructor(private readonly repository: MarketRepository) {}

  public async execute(
    world: GameWorldSnapshot,
  ): Promise<Result<WorldMarketSnapshot, DomainError>> {
    const existing = await this.repository.findMarketByWorldId(world.id);
    if (existing !== null) {
      const validated = WorldMarket.fromSnapshot(existing);
      return validated.ok ? succeed(validated.value.snapshot()) : validated;
    }
    const created = WorldMarket.initialize(world);
    if (!created.ok) return created;
    await this.repository.saveMarket(created.value.snapshot(), null);
    return succeed(created.value.snapshot());
  }
}

export class RequestScouting {
  public constructor(private readonly repository: MarketRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      playerId: MarketPlayerRef;
      observerClubId: MarketClubRef;
      scoutingCapacity: number;
      observations: readonly string[];
      validUntil: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<ScoutingReportSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (market) =>
      market.requestScouting(input),
    );
  }
}

export class OpenNegotiation {
  public constructor(private readonly repository: MarketRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      playerId: MarketPlayerRef;
      buyerClubId: MarketClubRef;
      sellerClubId: MarketClubRef;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<NegotiationSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (market) =>
      market.openNegotiation(input),
    );
  }
}

export class SubmitOffer {
  public constructor(private readonly repository: MarketRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      negotiationId: string;
      createdByClubId: MarketClubRef;
      feeMinor: number;
      wageMinor: number;
      contractYears: number;
      expiresOn: string;
      expectedVersion: number;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<NegotiationSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (market) =>
      market.submitOffer(input),
    );
  }
}

export class AcceptOffer {
  public constructor(private readonly repository: MarketRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      negotiationId: string;
      version: number;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<NegotiationSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (market) =>
      market.acceptOffer(input),
    );
  }
}

export class ActivateContract {
  public constructor(private readonly repository: MarketRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      personId: MarketPersonRef;
      playerId: MarketPlayerRef;
      clubId: MarketClubRef;
      feeMinor: number;
      wageMinor: number;
      startsOn: string;
      endsOn: string;
      kind: PlayerLinkKind;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<PlayerContractSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (market) =>
      market.activateContract(input),
    );
  }
}

export class TerminateContract {
  public constructor(private readonly repository: MarketRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      contractId: string;
      endedOn: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<PlayerContractSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (market) =>
      market.terminateContract(input),
    );
  }
}

export class PublishListing {
  public constructor(private readonly repository: MarketRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      playerId: MarketPlayerRef;
      sellerClubId: MarketClubRef;
      askingFeeMinor: number;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<MarketListingSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (market) =>
      market.publishListing(input),
    );
  }
}

export class CancelNegotiation {
  public constructor(private readonly repository: MarketRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      negotiationId: string;
      expired?: boolean;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<NegotiationSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (market) =>
      market.cancelNegotiation(input),
    );
  }
}

export class StartTransfer {
  public constructor(private readonly repository: MarketRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      negotiationId: string;
      sagaId: string;
      personId: MarketPersonRef;
      wageMinor: number;
      startsOn: string;
      endsOn: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<TransferAgreementSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (market) =>
      market.startTransfer(input),
    );
  }
}

export class AdvanceTransferStep {
  public constructor(private readonly repository: MarketRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      transferId: string;
      fencingToken: number;
      checkpointHash: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<TransferAgreementSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (market) =>
      market.advanceTransferStep(input),
    );
  }
}

export class CompensateTransfer {
  public constructor(private readonly repository: MarketRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      transferId: string;
      fencingToken: number;
      reason: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<TransferAgreementSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (market) =>
      market.compensateTransfer(input),
    );
  }
}

export class StartLoan {
  public constructor(private readonly repository: MarketRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      playerId: MarketPlayerRef;
      personId: MarketPersonRef;
      originClubId: MarketClubRef;
      destinationClubId: MarketClubRef;
      startsOn: string;
      endsOn: string;
      wageMinor: number;
      optionFeeMinor?: number;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<LoanAgreementSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (market) =>
      market.startLoan(input),
    );
  }
}

export class ExerciseLoanOption {
  public constructor(private readonly repository: MarketRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      loanId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<LoanAgreementSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (market) =>
      market.exerciseLoanOption(input),
    );
  }
}

export class ReturnLoanedPlayer {
  public constructor(private readonly repository: MarketRepository) {}

  public execute(
    gameWorldId: GameWorldId,
    input: Readonly<{
      loanId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Promise<Result<LoanAgreementSnapshot, DomainError>> {
    return mutate(this.repository, gameWorldId, (market) =>
      market.returnLoanedPlayer(input),
    );
  }
}

export class InspectMarket {
  public constructor(private readonly repository: MarketRepository) {}

  public async summary(
    gameWorldId: GameWorldId,
  ): Promise<Result<MarketSummary, DomainError>> {
    const loaded = await loadMarket(this.repository, gameWorldId);
    return loaded.ok ? succeed(loaded.value.summary()) : loaded;
  }

  public async world(
    gameWorldId: GameWorldId,
  ): Promise<Result<WorldMarketSnapshot, DomainError>> {
    const loaded = await loadMarket(this.repository, gameWorldId);
    return loaded.ok ? succeed(loaded.value.snapshot()) : loaded;
  }
}
