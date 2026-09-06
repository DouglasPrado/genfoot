import type {
  ClubReadModel,
  ClubFinanceReadModel,
  IdentityReadModel,
  SquadReadModel,
  LedgerReadModel,
  CompetitionReadModel,
  MatchesReadModel,
  WorldClockRepository,
  MarketReadModel,
  FanbaseReadModel,
  NarrativeReadModel,
  StaffReadModel,
  InboxReadModel,
  TrainingPlanRepository,
  IndividualTrainingPlanRepository,
  MentorshipRepository,
  LineupRepository,
} from "@grinta/core";
import type {
  PrismaMedicalReadModel,
  PlayerDevelopmentReadModel,
  TrainingSessionsReadModel,
  GroupTrainingSessionsReadModel,
  WorldSeasonReadModel,
  YouthIntakeReadModel,
} from "@grinta/persistence";
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
  readonly clubFinanceReadModel: ClubFinanceReadModel;
  readonly competitionReadModel: CompetitionReadModel;
  readonly matchesReadModel: MatchesReadModel;
  readonly marketReadModel: MarketReadModel;
  readonly fanbaseReadModel: FanbaseReadModel;
  readonly narrativeReadModel: NarrativeReadModel;
  readonly staffReadModel: StaffReadModel;
  readonly inboxReadModel: InboxReadModel;
  /** MUNDO-V4 — o relógio do mundo, para o admin ler a config e o próximo tick. */
  readonly worldClock: WorldClockRepository;
  /** Treino — o plano do clube na temporada (M-TRAINING, doc 23 §9). */
  readonly trainingPlanRepository: TrainingPlanRepository;
  readonly individualTrainingPlanRepository: IndividualTrainingPlanRepository;
  readonly mentorshipRepository: MentorshipRepository;
  readonly playerDevelopmentReadModel: PlayerDevelopmentReadModel;
  /** Departamento médico — a lista de casos e o caso aberto (doc 23 §43). */
  readonly medicalReadModel: PrismaMedicalReadModel;
  readonly trainingSessionsReadModel: TrainingSessionsReadModel;
  /** A temporada corrente — deixa `seasonId` opcional nas queries de treino. */
  readonly worldSeasonReadModel: WorldSeasonReadModel;
  readonly groupTrainingSessionsReadModel: GroupTrainingSessionsReadModel;
  readonly youthIntakeReadModel: YouthIntakeReadModel;
  /** Tática — a escalação corrente do clube (M-LINEUP, R-220 Fase 1). */
  readonly clubLineupRepository: LineupRepository;
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

/**
 * As queries de M-COMPETITION são todas recortadas por `competitionId` — o
 * mesmo pedido de parâmetro repetido cinco vezes vira este atalho. Sem o
 * parâmetro é erro de contrato (`QUERY_PARAM_REQUIRED`), não lista vazia.
 */
