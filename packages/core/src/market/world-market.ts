import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import type { GameWorldSnapshot } from "../world/world-types.js";
import {
  ContractStatus,
  ListingStatus,
  LinkStatus,
  LoanStatus,
  NegotiationStatus,
  PlayerLinkKind,
  TransferStatus,
  TransferStepStatus,
  type LoanActivatedEvent,
  type LoanAgreementSnapshot,
  type LoanPurchasedEvent,
  type LoanReturnedEvent,
  type MarketClubRef,
  type MarketDomainEvent,
  type MarketListingSnapshot,
  type MarketPersonRef,
  type MarketPlayerRef,
  type MarketSummary,
  type NegotiationExpiredEvent,
  type NegotiationSnapshot,
  type OfferAcceptedEvent,
  type OfferSnapshot,
  type OfferSubmittedEvent,
  type PlayerClubLinkChangedEvent,
  type PlayerClubLinkSnapshot,
  type PlayerContractActivatedEvent,
  type PlayerContractSnapshot,
  type ScoutingReportProducedEvent,
  type ScoutingReportSnapshot,
  type TransferAgreementSnapshot,
  type TransferCompensatedEvent,
  type TransferCompletedEvent,
  type TransferStartedEvent,
  type TransferStepSnapshot,
  type WorldMarketSnapshot,
} from "./market-types.js";

const MIN_SCOUTING_CAPACITY = 20;
const TRANSFER_STEPS = ["reserve", "register", "settle"] as const;

export class WorldMarket {
  private constructor(private state: WorldMarketSnapshot) {}

  public static initialize(
    world: GameWorldSnapshot,
  ): Result<WorldMarket, DomainError> {
    return WorldMarket.fromSnapshot({
      gameWorldId: world.id,
      rulesetVersion: world.rulesetVersion,
      scoutingReports: [],
      negotiations: [],
      contracts: [],
      links: [],
      events: [],
      revision: 1,
    });
  }

  public static fromSnapshot(
    snapshot: WorldMarketSnapshot,
  ): Result<WorldMarket, DomainError> {
    if (!Number.isSafeInteger(snapshot.revision) || snapshot.revision < 1) {
      return fail(invalidMarket("A revisão do mercado é inválida."));
    }
    const negotiationIds = new Set<string>();
    for (const negotiation of snapshot.negotiations) {
      if (
        negotiation.gameWorldId !== snapshot.gameWorldId ||
        negotiation.buyerClubId === negotiation.sellerClubId ||
        negotiation.currentVersion !== negotiation.offers.length ||
        negotiationIds.has(negotiation.id)
      ) {
        return fail(invalidMarket("Negociação inválida."));
      }
      negotiationIds.add(negotiation.id);
    }
    const contractIds = new Set<string>();
    for (const contract of snapshot.contracts) {
      if (
        contract.gameWorldId !== snapshot.gameWorldId ||
        contract.startsOn > contract.endsOn ||
        contract.feeMinor < 0 ||
        contract.wageMinor < 0 ||
        contractIds.has(contract.id)
      ) {
        return fail(invalidMarket("Contrato inválido."));
      }
      contractIds.add(contract.id);
    }
    let activePermanent = 0;
    for (const link of snapshot.links) {
      if (!contractIds.has(link.contractId)) {
        return fail(invalidMarket("Vínculo sem contrato válido."));
      }
      if (link.status === LinkStatus.ACTIVE) activePermanent += 1;
    }
    void activePermanent;
    for (const event of snapshot.events) {
      if (event.gameWorldId !== snapshot.gameWorldId) {
        return fail(invalidMarket("Evento de mercado inválido."));
      }
    }
    const listingIds = new Set<string>();
    for (const listing of snapshot.listings ?? []) {
      if (
        listing.gameWorldId !== snapshot.gameWorldId ||
        listingIds.has(listing.id) ||
        listing.askingFeeMinor < 0
      ) {
        return fail(invalidMarket("Listing inválida."));
      }
      listingIds.add(listing.id);
    }
    const transferIds = new Set<string>();
    for (const transfer of snapshot.transfers ?? []) {
      if (
        transfer.gameWorldId !== snapshot.gameWorldId ||
        transferIds.has(transfer.id) ||
        transfer.steps.length === 0 ||
        transfer.currentStep < 0 ||
        transfer.currentStep > transfer.steps.length ||
        (transfer.contractId !== null && !contractIds.has(transfer.contractId))
      ) {
        return fail(invalidMarket("Transferência inválida."));
      }
      transferIds.add(transfer.id);
    }
    const loanIds = new Set<string>();
    for (const loan of snapshot.loans ?? []) {
      if (
        loan.gameWorldId !== snapshot.gameWorldId ||
        loanIds.has(loan.id) ||
        !contractIds.has(loan.contractId)
      ) {
        return fail(invalidMarket("Empréstimo inválido."));
      }
      loanIds.add(loan.id);
    }
    return succeed(new WorldMarket(snapshot));
  }

