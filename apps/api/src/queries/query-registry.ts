import type {
  ClubReadModel,
  IdentityReadModel,
  SquadReadModel,
  LedgerReadModel,
  CompetitionReadModel,
} from "@grinta/core";
import { DomainError, fail, succeed, type GameWorldId, type Result } from "@grinta/shared";

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
  readonly squadReadModel: SquadReadModel;
  readonly ledgerReadModel: LedgerReadModel;
  readonly competitionReadModel: CompetitionReadModel;
}

/**
 * `params` são os query-string da requisição. A maioria das queries é
 * world-scoped e os ignora; algumas — como `roster` — precisam de um recorte
 * fino (o clube), e é por aqui que ele chega. É o primeiro passo da
 * granularidade que o doc 23 pede (#37).
 */
export type QueryHandler = (
  context: QueryContext,
  worldId: GameWorldId,
  params: Record<string, unknown>,
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
  ledger: async ({ ledgerReadModel }, worldId) =>
    succeed(await ledgerReadModel.summary(worldId)),
  competitions: async ({ competitionReadModel }, worldId) =>
    succeed(await competitionReadModel.leagueStandings(worldId)),
  roster: async ({ squadReadModel }, worldId, params) => {
    const clubId = typeof params.clubId === "string" ? params.clubId : null;
    if (clubId === null) {
      return fail(
        new DomainError(
          "QUERY_PARAM_REQUIRED",
          "roster exige o parâmetro clubId.",
          { param: "clubId" },
        ),
      );
    }
    return succeed(await squadReadModel.roster(worldId, clubId));
  },
};

export function resolveQueryHandler(name: string): QueryHandler | undefined {
  return handlers[name];
}

export function registeredQueryNames(): readonly string[] {
  return Object.keys(handlers);
}
