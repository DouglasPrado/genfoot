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
  LinkStatus,
  NegotiationStatus,
  type MarketClubRef,
  type MarketDomainEvent,
  type MarketPersonRef,
  type MarketPlayerRef,
  type MarketSummary,
  type NegotiationSnapshot,
  type OfferAcceptedEvent,
  type OfferSnapshot,
  type OfferSubmittedEvent,
  type PlayerClubLinkChangedEvent,
  type PlayerClubLinkSnapshot,
  type PlayerContractActivatedEvent,
  type PlayerContractSnapshot,
  type PlayerLinkKind,
  type ScoutingReportProducedEvent,
  type ScoutingReportSnapshot,
  type WorldMarketSnapshot,
} from "./market-types.js";

const MIN_SCOUTING_CAPACITY = 20;

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

function timestampOf(worldDate: string): number {
  return Date.parse(`${worldDate}T00:00:00.000Z`);
}