async function requireCompetitionId<T>(
  params: Record<string, unknown>,
  read: (competitionId: string) => Promise<T>,
): Promise<Result<T, DomainError>> {
  const competitionId =
    typeof params.competitionId === "string" ? params.competitionId : null;
  if (competitionId === null) {
    return fail(
      new DomainError(
        "QUERY_PARAM_REQUIRED",
        "a query exige o parâmetro competitionId.",
        { param: "competitionId" },
      ),
    );
  }
  return succeed(await read(competitionId));
}

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
  // A lista de M-COMPETITIONS. `clubId` é OPCIONAL: com ele cada linha diz se o
  // clube participa e em que posição está; sem ele (admin), a lista crua.
  "competitions-list": async ({ competitionReadModel }, worldId, params) => {
    const clubId = typeof params.clubId === "string" ? params.clubId : null;
    return succeed({
      competitions: await competitionReadModel.listCompetitions(worldId, clubId),
    });
  },
  "competition-outcome": async ({ competitionReadModel }, worldId, params) => {
    const competitionId =
      typeof params.competitionId === "string" ? params.competitionId : null;
    return succeed(
      await competitionReadModel.competitionOutcome(worldId, competitionId),
    );
  },
  /** M-COMPETITION — cabeçalho e regulamento de UMA competição. */
  "competition-detail": async ({ competitionReadModel }, worldId, params) =>
    requireCompetitionId(params, (competitionId) =>
      competitionReadModel.competitionDetail(worldId, competitionId),
    ),
  /** M-COMPETITION aba Tabela/Grupos. */
  "competition-table": async ({ competitionReadModel }, worldId, params) =>
    requireCompetitionId(params, (competitionId) =>
      competitionReadModel.competitionTable(worldId, competitionId),
    ),
  /** M-COMPETITION aba Chaveamento. `rounds` vazio = competição sem mata-mata. */
  "competition-bracket": async ({ competitionReadModel }, worldId, params) =>
    requireCompetitionId(params, (competitionId) =>
      competitionReadModel.competitionBracket(worldId, competitionId),
    ),
  /** M-COMPETITION aba Rodadas/Jogos — todos os jogos da edição. */
  "competition-matches": async ({ competitionReadModel }, worldId, params) =>
    requireCompetitionId(params, (competitionId) =>
      competitionReadModel.competitionMatches(worldId, competitionId),
    ),
  /** M-COMPETITION abas Artilharia/Assistências, com a cobertura do motor. */
  "competition-stats": async ({ competitionReadModel }, worldId, params) =>
    requireCompetitionId(params, (competitionId) =>
      competitionReadModel.competitionStats(worldId, competitionId),
    ),
  "top-scorers": async ({ competitionReadModel }, worldId) =>
    succeed({ scorers: await competitionReadModel.topScorers(worldId) }),
  matches: async ({ matchesReadModel }, worldId, params) => {
    const clubId = typeof params.clubId === "string" ? params.clubId : null;
    return succeed(await matchesReadModel.recentAndUpcoming(worldId, clubId));
  },
  "world-clock": async ({ worldClock }, worldId) =>
    succeed(await worldClock.getClock(worldId)),
  lineup: async ({ clubLineupRepository }, worldId, params) => {
    const clubId = typeof params.clubId === "string" ? params.clubId : null;
    if (clubId === null) {
      return fail(
        new DomainError(
          "QUERY_PARAM_REQUIRED",
          "lineup exige o parâmetro clubId.",
          { params: ["clubId"] },
        ),
      );
    }
    // `null` = clube sem escalação (a partida usa a média do elenco). A tela
    // distingue "sem escalação" de "escalação vazia" pelo próprio null.
    const lineup = await clubLineupRepository.findByClub(worldId, clubId);
    return succeed({ lineup });
  },
  "training-plan": async (
    { trainingPlanRepository, worldSeasonReadModel },
    worldId,
    params,
  ) => {
    const clubId = typeof params.clubId === "string" ? params.clubId : null;
    if (clubId === null) {
      return fail(
        new DomainError(
          "QUERY_PARAM_REQUIRED",
          "training-plan exige o parâmetro clubId.",
          { params: ["clubId"] },
        ),
      );
    }
    // seasonId é OPCIONAL, como em `player-development` (R-221): omitido → usa o
    // season CORRENTE do mundo. O mobile não conhece o season, e exigi-lo aqui
    // tornava a tela de treino inconstruível — nenhuma query o devolvia.
    let seasonId = typeof params.seasonId === "string" ? params.seasonId : null;
    if (seasonId === null) {
      seasonId = await worldSeasonReadModel.currentSeasonId(worldId);
    }
    if (seasonId === null) {
      // Mundo sem temporada corrente é estado LEGÍTIMO (mundo recém-semeado).
      // Devolve plano nulo para a tela dizer "sem temporada", não erro técnico.
      return succeed({ plan: null });
    }
    // `null` é resposta legítima: clube sem plano na temporada. A tela cai no
    // estado vazio (M-TRAINING sem foco definido), não em erro.
    const plan = await trainingPlanRepository.findByClubSeason(
      worldId,
      clubId,
      seasonId,
    );
    return succeed({ plan });
  },
  /**
   * Departamento médico do clube (`M-MEDICAL`).
   *
   * Lista vazia é o estado LEGÍTIMO "elenco saudável" — não erro. A tela
   * precisa do total do elenco para dizer quantos estão sãos, e do nível da
   * comissão médica (null = clube sem médico contratado).
   */
  "medical": async ({ medicalReadModel }, worldId, params) => {
    const clubId = typeof params.clubId === "string" ? params.clubId : null;
    if (clubId === null) {
      return fail(
        new DomainError(
          "QUERY_PARAM_REQUIRED",
          "medical exige o parâmetro clubId.",
          { params: ["clubId"] },
        ),
      );
    }
    return succeed(await medicalReadModel.department(worldId, clubId));
  },

  /**
   * O caso aberto de um jogador (`M-MEDICAL-CASE`), com as opções de
   * tratamento recomendadas. `case: null` = jogador sem episódio aberto.
   */
  "medical-case": async ({ medicalReadModel }, worldId, params) => {
    const playerId = typeof params.playerId === "string" ? params.playerId : null;
    if (playerId === null) {
      return fail(
        new DomainError(
          "QUERY_PARAM_REQUIRED",
          "medical-case exige o parâmetro playerId.",
          { params: ["playerId"] },
        ),
      );
    }
    return succeed(await medicalReadModel.case(worldId, playerId));
  },

  /** Plano INDIVIDUAL de um jogador (M-TRAINING-INDIV). `null` = jogador sem plano. */
  "individual-training-plan": async (
    { individualTrainingPlanRepository },
    worldId,
    params,
  ) => {
    const clubId = typeof params.clubId === "string" ? params.clubId : null;
    const playerId = typeof params.playerId === "string" ? params.playerId : null;
    if (clubId === null || playerId === null) {
      return fail(
        new DomainError(
          "QUERY_PARAM_REQUIRED",
          "individual-training-plan exige clubId e playerId.",
          { params: ["clubId", "playerId"] },
        ),
      );
    }
    const [plan, budget] = await Promise.all([
      individualTrainingPlanRepository.findByPlayer(worldId, clubId, playerId),
      // O orçamento diário do jogador, para a tela projetar o ganho com a MESMA
      // régua da virada. `null` se o jogador sumiu.
      individualTrainingPlanRepository.dailyBudget(worldId, playerId),
    ]);
    return succeed({ plan, budget });
  },
  /** Os ids dos jogadores do clube que TÊM plano individual (para a listagem
   * marcar quem NÃO tem). */
  "individual-training-plans": async (
    { individualTrainingPlanRepository },
    worldId,
    params,
  ) => {
    const clubId = typeof params.clubId === "string" ? params.clubId : null;
    if (clubId === null) {
      return fail(
        new DomainError(
          "QUERY_PARAM_REQUIRED",
          "individual-training-plans exige clubId.",
          { params: ["clubId"] },
        ),
      );
    }
    const playerIds = await individualTrainingPlanRepository.playerIdsWithPlan(
      worldId,
      clubId,
    );
    return succeed({ playerIds });
  },
  /** O mentor atual de um pupilo (M-MENTORING). `mentorId: null` = sem mentor. */
  "mentorship": async ({ mentorshipRepository }, worldId, params) => {
    const clubId = typeof params.clubId === "string" ? params.clubId : null;
    const menteeId = typeof params.menteeId === "string" ? params.menteeId : null;
    if (clubId === null || menteeId === null) {
      return fail(
        new DomainError(
          "QUERY_PARAM_REQUIRED",
          "mentorship exige clubId e menteeId.",
          { params: ["clubId", "menteeId"] },
        ),
      );
    }
    const link = await mentorshipRepository.findByMentee(worldId, clubId, menteeId);
    return succeed({
      mentorId: link?.mentorId ?? null,
      version: link?.version ?? null,
    });
  },
  "training-sessions": async ({ trainingSessionsReadModel }, worldId, params) => {
    const clubId = typeof params.clubId === "string" ? params.clubId : null;
    if (clubId === null) {
      return fail(
        new DomainError(
          "QUERY_PARAM_REQUIRED",
          "training-sessions exige o parâmetro clubId.",
          { params: ["clubId"] },
        ),
      );
    }
    // Lista VAZIA é resposta legítima: clube sem ninguém treinando. A tela cai no
    // estado vazio (todos disponíveis), não em erro.
    return succeed({
      sessions: await trainingSessionsReadModel.activeByClub(worldId, clubId),
    });
  },
  "group-training-session": async ({ groupTrainingSessionsReadModel }, worldId, params) => {
    const clubId = typeof params.clubId === "string" ? params.clubId : null;
    if (clubId === null) {
      return fail(
        new DomainError(
          "QUERY_PARAM_REQUIRED",
          "group-training-session exige o parâmetro clubId.",
          { params: ["clubId"] },
        ),
      );
    }
    // `null` = clube sem treino em grupo ativo. A tela cai no estado vazio.
    return succeed({
      session: await groupTrainingSessionsReadModel.activeByClub(worldId, clubId),
    });
  },
  "player-development": async ({ playerDevelopmentReadModel }, worldId, params) => {
    const playerId = typeof params.playerId === "string" ? params.playerId : null;
    // seasonId é OPCIONAL (R-221): omitido → o read model usa o currentSeasonId
    // do mundo. A tela chama só com playerId; o mobile não precisa saber o season.
    const seasonId = typeof params.seasonId === "string" ? params.seasonId : null;
    if (playerId === null) {
      return fail(
        new DomainError(
          "QUERY_PARAM_REQUIRED",
          "player-development exige o parâmetro playerId.",
          { params: ["playerId"] },
        ),
      );
    }
    // `null` = jogador inexistente no mundo; a tela cai no estado vazio.
    return succeed({
      development: await playerDevelopmentReadModel.view(worldId, playerId, seasonId),
    });
  },
  "youth-intake": async ({ youthIntakeReadModel }, worldId) =>
    succeed({ candidates: await youthIntakeReadModel.candidates(worldId) }),
  /** A ficha disciplinar do elenco de um clube (M-CLUB-VIEW). */
  "club-discipline": async ({ matchesReadModel }, worldId, params) => {
    const clubId = typeof params.clubId === "string" ? params.clubId : null;
    if (clubId === null) {
      return fail(
        new DomainError(
          "QUERY_PARAM_REQUIRED",
          "club-discipline exige o parametro clubId.",
          { param: "clubId" },
        ),
      );
    }
    return succeed(await matchesReadModel.clubDiscipline(worldId, clubId));
  },
  "match-detail": async ({ matchesReadModel }, worldId, params) => {
    const matchId = typeof params.matchId === "string" ? params.matchId : null;
    if (matchId === null) {
      return fail(
        new DomainError(
          "QUERY_PARAM_REQUIRED",
          "match-detail exige o parâmetro matchId.",
          { param: "matchId" },
        ),
      );
    }
    return succeed(await matchesReadModel.matchDetail(worldId, matchId));
  },
  market: async ({ marketReadModel }, worldId, params) => {
    const excludeClubId = typeof params.clubId === "string" ? params.clubId : null;
    return succeed(await marketReadModel.scoutablePlayers(worldId, excludeClubId));
  },
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
  "finance-snapshot": async ({ clubFinanceReadModel }, worldId, params) => {
    const clubId = typeof params.clubId === "string" ? params.clubId : null;
    if (clubId === null) {
      return fail(
        new DomainError(
          "QUERY_PARAM_REQUIRED",
          "finance-snapshot exige o parâmetro clubId.",
          { param: "clubId" },
        ),
      );
    }
    return succeed(await clubFinanceReadModel.snapshot(worldId, clubId));
  },
  fanbase: async ({ fanbaseReadModel }, worldId, params) => {
    const clubId = typeof params.clubId === "string" ? params.clubId : null;
    if (clubId === null) {
      return fail(
        new DomainError(
          "QUERY_PARAM_REQUIRED",
          "fanbase exige o parâmetro clubId.",
          { param: "clubId" },
        ),
      );
    }
    return succeed(await fanbaseReadModel.fanbaseForClub(worldId, clubId));
  },
  staff: async ({ staffReadModel }, worldId, params) => {
    const clubId = typeof params.clubId === "string" ? params.clubId : null;
    if (clubId === null) {
      return fail(
        new DomainError(
          "QUERY_PARAM_REQUIRED",
          "staff exige o parâmetro clubId.",
          { param: "clubId" },
        ),
      );
    }
    return succeed(await staffReadModel.staffForClub(worldId, clubId));
  },
  inbox: async ({ inboxReadModel }, worldId, params) => {
    // clubId opcional: com ele, o inbox do clube; sem ele, zeros (degradação
    // segura — a home ainda chama sem recorte enquanto a tela não é atualizada).
    const clubId = typeof params.clubId === "string" ? params.clubId : null;
    return succeed(
      await inboxReadModel.summaryForClubs(worldId, clubId === null ? [] : [clubId]),
    );
  },
  "inbox-items": async ({ inboxReadModel }, worldId, params) => {
    // A LISTA de avisos do clube (tela de avisos). Exige clubId — a lista é de UM clube.
    const clubId = typeof params.clubId === "string" ? params.clubId : null;
    if (clubId === null) {
      return fail(
        new DomainError(
          "QUERY_PARAM_REQUIRED",
          "inbox-items exige o parâmetro clubId.",
          { param: "clubId" },
        ),
      );
    }
    return succeed({ items: await inboxReadModel.listForClub(worldId, clubId) });
  },
  youth: async ({ squadReadModel }, worldId, params) => {
    const clubId = typeof params.clubId === "string" ? params.clubId : null;
    if (clubId === null) {
      return fail(
        new DomainError(
          "QUERY_PARAM_REQUIRED",
          "youth exige o parâmetro clubId.",
          { param: "clubId" },
        ),
      );
    }
    return succeed(await squadReadModel.youthRoster(worldId, clubId));
  },
  narrative: async ({ narrativeReadModel }, worldId, params) => {
    const limit =
      typeof params.limit === "string" ? Number(params.limit) : 30;
    return succeed(
      await narrativeReadModel.recentForWorld(
        worldId,
        Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 30,
      ),
    );
  },
};

export function resolveQueryHandler(name: string): QueryHandler | undefined {
  return handlers[name];
}

export function registeredQueryNames(): readonly string[] {
  return Object.keys(handlers);
}
