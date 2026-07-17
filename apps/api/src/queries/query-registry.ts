import type { ClubReadModel, IdentityReadModel } from "@grinta/core";
import { DomainError, succeed, type GameWorldId, type Result } from "@grinta/shared";

/**
 * Registry de queries, depois do extermínio da arquitetura morta (R-175).
 * Somente leitura: nunca muta estado.
 *
 * Eram 15 queries, 13 delas lendo o adapter JSON — competições, partidas,
 * mercado, razão, jogadores, staff, narrativa, inbox, admin, automação,
 * eventing, scheduler. Todas morreram com os contextos que as serviam, e voltam
 * quando uma tela precisar delas.
 *
 * **Há UM caminho de leitura: o Postgres.** Os read models são separados das
 * portas de escrita de propósito (R-175): a escrita carrega UM agregado por id;
 * a tela quer a lista do mundo. Ler pela porta de escrita traria de volta o
 * "carregue o mundo inteiro" que a R-175 matou.
 */
export interface QueryContext {
  readonly identityReadModel: IdentityReadModel;
  readonly clubReadModel: ClubReadModel;
}

export type QueryHandler = (
  context: QueryContext,
  worldId: GameWorldId,
) => Promise<Result<unknown, DomainError>>;

const handlers: Record<string, QueryHandler> = {
  club: async ({ clubReadModel }, worldId) =>
    succeed(await clubReadModel.summary(worldId)),
  "club-detail": async ({ clubReadModel }, worldId) =>
    succeed(await clubReadModel.worldView(worldId)),
  identity: async ({ identityReadModel }, worldId) =>
    succeed(await identityReadModel.summary(worldId)),
  "identity-detail": async ({ identityReadModel }, worldId) =>
    succeed(await identityReadModel.worldView(worldId)),
};

export function resolveQueryHandler(name: string): QueryHandler | undefined {
  return handlers[name];
}

export function registeredQueryNames(): readonly string[] {
  return Object.keys(handlers);
}
