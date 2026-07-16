import {
  InspectAdmin,
  InspectAutomation,
  InspectClubPortfolio,
  InspectCompetitions,
  InspectEventing,
  InspectIdentity,
  InspectInbox,
  InspectLedger,
  InspectMarket,
  InspectMatches,
  InspectPlayerLifecycle,
  InspectStaff,
  InspectWorldScheduler,
} from "@grinta/core";
import type { JsonWorldRepository } from "@grinta/persistence";
import {
  succeed,
  type DomainError,
  type GameWorldId,
  type Result,
} from "@grinta/shared";

import { composeNarrativeProjection } from "./narrative-projection.js";

/**
 * Registry de queries do X-003. Cada tipo mapeia para um caso de uso de inspeção
 * de `@grinta/core` sobre o `worldId` — o adapter JSON implementa todas as portas.
 * Somente leitura: nunca muta estado.
 */
export type QueryHandler = (
  repository: JsonWorldRepository,
  worldId: GameWorldId,
) => Promise<Result<unknown, DomainError>>;

const handlers: Record<string, QueryHandler> = {
  club: (repository, worldId) =>
    new InspectClubPortfolio(repository).world(worldId),
  competitions: async (repository, worldId) => {
    const inspector = new InspectCompetitions(repository);
    const summary = await inspector.summary(worldId);
    if (!summary.ok) return summary;
    const competitions = await inspector.world(worldId);
    if (!competitions.ok) return competitions;
    const nextFixture = competitions.value.fixtures
      .filter(({ status }) => status === "SCHEDULED")
      .slice()
      .sort((left, right) => left.kickoffOn.localeCompare(right.kickoffOn))[0];
    return succeed({
      ...summary.value,
      competitions: competitions.value.editions.map((edition) => ({
        id: edition.id,
        name: edition.name,
        status: edition.status,
        startOn: edition.startOn,
      })),
      nextKickoffOn: nextFixture?.kickoffOn ?? null,
      fixtures: competitions.value.fixtures.map((fixture) => ({
        id: fixture.id,
        editionId: fixture.editionId,
        round: fixture.round,
        homeClubId: fixture.homeClubId,
        awayClubId: fixture.awayClubId,
        kickoffOn: fixture.kickoffOn,
        status: fixture.status,
        homeGoals: fixture.homeGoals,
        awayGoals: fixture.awayGoals,
      })),
    });
  },
  matches: (repository, worldId) =>
    new InspectMatches(repository).summary(worldId),
  "matches-detail": (repository, worldId) =>
    new InspectMatches(repository).world(worldId),
  market: async (repository, worldId) => {
    const inspector = new InspectMarket(repository);
    const market = await inspector.summary(worldId);
    if (!market.ok) return market;
    const marketWorld = await inspector.world(worldId);
    if (!marketWorld.ok) return marketWorld;
    const lifecycle = await new InspectPlayerLifecycle(repository).world(
      worldId,
    );
    if (!lifecycle.ok) return lifecycle;
    const persons = new Map(
      lifecycle.value.persons.map((person) => [person.id, person] as const),
    );
    const availablePlayers = lifecycle.value.players
      .filter(({ careerStatus }) => careerStatus === "FREE_AGENT")
      .map((player) => {
        const person = persons.get(player.personId);
        return {
          id: player.id,
          name:
            person === undefined
              ? "Jogador livre"
              : `${person.firstName} ${person.lastName}`,
          primaryPosition: player.primaryPosition,
          currentAbility: player.currentAbility,
          potentialAbility: player.potentialAbility,
          nationality: person?.nationality ?? "--",
        };
      });
    const playerName = (playerId: string): string => {
      const player = lifecycle.value.players.find(({ id }) => id === playerId);
      const person =
        player === undefined ? undefined : persons.get(player.personId);
      return person === undefined
        ? "Jogador"
        : `${person.firstName} ${person.lastName}`;
    };
    const playerCard = (playerId: string) => {
      const player = lifecycle.value.players.find(({ id }) => id === playerId);
      return {
        playerName: playerName(playerId),
        primaryPosition: player?.primaryPosition ?? "--",
        currentAbility: player?.currentAbility ?? 0,
        personId: player?.personId ?? null,
      };
    };
    return succeed({
      ...market.value,
      availablePlayerCount: availablePlayers.length,
      availablePlayers,
      scoutingReports: marketWorld.value.scoutingReports,
      negotiations: marketWorld.value.negotiations.map((negotiation) => ({
        ...negotiation,
        ...playerCard(negotiation.playerId),
      })),
      listings: (marketWorld.value.listings ?? []).map((listing) => ({
        ...listing,
        ...playerCard(listing.playerId),
      })),
      transfers: marketWorld.value.transfers ?? [],
      loans: marketWorld.value.loans ?? [],
    });
  },
  ledger: async (repository, worldId) => {
    const inspector = new InspectLedger(repository);
    const summary = await inspector.summary(worldId);
    if (!summary.ok) return summary;
    const ledger = await inspector.world(worldId);
    if (!ledger.ok) return ledger;
    const clubBalances = ledger.value.accounts
      .filter(({ idempotencyKey }) =>
        idempotencyKey.startsWith("genesis:club-cash:"),
      )
      .map((account) => ({
        clubId: account.idempotencyKey.slice("genesis:club-cash:".length),
        balanceMinor: account.balanceMinor,
      }));
    return succeed({ ...summary.value, clubBalances });
  },
  players: (repository, worldId) =>
    new InspectPlayerLifecycle(repository).summary(worldId),
  "player-roster": (repository, worldId) =>
    new InspectPlayerLifecycle(repository).world(worldId),
  staff: (repository, worldId) => new InspectStaff(repository).summary(worldId),
  narrative: (repository, worldId) =>
    composeNarrativeProjection(repository, worldId),
  inbox: (repository, worldId) => new InspectInbox(repository).summary(worldId),
  admin: (repository, worldId) => new InspectAdmin(repository).summary(worldId),
  automation: (repository, worldId) =>
    new InspectAutomation(repository).summary(worldId),
  eventing: (repository, worldId) =>
    new InspectEventing(repository).summary(worldId),
  identity: (repository, worldId) =>
    new InspectIdentity(repository).summary(worldId),
  "identity-detail": (repository, worldId) =>
    new InspectIdentity(repository).world(worldId),
  scheduler: (repository, worldId) =>
    new InspectWorldScheduler(repository).execute(worldId),
};

export function resolveQueryHandler(
  queryType: string,
): QueryHandler | undefined {
  return handlers[queryType];
}

export function registeredQueryTypes(): readonly string[] {
  return Object.keys(handlers);
}