  public requestScouting(
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
  ): Result<ScoutingReportSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const existing = this.state.scoutingReports.find(
      (report) => report.idempotencyKey === input.idempotencyKey,
    );
    if (existing !== undefined) return succeed(existing);
    if (
      !Number.isSafeInteger(input.scoutingCapacity) ||
      input.scoutingCapacity < MIN_SCOUTING_CAPACITY
    ) {
      return fail(
        new DomainError(
          "INSUFFICIENT_SCOUTING",
          "Capacidade de scouting insuficiente para produzir relatório.",
          { scoutingCapacity: input.scoutingCapacity },
        ),
      );
    }
    const validUntil = WorldDate.parse(input.validUntil);
    if (!validUntil.ok) return validUntil;
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const confidence = Math.min(100, input.scoutingCapacity);
    const reportId = deterministicUuidV7<"ScoutingReport">({
      worldSeed: input.worldSeed,
      context: `scouting-report:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(date.value.toString()),
    });
    const report: ScoutingReportSnapshot = {
      id: reportId,
      gameWorldId: this.state.gameWorldId,
      playerId: input.playerId,
      observerClubId: input.observerClubId,
      observations: [...input.observations],
      confidence,
      validUntil: validUntil.value.toString(),
      idempotencyKey: input.idempotencyKey,
    };
    const event: ScoutingReportProducedEvent = {
      id: this.eventId(input.worldSeed, `scouting-produced:${input.idempotencyKey}`, date.value.toString()),
      type: "ScoutingReportProduced",
      gameWorldId: this.state.gameWorldId,
      reportId,
      playerId: input.playerId,
      confidence,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      scoutingReports: [...this.state.scoutingReports, report],
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(report);
  }

  public openNegotiation(
    input: Readonly<{
      playerId: MarketPlayerRef;
      buyerClubId: MarketClubRef;
      sellerClubId: MarketClubRef;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<NegotiationSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const existing = this.state.negotiations.find(
      (negotiation) => negotiation.idempotencyKey === input.idempotencyKey,
    );
    if (existing !== undefined) return succeed(existing);
    if (input.buyerClubId === input.sellerClubId) {
      return fail(
        new DomainError(
          "INVALID_NEGOTIATION",
          "Comprador e vendedor devem ser clubes distintos.",
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const negotiationId = deterministicUuidV7<"Negotiation">({
      worldSeed: input.worldSeed,
      context: `negotiation:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(date.value.toString()),
    });
    const negotiation: NegotiationSnapshot = {
      id: negotiationId,
      gameWorldId: this.state.gameWorldId,
      playerId: input.playerId,
      buyerClubId: input.buyerClubId,
      sellerClubId: input.sellerClubId,
      status: NegotiationStatus.OPEN,
      currentVersion: 0,
      offers: [],
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      negotiations: [...this.state.negotiations, negotiation],
      revision: this.state.revision + 1,
    };
    return succeed(negotiation);
  }

  public submitOffer(
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
  ): Result<NegotiationSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const replay = this.findEvent("OfferSubmitted", input.idempotencyKey);
    if (replay !== undefined) {
      const negotiation = this.state.negotiations.find(
        ({ id }) => id === replay.negotiationId,
      );
      if (negotiation !== undefined) return succeed(negotiation);
    }
    const index = this.state.negotiations.findIndex(
      ({ id }) => id === input.negotiationId,
    );
    if (index < 0) return fail(negotiationNotFound(input.negotiationId));
    const negotiation = this.state.negotiations[index]!;
    if (isTerminal(negotiation.status)) {
      return fail(
        new DomainError(
          "NEGOTIATION_TERMINAL",
          "A negociação já foi encerrada.",
          { negotiationId: negotiation.id },
        ),
      );
    }
    if (input.expectedVersion !== negotiation.currentVersion) {
      return fail(staleOffer());
    }
    if (
      input.createdByClubId !== negotiation.buyerClubId &&
      input.createdByClubId !== negotiation.sellerClubId
    ) {
      return fail(
        new DomainError(
          "INVALID_NEGOTIATION",
          "A oferta deve vir de uma das partes.",
        ),
      );
    }
    if (
      !Number.isSafeInteger(input.feeMinor) ||
      input.feeMinor < 0 ||
      !Number.isSafeInteger(input.wageMinor) ||
      input.wageMinor < 0 ||
      !Number.isSafeInteger(input.contractYears) ||
      input.contractYears < 1
    ) {
      return fail(
        new DomainError("INVALID_OFFER", "Termos da oferta inválidos."),
      );
    }
    const expiresOn = WorldDate.parse(input.expiresOn);
    if (!expiresOn.ok) return expiresOn;
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const version = negotiation.currentVersion + 1;
    const offer: OfferSnapshot = {
      version,
      createdByClubId: input.createdByClubId,
      terms: {
        feeMinor: input.feeMinor,
        wageMinor: input.wageMinor,
        contractYears: input.contractYears,
      },
      expiresOn: expiresOn.value.toString(),
    };
    const updated: NegotiationSnapshot = {
      ...negotiation,
      status:
        input.createdByClubId === negotiation.buyerClubId
          ? NegotiationStatus.OFFERED
          : NegotiationStatus.COUNTERED,
      currentVersion: version,
      offers: [...negotiation.offers, offer],
    };
    const negotiations = [...this.state.negotiations];
    negotiations[index] = updated;
    const event: OfferSubmittedEvent = {
      id: this.eventId(input.worldSeed, `offer-submitted:${input.idempotencyKey}`, date.value.toString()),
      type: "OfferSubmitted",
      gameWorldId: this.state.gameWorldId,
      negotiationId: negotiation.id,
      version,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      negotiations,
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(updated);
  }

  public acceptOffer(
    input: Readonly<{
      negotiationId: string;
      version: number;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<NegotiationSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const replay = this.findEvent("OfferAccepted", input.idempotencyKey);
    if (replay !== undefined) {
      const negotiation = this.state.negotiations.find(
        ({ id }) => id === replay.negotiationId,
      );
      if (negotiation !== undefined) return succeed(negotiation);
    }
    const index = this.state.negotiations.findIndex(
      ({ id }) => id === input.negotiationId,
    );
    if (index < 0) return fail(negotiationNotFound(input.negotiationId));
    const negotiation = this.state.negotiations[index]!;
    if (isTerminal(negotiation.status) || negotiation.offers.length === 0) {
      return fail(
        new DomainError(
          "NEGOTIATION_TERMINAL",
          "A negociação não pode ser aceita neste estado.",
          { negotiationId: negotiation.id },
        ),
      );
    }
    if (input.version !== negotiation.currentVersion) {
      return fail(staleOffer());
    }
    const offer = negotiation.offers.find(
      (candidate) => candidate.version === input.version,
    )!;
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    if (date.value.toString() > offer.expiresOn) {
      return fail(
        new DomainError("OFFER_EXPIRED", "A oferta atual está expirada.", {
          negotiationId: negotiation.id,
          version: input.version,
        }),
      );
    }
    const updated: NegotiationSnapshot = {
      ...negotiation,
      status: NegotiationStatus.ACCEPTED,
    };
    const negotiations = [...this.state.negotiations];
    negotiations[index] = updated;
    const event: OfferAcceptedEvent = {
      id: this.eventId(input.worldSeed, `offer-accepted:${input.idempotencyKey}`, date.value.toString()),
      type: "OfferAccepted",
      gameWorldId: this.state.gameWorldId,
      negotiationId: negotiation.id,
      version: input.version,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      negotiations,
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(updated);
  }

  public activateContract(
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
  ): Result<PlayerContractSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const existing = this.state.contracts.find(
      (contract) => contract.idempotencyKey === input.idempotencyKey,
    );
    if (existing !== undefined) return succeed(existing);
    const startsOn = WorldDate.parse(input.startsOn);
    if (!startsOn.ok) return startsOn;
    const endsOn = WorldDate.parse(input.endsOn);
    if (!endsOn.ok) return endsOn;
    if (
      startsOn.value.toString() > endsOn.value.toString() ||
      !Number.isSafeInteger(input.feeMinor) ||
      input.feeMinor < 0 ||
      !Number.isSafeInteger(input.wageMinor) ||
      input.wageMinor < 0
    ) {
      return fail(
        new DomainError("INVALID_CONTRACT", "Datas ou valores inválidos."),
      );
    }
    const conflict = this.state.links.some(
      (link) =>
        link.status === LinkStatus.ACTIVE &&
        link.playerId === input.playerId &&
        link.effectiveStart <= endsOn.value.toString() &&
        startsOn.value.toString() <= link.effectiveEnd,
    );
    if (conflict) {
      return fail(
        new DomainError(
          "PLAYER_LINK_CONFLICT",
          "Já existe um vínculo ativo incompatível para o jogador no período.",
          { playerId: input.playerId },
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const contractId = deterministicUuidV7<"PlayerContract">({
      worldSeed: input.worldSeed,
      context: `player-contract:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(startsOn.value.toString()),
    });
    const contract: PlayerContractSnapshot = {
      id: contractId,
      gameWorldId: this.state.gameWorldId,
      personId: input.personId,
      playerId: input.playerId,
      clubId: input.clubId,
      feeMinor: input.feeMinor,
      wageMinor: input.wageMinor,
      startsOn: startsOn.value.toString(),
      endsOn: endsOn.value.toString(),
      kind: input.kind,
      status: ContractStatus.ACTIVE,
      idempotencyKey: input.idempotencyKey,
      version: 1,
    };
    const link: PlayerClubLinkSnapshot = {
      playerId: input.playerId,
      clubId: input.clubId,
      kind: input.kind,
      contractId,
      effectiveStart: startsOn.value.toString(),
      effectiveEnd: endsOn.value.toString(),
      status: LinkStatus.ACTIVE,
    };
    const contractEvent: PlayerContractActivatedEvent = {
      id: this.eventId(input.worldSeed, `contract-activated:${input.idempotencyKey}`, date.value.toString()),
      type: "PlayerContractActivated",
      gameWorldId: this.state.gameWorldId,
      contractId,
      playerId: input.playerId,
      clubId: input.clubId,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    const linkEvent: PlayerClubLinkChangedEvent = {
      id: this.eventId(input.worldSeed, `link-activated:${input.idempotencyKey}`, date.value.toString()),
      type: "PlayerClubLinkChanged",
      gameWorldId: this.state.gameWorldId,
      playerId: input.playerId,
      clubId: input.clubId,
      status: LinkStatus.ACTIVE,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      contracts: [...this.state.contracts, contract],
      links: [...this.state.links, link],
      events: [...this.state.events, contractEvent, linkEvent],
      revision: this.state.revision + 1,
    };
    return succeed(contract);
  }

  public terminateContract(
    input: Readonly<{
      contractId: string;
      endedOn: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<PlayerContractSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const index = this.state.contracts.findIndex(
      ({ id }) => id === input.contractId,
    );
    if (index < 0) {
      return fail(
        new DomainError("CONTRACT_NOT_FOUND", "Contrato não encontrado.", {
          contractId: input.contractId,
        }),
      );
    }
    const contract = this.state.contracts[index]!;
    if (contract.status === ContractStatus.TERMINATED) {
      return succeed(contract);
    }
    const endedOn = WorldDate.parse(input.endedOn);
    if (!endedOn.ok) return endedOn;
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const terminated: PlayerContractSnapshot = {
      ...contract,
      status: ContractStatus.TERMINATED,
      endsOn: endedOn.value.toString(),
      version: contract.version + 1,
    };
    const contracts = [...this.state.contracts];
    contracts[index] = terminated;
    const links = this.state.links.map((link) =>
      link.contractId === contract.id && link.status === LinkStatus.ACTIVE
        ? { ...link, status: LinkStatus.ENDED, effectiveEnd: endedOn.value.toString() }
        : link,
    );
    const linkEvent: PlayerClubLinkChangedEvent = {
      id: this.eventId(input.worldSeed, `link-ended:${input.idempotencyKey}`, date.value.toString()),
      type: "PlayerClubLinkChanged",
      gameWorldId: this.state.gameWorldId,
      playerId: contract.playerId,
      clubId: contract.clubId,
      status: LinkStatus.ENDED,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      contracts,
      links,
      events: [...this.state.events, linkEvent],
      revision: this.state.revision + 1,
    };
    return succeed(terminated);
  }

  public publishListing(
    input: Readonly<{
      playerId: MarketPlayerRef;
      sellerClubId: MarketClubRef;
      askingFeeMinor: number;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<MarketListingSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const listings = this.state.listings ?? [];
    const existing = listings.find(
      (listing) => listing.idempotencyKey === input.idempotencyKey,
    );
    if (existing !== undefined) return succeed(existing);
    if (
      !Number.isSafeInteger(input.askingFeeMinor) ||
      input.askingFeeMinor < 0
    ) {
      return fail(new DomainError("INVALID_LISTING", "Preço de venda inválido."));
    }
    const activeConflict = listings.some(
      (listing) =>
        listing.playerId === input.playerId &&
        listing.status === ListingStatus.ACTIVE,
    );
    if (activeConflict) {
      return fail(
        new DomainError(
          "PLAYER_LINK_CONFLICT",
          "Já existe uma listing ativa para o jogador.",
          { playerId: input.playerId },
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const listing: MarketListingSnapshot = {
      id: deterministicUuidV7<"MarketListing">({
        worldSeed: input.worldSeed,
        context: `listing:${input.idempotencyKey}`,
        timestampMilliseconds: timestampOf(date.value.toString()),
      }),
      gameWorldId: this.state.gameWorldId,
      playerId: input.playerId,
      sellerClubId: input.sellerClubId,
      askingFeeMinor: input.askingFeeMinor,
      status: ListingStatus.ACTIVE,
      idempotencyKey: input.idempotencyKey,
      version: 1,
    };
    this.state = {
      ...this.state,
      listings: [...listings, listing],
      revision: this.state.revision + 1,
    };
    return succeed(listing);
  }

  public cancelNegotiation(
    input: Readonly<{
      negotiationId: string;
      expired?: boolean;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<NegotiationSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const replay = this.findEvent("NegotiationExpired", input.idempotencyKey);
    if (replay !== undefined) {
      const negotiation = this.state.negotiations.find(
        ({ id }) => id === replay.negotiationId,
      );
      if (negotiation !== undefined) return succeed(negotiation);
    }
    const index = this.state.negotiations.findIndex(
      ({ id }) => id === input.negotiationId,
    );
    if (index < 0) return fail(negotiationNotFound(input.negotiationId));
    const negotiation = this.state.negotiations[index]!;
    if (isTerminal(negotiation.status)) {
      return fail(
        new DomainError(
          "NEGOTIATION_TERMINAL",
          "A negociação já foi encerrada.",
          { negotiationId: negotiation.id },
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const outcome = input.expired === true ? "EXPIRED" : "CANCELLED";
    const updated: NegotiationSnapshot = {
      ...negotiation,
      status:
        outcome === "EXPIRED"
          ? NegotiationStatus.EXPIRED
          : NegotiationStatus.CANCELLED,
    };
    const negotiations = [...this.state.negotiations];
    negotiations[index] = updated;
    const event: NegotiationExpiredEvent = {
      id: this.eventId(input.worldSeed, `negotiation-expired:${input.idempotencyKey}`, date.value.toString()),
      type: "NegotiationExpired",
      gameWorldId: this.state.gameWorldId,
      negotiationId: negotiation.id,
      outcome,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      negotiations,
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(updated);
  }

  public startTransfer(
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
  ): Result<TransferAgreementSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const transfers = this.state.transfers ?? [];
    const existing = transfers.find(
      (transfer) => transfer.idempotencyKey === input.idempotencyKey,
    );
    if (existing !== undefined) return succeed(existing);
    const negotiation = this.state.negotiations.find(
      ({ id }) => id === input.negotiationId,
    );
    if (negotiation === undefined) {
      return fail(negotiationNotFound(input.negotiationId));
    }
    if (negotiation.status !== NegotiationStatus.ACCEPTED) {
      return fail(
        new DomainError(
          "NEGOTIATION_NOT_ACCEPTED",
          "A transferência exige uma negociação aceita.",
          { negotiationId: negotiation.id, status: negotiation.status },
        ),
      );
    }
    const acceptedOffer = negotiation.offers.find(
      (offer) => offer.version === negotiation.currentVersion,
    )!;
    const startsOn = WorldDate.parse(input.startsOn);
    if (!startsOn.ok) return startsOn;
    const endsOn = WorldDate.parse(input.endsOn);
    if (!endsOn.ok) return endsOn;
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    if (
      startsOn.value.toString() > endsOn.value.toString() ||
      !Number.isSafeInteger(input.wageMinor) ||
      input.wageMinor < 0 ||
      input.sagaId.trim() === ""
    ) {
      return fail(new DomainError("INVALID_TRANSFER", "Termos da transferência inválidos."));
    }
    const transferId = deterministicUuidV7<"TransferAgreement">({
      worldSeed: input.worldSeed,
      context: `transfer:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(date.value.toString()),
    });
    const steps: TransferStepSnapshot[] = TRANSFER_STEPS.map((name, index) => ({
      index,
      name,
      status: TransferStepStatus.PENDING,
      checkpointHash: null,
    }));
    const transfer: TransferAgreementSnapshot = {
      id: transferId,
      gameWorldId: this.state.gameWorldId,
      negotiationId: negotiation.id,
      sagaId: input.sagaId,
      playerId: negotiation.playerId,
      personId: input.personId,
      fromClubId: negotiation.sellerClubId,
      toClubId: negotiation.buyerClubId,
      feeMinor: acceptedOffer.terms.feeMinor,
      wageMinor: input.wageMinor,
      startsOn: startsOn.value.toString(),
      endsOn: endsOn.value.toString(),
      status: TransferStatus.RUNNING,
      currentStep: 0,
      steps,
      fencingToken: 1,
      contractId: null,
      processedStepKeys: [],
      idempotencyKey: input.idempotencyKey,
      version: 1,
    };
    const event: TransferStartedEvent = {
      id: this.eventId(input.worldSeed, `transfer-started:${input.idempotencyKey}`, date.value.toString()),
      type: "TransferStarted",
      gameWorldId: this.state.gameWorldId,
      transferId,
      negotiationId: negotiation.id,
      playerId: negotiation.playerId,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      transfers: [...transfers, transfer],
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(transfer);
  }

  public advanceTransferStep(
    input: Readonly<{
      transferId: string;
      fencingToken: number;
      checkpointHash: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<TransferAgreementSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const transfers = this.state.transfers ?? [];
    const index = transfers.findIndex(({ id }) => id === input.transferId);
    if (index < 0) return fail(transferNotFound(input.transferId));
    const transfer = transfers[index]!;
    if (transfer.processedStepKeys.includes(input.idempotencyKey)) {
      return succeed(transfer);
    }
    if (transfer.status !== TransferStatus.RUNNING) {
      return fail(transferTerminal(transfer.id));
    }
    if (input.fencingToken !== transfer.fencingToken) {
      return fail(
        new DomainError("SAGA_FENCED", "Fencing token da transferência obsoleto.", {
          transferId: transfer.id,
          expected: transfer.fencingToken,
          received: input.fencingToken,
        }),
      );
    }
    if (input.checkpointHash.trim() === "") {
      return fail(new DomainError("INVALID_TRANSFER", "checkpointHash é obrigatório."));
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const stepIndex = transfer.currentStep;
    const steps = transfer.steps.map((step) =>
      step.index === stepIndex
        ? { ...step, status: TransferStepStatus.DONE, checkpointHash: input.checkpointHash }
        : step,
    );
    const nextStep = stepIndex + 1;
    const completed = nextStep >= steps.length;
    if (!completed) {
      const advanced: TransferAgreementSnapshot = {
        ...transfer,
        steps,
        currentStep: nextStep,
        processedStepKeys: [...transfer.processedStepKeys, input.idempotencyKey],
        version: transfer.version + 1,
      };
      this.replaceTransfer(index, advanced);
      this.state = { ...this.state, revision: this.state.revision + 1 };
      return succeed(advanced);
    }
    // etapa final: liquida criando contrato + vínculo permanente único
    const conflict = this.state.links.some(
      (link) =>
        link.status === LinkStatus.ACTIVE &&
        link.playerId === transfer.playerId &&
        link.effectiveStart <= transfer.endsOn &&
        transfer.startsOn <= link.effectiveEnd,
    );
    if (conflict) {
      return fail(
        new DomainError(
          "PLAYER_LINK_CONFLICT",
          "Já existe um vínculo ativo incompatível para o jogador.",
          { playerId: transfer.playerId },
        ),
      );
    }
    const built = this.buildContractAndLink({
      personId: transfer.personId,
      playerId: transfer.playerId,
      clubId: transfer.toClubId,
      feeMinor: transfer.feeMinor,
      wageMinor: transfer.wageMinor,
      startsOn: transfer.startsOn,
      endsOn: transfer.endsOn,
      kind: PlayerLinkKind.PERMANENT,
      idempotencyKey: `${input.idempotencyKey}:contract`,
      worldSeed: input.worldSeed,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
    });
    const settled: TransferAgreementSnapshot = {
      ...transfer,
      steps,
      currentStep: steps.length,
      status: TransferStatus.COMPLETED,
      contractId: built.contract.id,
      processedStepKeys: [...transfer.processedStepKeys, input.idempotencyKey],
      version: transfer.version + 1,
    };
    this.replaceTransfer(index, settled);
    const completedEvent: TransferCompletedEvent = {
      id: this.eventId(input.worldSeed, `transfer-completed:${input.idempotencyKey}`, date.value.toString()),
      type: "TransferCompleted",
      gameWorldId: this.state.gameWorldId,
      transferId: transfer.id,
      playerId: transfer.playerId,
      toClubId: transfer.toClubId,
      contractId: built.contract.id,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      contracts: [...this.state.contracts, built.contract],
      links: [...this.state.links, built.link],
      events: [...this.state.events, ...built.events, completedEvent],
      revision: this.state.revision + 1,
    };
    return succeed(settled);
  }

  public compensateTransfer(
    input: Readonly<{
      transferId: string;
      fencingToken: number;
      reason: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<TransferAgreementSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const replay = this.findEvent("TransferCompensated", input.idempotencyKey);
    if (replay !== undefined) {
      const found = (this.state.transfers ?? []).find(
        ({ id }) => id === replay.transferId,
      );
      if (found !== undefined) return succeed(found);
    }
    const transfers = this.state.transfers ?? [];
    const index = transfers.findIndex(({ id }) => id === input.transferId);
    if (index < 0) return fail(transferNotFound(input.transferId));
    const transfer = transfers[index]!;
    if (
      transfer.status === TransferStatus.COMPLETED ||
      transfer.status === TransferStatus.COMPENSATED
    ) {
      return fail(transferTerminal(transfer.id));
    }
    if (input.fencingToken !== transfer.fencingToken) {
      return fail(
        new DomainError("SAGA_FENCED", "Fencing token da transferência obsoleto.", {
          transferId: transfer.id,
        }),
      );
    }
    if (input.reason.trim() === "") {
      return fail(new DomainError("INVALID_TRANSFER", "reason é obrigatório."));
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const steps = transfer.steps.map((step) =>
      step.status === TransferStepStatus.DONE
        ? { ...step, status: TransferStepStatus.COMPENSATED }
        : step,
    );
    const compensated: TransferAgreementSnapshot = {
      ...transfer,
      steps,
      status: TransferStatus.COMPENSATED,
      version: transfer.version + 1,
    };
    this.replaceTransfer(index, compensated);
    const event: TransferCompensatedEvent = {
      id: this.eventId(input.worldSeed, `transfer-compensated:${input.idempotencyKey}`, date.value.toString()),
      type: "TransferCompensated",
      gameWorldId: this.state.gameWorldId,
      transferId: transfer.id,
      reason: input.reason,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(compensated);
  }

  public startLoan(
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
  ): Result<LoanAgreementSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const loans = this.state.loans ?? [];
    const existing = loans.find(
      (loan) => loan.idempotencyKey === input.idempotencyKey,
    );
    if (existing !== undefined) return succeed(existing);
    if (input.originClubId === input.destinationClubId) {
      return fail(new DomainError("INVALID_LOAN", "Origem e destino devem diferir."));
    }
    const startsOn = WorldDate.parse(input.startsOn);
    if (!startsOn.ok) return startsOn;
    const endsOn = WorldDate.parse(input.endsOn);
    if (!endsOn.ok) return endsOn;
    if (
      startsOn.value.toString() > endsOn.value.toString() ||
      !Number.isSafeInteger(input.wageMinor) ||
      input.wageMinor < 0 ||
      (input.optionFeeMinor !== undefined &&
        (!Number.isSafeInteger(input.optionFeeMinor) || input.optionFeeMinor < 0))
    ) {
      return fail(new DomainError("INVALID_LOAN", "Datas ou valores inválidos."));
    }
    const conflict = this.state.links.some(
      (link) =>
        link.status === LinkStatus.ACTIVE &&
        link.playerId === input.playerId &&
        link.effectiveStart <= endsOn.value.toString() &&
        startsOn.value.toString() <= link.effectiveEnd,
    );
    if (conflict) {
      return fail(
        new DomainError(
          "PLAYER_LINK_CONFLICT",
          "Já existe um vínculo ativo incompatível para o jogador.",
          { playerId: input.playerId },
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const built = this.buildContractAndLink({
      personId: input.personId,
      playerId: input.playerId,
      clubId: input.destinationClubId,
      feeMinor: 0,
      wageMinor: input.wageMinor,
      startsOn: startsOn.value.toString(),
      endsOn: endsOn.value.toString(),
      kind: PlayerLinkKind.LOAN,
      idempotencyKey: `${input.idempotencyKey}:contract`,
      worldSeed: input.worldSeed,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
    });
    const loanId = deterministicUuidV7<"LoanAgreement">({
      worldSeed: input.worldSeed,
      context: `loan:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(date.value.toString()),
    });
    const loan: LoanAgreementSnapshot = {
      id: loanId,
      gameWorldId: this.state.gameWorldId,
      playerId: input.playerId,
      personId: input.personId,
      originClubId: input.originClubId,
      destinationClubId: input.destinationClubId,
      startsOn: startsOn.value.toString(),
      endsOn: endsOn.value.toString(),
      optionFeeMinor: input.optionFeeMinor ?? null,
      status: LoanStatus.ACTIVE,
      contractId: built.contract.id,
      idempotencyKey: input.idempotencyKey,
      version: 1,
    };
    const event: LoanActivatedEvent = {
      id: this.eventId(input.worldSeed, `loan-activated:${input.idempotencyKey}`, date.value.toString()),
      type: "LoanActivated",
      gameWorldId: this.state.gameWorldId,
      loanId,
      playerId: input.playerId,
      destinationClubId: input.destinationClubId,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      contracts: [...this.state.contracts, built.contract],
      links: [...this.state.links, built.link],
      loans: [...loans, loan],
      events: [...this.state.events, ...built.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(loan);
  }

  public returnLoanedPlayer(
    input: Readonly<{
      loanId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<LoanAgreementSnapshot, DomainError> {
    return this.settleLoan(input, "RETURN");
  }

  public exerciseLoanOption(
    input: Readonly<{
      loanId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<LoanAgreementSnapshot, DomainError> {
    return this.settleLoan(input, "PURCHASE");
  }

  public findTransfer(transferId: string): TransferAgreementSnapshot | null {
    return (this.state.transfers ?? []).find(({ id }) => id === transferId) ?? null;
  }

  public findLoan(loanId: string): LoanAgreementSnapshot | null {
    return (this.state.loans ?? []).find(({ id }) => id === loanId) ?? null;
  }

  public findNegotiation(negotiationId: string): NegotiationSnapshot | null {
    return (
      this.state.negotiations.find(({ id }) => id === negotiationId) ?? null
    );
  }

  public activeLinkFor(playerId: string): PlayerClubLinkSnapshot | null {
    return (
      this.state.links.find(
        (link) => link.playerId === playerId && link.status === LinkStatus.ACTIVE,
      ) ?? null
    );
  }

  public summary(): MarketSummary {
    return {
      scoutingReportCount: this.state.scoutingReports.length,
      openNegotiationCount: this.state.negotiations.filter(
        ({ status }) => !isTerminal(status),
      ).length,
      activeContractCount: this.state.contracts.filter(
        ({ status }) => status === ContractStatus.ACTIVE,
      ).length,
      activeLinkCount: this.state.links.filter(
        ({ status }) => status === LinkStatus.ACTIVE,
      ).length,
      activeListingCount: (this.state.listings ?? []).filter(
        ({ status }) => status === ListingStatus.ACTIVE,
      ).length,
      completedTransferCount: (this.state.transfers ?? []).filter(
        ({ status }) => status === TransferStatus.COMPLETED,
      ).length,
      activeLoanCount: (this.state.loans ?? []).filter(
        ({ status }) => status === LoanStatus.ACTIVE,
      ).length,
    };
  }

  public snapshot(): WorldMarketSnapshot {
    return this.state;
  }

  private eventId(
    worldSeed: string,
    context: string,
    worldDate: string,
  ): MarketDomainEvent["id"] {
    return deterministicUuidV7<"MarketEvent">({
      worldSeed,
      context,
      timestampMilliseconds: timestampOf(worldDate),
    });
  }

  private findEvent<T extends MarketDomainEvent["type"]>(
    type: T,
    idempotencyKey: string,
  ): Extract<MarketDomainEvent, { type: T }> | undefined {
    return this.state.events.find(
      (event): event is Extract<MarketDomainEvent, { type: T }> =>
        event.type === type && event.idempotencyKey === idempotencyKey,
    );
  }

  private replaceTransfer(
    index: number,
    transfer: TransferAgreementSnapshot,
  ): void {
    const transfers = [...(this.state.transfers ?? [])];
    transfers[index] = transfer;
    this.state = { ...this.state, transfers };
  }

  private buildContractAndLink(
    input: Readonly<{
      personId: MarketPersonRef;
      playerId: MarketPlayerRef;
      clubId: MarketClubRef;
      feeMinor: number;
      wageMinor: number;
      startsOn: string;
      endsOn: string;
      kind: PlayerLinkKind;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
      rulesetVersion: RulesetVersion;
    }>,
  ): {
    contract: PlayerContractSnapshot;
    link: PlayerClubLinkSnapshot;
    events: MarketDomainEvent[];
  } {
    const contractId = deterministicUuidV7<"PlayerContract">({
      worldSeed: input.worldSeed,
      context: `player-contract:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(input.startsOn),
    });
    const contract: PlayerContractSnapshot = {
      id: contractId,
      gameWorldId: this.state.gameWorldId,
      personId: input.personId,
      playerId: input.playerId,
      clubId: input.clubId,
      feeMinor: input.feeMinor,
      wageMinor: input.wageMinor,
      startsOn: input.startsOn,
      endsOn: input.endsOn,
      kind: input.kind,
      status: ContractStatus.ACTIVE,
      idempotencyKey: input.idempotencyKey,
      version: 1,
    };
    const link: PlayerClubLinkSnapshot = {
      playerId: input.playerId,
      clubId: input.clubId,
      kind: input.kind,
      contractId,
      effectiveStart: input.startsOn,
      effectiveEnd: input.endsOn,
      status: LinkStatus.ACTIVE,
    };
    const contractEvent: PlayerContractActivatedEvent = {
      id: this.eventId(input.worldSeed, `contract-activated:${input.idempotencyKey}`, input.worldDate),
      type: "PlayerContractActivated",
      gameWorldId: this.state.gameWorldId,
      contractId,
      playerId: input.playerId,
      clubId: input.clubId,
      worldDate: input.worldDate,
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    const linkEvent: PlayerClubLinkChangedEvent = {
      id: this.eventId(input.worldSeed, `link-activated:${input.idempotencyKey}`, input.worldDate),
      type: "PlayerClubLinkChanged",
      gameWorldId: this.state.gameWorldId,
      playerId: input.playerId,
      clubId: input.clubId,
      status: LinkStatus.ACTIVE,
      worldDate: input.worldDate,
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    return { contract, link, events: [contractEvent, linkEvent] };
  }

  private settleLoan(
    input: Readonly<{
      loanId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
    mode: "RETURN" | "PURCHASE",
  ): Result<LoanAgreementSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const loans = this.state.loans ?? [];
    const index = loans.findIndex(({ id }) => id === input.loanId);
    if (index < 0) {
      return fail(
        new DomainError("LOAN_NOT_FOUND", "Empréstimo não encontrado.", {
          loanId: input.loanId,
        }),
      );
    }
    const loan = loans[index]!;
    if (loan.status !== LoanStatus.ACTIVE) {
      // retorno/compra exatamente uma vez: estado terminal repetido é efeito único
      if (
        (mode === "RETURN" && loan.status === LoanStatus.RETURNED) ||
        (mode === "PURCHASE" && loan.status === LoanStatus.PURCHASED)
      ) {
        return succeed(loan);
      }
      return fail(
        new DomainError("LOAN_TERMINAL", "O empréstimo já foi encerrado.", {
          loanId: loan.id,
          status: loan.status,
        }),
      );
    }
    if (mode === "PURCHASE" && loan.optionFeeMinor === null) {
      return fail(
        new DomainError(
          "LOAN_OPTION_UNAVAILABLE",
          "Este empréstimo não tem opção de compra.",
          { loanId: loan.id },
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const links = this.state.links.map((link) =>
      link.contractId === loan.contractId && link.status === LinkStatus.ACTIVE
        ? { ...link, status: LinkStatus.ENDED, effectiveEnd: date.value.toString() }
        : link,
    );
    const contracts = this.state.contracts.map((contract) =>
      contract.id === loan.contractId && contract.status === ContractStatus.ACTIVE
        ? { ...contract, status: ContractStatus.TERMINATED, version: contract.version + 1 }
        : contract,
    );
    const endLinkEvent: PlayerClubLinkChangedEvent = {
      id: this.eventId(input.worldSeed, `loan-link-ended:${input.idempotencyKey}`, date.value.toString()),
      type: "PlayerClubLinkChanged",
      gameWorldId: this.state.gameWorldId,
      playerId: loan.playerId,
      clubId: loan.destinationClubId,
      status: LinkStatus.ENDED,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: `${input.idempotencyKey}:end`,
    };
    if (mode === "RETURN") {
      const returned: LoanAgreementSnapshot = {
        ...loan,
        status: LoanStatus.RETURNED,
        version: loan.version + 1,
      };
      const nextLoans = [...loans];
      nextLoans[index] = returned;
      const event: LoanReturnedEvent = {
        id: this.eventId(input.worldSeed, `loan-returned:${input.idempotencyKey}`, date.value.toString()),
        type: "LoanReturned",
        gameWorldId: this.state.gameWorldId,
        loanId: loan.id,
        playerId: loan.playerId,
        worldDate: date.value.toString(),
        rulesetVersion: input.rulesetVersion,
        idempotencyKey: input.idempotencyKey,
      };
      this.state = {
        ...this.state,
        contracts,
        links,
        loans: nextLoans,
        events: [...this.state.events, endLinkEvent, event],
        revision: this.state.revision + 1,
      };
      return succeed(returned);
    }
    // PURCHASE: encerra empréstimo e cria vínculo permanente no destino
    const built = this.buildContractAndLink({
      personId: loan.personId,
      playerId: loan.playerId,
      clubId: loan.destinationClubId,
      feeMinor: loan.optionFeeMinor ?? 0,
      wageMinor: 0,
      startsOn: date.value.toString(),
      endsOn: loan.endsOn,
      kind: PlayerLinkKind.PERMANENT,
      idempotencyKey: `${input.idempotencyKey}:contract`,
      worldSeed: input.worldSeed,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
    });
    const purchased: LoanAgreementSnapshot = {
      ...loan,
      status: LoanStatus.PURCHASED,
      version: loan.version + 1,
    };
    const nextLoans = [...loans];
    nextLoans[index] = purchased;
    const event: LoanPurchasedEvent = {
      id: this.eventId(input.worldSeed, `loan-purchased:${input.idempotencyKey}`, date.value.toString()),
      type: "LoanPurchased",
      gameWorldId: this.state.gameWorldId,
      loanId: loan.id,
      playerId: loan.playerId,
      destinationClubId: loan.destinationClubId,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      contracts: [...contracts, built.contract],
      links: [...links, built.link],
      loans: nextLoans,
      events: [...this.state.events, endLinkEvent, ...built.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(purchased);
  }
}

function isTerminal(status: NegotiationSnapshot["status"]): boolean {
  return (
    status === NegotiationStatus.ACCEPTED ||
    status === NegotiationStatus.CANCELLED ||
    status === NegotiationStatus.EXPIRED
  );
}

function invalidMarket(message: string): DomainError {
  return new DomainError("INVALID_MARKET_STATE", message);
}

function rulesetMismatch(): DomainError {
  return new DomainError(
    "RULESET_VERSION_MISMATCH",
    "O command usa um ruleset diferente do mercado.",
  );
}

function staleOffer(): DomainError {
  return new DomainError(
    "STALE_OFFER_VERSION",
    "A versão da oferta está obsoleta.",
  );
}

function negotiationNotFound(negotiationId: string): DomainError {
  return new DomainError("NEGOTIATION_NOT_FOUND", "Negociação não encontrada.", {
    negotiationId,
  });
}

function transferNotFound(transferId: string): DomainError {
  return new DomainError("TRANSFER_NOT_FOUND", "Transferência não encontrada.", {
    transferId,
  });
}

function transferTerminal(transferId: string): DomainError {
  return new DomainError(
    "TRANSFER_TERMINAL",
    "A transferência já está em estado terminal.",
    { transferId },
  );
}

function timestampOf(worldDate: string): number {
  return Date.parse(`${worldDate}T00:00:00.000Z`);
}
