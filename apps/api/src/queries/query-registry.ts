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
import type { DomainError, GameWorldId, Result } from "@grinta/shared";

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
  competitions: (repository, worldId) =>
    new InspectCompetitions(repository).summary(worldId),
  matches: (repository, worldId) =>
    new InspectMatches(repository).summary(worldId),
  market: (repository, worldId) =>
    new InspectMarket(repository).summary(worldId),
  ledger: (repository, worldId) =>
    new InspectLedger(repository).summary(worldId),
  players: (repository, worldId) =>
    new InspectPlayerLifecycle(repository).summary(worldId),
  staff: (repository, worldId) =>
    new InspectStaff(repository).summary(worldId),
  narrative: (repository, worldId) =>
    composeNarrativeProjection(repository, worldId),
  inbox: (repository, worldId) =>
    new InspectInbox(repository).summary(worldId),
  admin: (repository, worldId) =>
    new InspectAdmin(repository).summary(worldId),
  automation: (repository, worldId) =>
    new InspectAutomation(repository).summary(worldId),
  eventing: (repository, worldId) =>
    new InspectEventing(repository).summary(worldId),
  identity: (repository, worldId) =>
    new InspectIdentity(repository).summary(worldId),
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
