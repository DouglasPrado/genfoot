import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import { BASE_CURRENCY_ID } from "../finance/ledger-bootstrap.js";
import { JournalEntry } from "../finance/journal-entry.js";
import type { LedgerRepository } from "../finance/ledger-repository.js";
import {
  AccountNormalSide,
  AccountOwnerScope,
  FinancialAccountType,
  JournalLineDirection,
  MoneyFlowClass,
  SystemAccount,
  type LedgerAccountSnapshot,
} from "../finance/ledger-types.js";

import {
  generateSchedule,
  type ScheduledMatchDraw,
} from "./competition-schedule.js";
import { Competition, type ConfigureCompetitionPatch } from "./competition.js";
import {
  defaultKnockoutConfig,
  defaultLeagueConfig,
  type CompetitionConfig,
  type CompetitionLifecycle,
} from "./competition-config.js";
import {
  CompetitionFormat,
  type CompetitionType,
} from "./competition-types.js";
import { buildStandings, type FinishedMatchInput } from "./standings.js";
import type { CompetitionAggregateSnapshot } from "./competition.js";

/** O que a homologação precisa saber da edição para pagar prêmios (C7-V6). */
export interface EditionResults {
  readonly clubIds: readonly string[];
  readonly finishedMatches: readonly FinishedMatchInput[];
  /** O artilheiro e o clube dele (para o prêmio individual); `null` se ninguém marcou. */
  readonly topScorer: { readonly playerId: string; readonly clubId: string } | null;
}

/**
 * Casos de uso da competição autorada (C7, R-202). Cada um carrega UM agregado,
 * muta e salva com concorrência otimista (`expectedVersion`). A criação salva
 * com `expectedVersion = 0` (linha nova). O UnitOfWork envolve tudo numa
 * transação; falha de domínio faz rollback.
 */
export interface CompetitionAggregateRepository {
  findCompetitionById(
    gameWorldId: string,
    competitionId: string,
  ): Promise<CompetitionAggregateSnapshot | null>;
  /** `expectedVersion === 0` insere; caso contrário atualiza onde version bate. */
  saveCompetition(
    snapshot: CompetitionAggregateSnapshot,
    expectedVersion: number,
  ): Promise<void>;
  /** Reescreve as partidas da edição — o sorteio materializado no lock (R-206). */
  materializeSchedule(
    gameWorldId: string,
    competitionId: string,
    draws: readonly ScheduledMatchDraw[],
  ): Promise<void>;
  /** Resultados da edição para a homologação (C7-V6): jogos, clubes, artilheiro. */
  findEditionResults(
    gameWorldId: string,
    competitionId: string,
  ): Promise<EditionResults | null>;
  /**
   * Torna oficiais as partidas terminadas da edição (C5-V3): FINISHED →
   * PROCESSED + homologationStatus HOMOLOGATED. Devolve quantas homologou.
   */
  homologateEditionMatches(
    gameWorldId: string,
    competitionId: string,
  ): Promise<number>;
  /**
   * Abre a PRÓXIMA edição da liga (rollover, R-204): cria a temporada seguinte e
   * uma edição EM RASCUNHO na janela `[startsOn, endsOn]`, herdando a config da
   * edição atual. Os participantes são `clubIds` quando dado (troca de divisão
   * por acesso/rebaixamento) ou os mesmos da edição atual quando omitido (liga
   * avulsa que se repete). A edição nova passa a ser a corrente (início mais
   * recente). Idempotente: se já existe edição começando em `startsOn` ou depois,
   * não faz nada. Devolve `true` se abriu.
   */
  openNextEdition(input: {
    gameWorldId: string;
    competitionId: string;
    startsOn: string;
    endsOn: string;
    clubIds?: readonly string[];
  }): Promise<boolean>;
  /**
   * As divisões de um campeonato (R-204), cada uma com a classificação FINAL da
   * edição corrente (derivada dos jogos, R-178) e as vagas de acesso/rebaixamento
   * da config. É o que o rollover do campeonato lê para trocar os clubes de
   * divisão. Ordenadas por `tier` (1 = topo).
   */
  findChampionshipDivisions(
    gameWorldId: string,
    championshipId: string,
  ): Promise<readonly ChampionshipDivisionResult[]>;
}

export interface ChampionshipDivisionResult {
  readonly competitionId: string;
  readonly tier: number;
  readonly lifecycle: CompetitionLifecycle;
  readonly startsOn: string | null;
  readonly endsOn: string | null;
  /** Classificação final da edição corrente (1º primeiro). */
  readonly orderedClubIds: readonly string[];
  readonly promotionSlots: number;
  readonly relegationSlots: number;
}

export interface CompetitionRepositories {
  readonly competitions: CompetitionAggregateRepository;
  /** C9 — o razão, para a homologação pagar os prêmios (R-205). */
  readonly ledger: LedgerRepository;
}

export interface CompetitionUnitOfWork {
  run<T>(work: (repositories: CompetitionRepositories) => Promise<T>): Promise<T>;
}

/** A config padrão de um formato — o rascunho nasce sensato, o admin ajusta. */
export function defaultConfigForFormat(
  format: CompetitionFormat,
): CompetitionConfig {
  return format === CompetitionFormat.ROUND_ROBIN ||
    format === CompetitionFormat.DOUBLE_ROUND_ROBIN
    ? defaultLeagueConfig()
    : defaultKnockoutConfig();
}

export interface CreateCompetitionInput {
  readonly id: string;
  readonly gameWorldId: string;
  readonly name: string;
  readonly type: CompetitionType;
  readonly format: CompetitionFormat;
  readonly tier: number | null;
  readonly reputation?: number;
  /** Campeonato (pirâmide) da divisão (R-204); null/omitido = liga avulsa. */
  readonly championshipId?: string | null;
  readonly config?: CompetitionConfig;
}

export class CreateCompetition {
  public constructor(private readonly unitOfWork: CompetitionUnitOfWork) {}

  public execute(
    input: CreateCompetitionInput,
  ): Promise<Result<{ competitionId: string }, DomainError>> {
    return run(this.unitOfWork, async (repos) => {
      const existing = await repos.competitions.findCompetitionById(
        input.gameWorldId,
        input.id,
      );
      if (existing !== null) {
        return fail(
          new DomainError("COMPETITION_EXISTS", "Essa competição já existe."),
        );
      }
      const created = Competition.create(
        {
          id: input.id,
          gameWorldId: input.gameWorldId,
          name: input.name,
          type: input.type,
          format: input.format,
          tier: input.tier,
          reputation: input.reputation ?? 50,
          championshipId: input.championshipId ?? null,
        },
        input.config ?? defaultConfigForFormat(input.format),
      );
      if (!created.ok) return created;
      await repos.competitions.saveCompetition(created.value.snapshot(), 0);
      return succeed({ competitionId: input.id });
    });
  }
}

export interface ConfigureCompetitionInput {
  readonly gameWorldId: string;
  readonly competitionId: string;
  readonly patch: ConfigureCompetitionPatch;
}

export class ConfigureCompetition {
  public constructor(private readonly unitOfWork: CompetitionUnitOfWork) {}

  public execute(
    input: ConfigureCompetitionInput,
  ): Promise<Result<{ competitionId: string }, DomainError>> {
    return run(this.unitOfWork, async (repos) => {
      const snap = await repos.competitions.findCompetitionById(
        input.gameWorldId,
        input.competitionId,
      );
      if (snap === null) {
        return fail(
          new DomainError("COMPETITION_NOT_FOUND", "Competição não encontrada."),
        );
      }
      const agg = Competition.fromSnapshot(snap);
      if (!agg.ok) return agg;
      const configured = agg.value.configure(input.patch);
      if (!configured.ok) return configured;
      await repos.competitions.saveCompetition(agg.value.snapshot(), snap.version);
      return succeed({ competitionId: input.competitionId });
    });
  }
}

/** Uma transição sem payload (lock/start/finish). */
type Transition = "lock" | "start" | "finish";

export interface CompetitionTransitionInput {
  readonly gameWorldId: string;
  readonly competitionId: string;
}

/** Carrega, aplica a transição do agregado e salva com concorrência otimista. */
function applyTransition(
  unitOfWork: CompetitionUnitOfWork,
  input: CompetitionTransitionInput,
  transition: Transition,
): Promise<Result<{ competitionId: string }, DomainError>> {
  return run(unitOfWork, async (repos) => {
    const snap = await repos.competitions.findCompetitionById(
      input.gameWorldId,
      input.competitionId,
    );
    if (snap === null) {
      return fail(
        new DomainError("COMPETITION_NOT_FOUND", "Competição não encontrada."),
      );
    }
    const agg = Competition.fromSnapshot(snap);
    if (!agg.ok) return agg;
    const moved = agg.value[transition]();
    if (!moved.ok) return moved;
    await repos.competitions.saveCompetition(agg.value.snapshot(), snap.version);
    return succeed({ competitionId: input.competitionId });
  });
}

/**
 * Trava a competição (RASCUNHO→AGENDADA) e, no mesmo commit, materializa o
 * sorteio + o calendário (R-206). Congelar a config sem gerar os jogos deixaria
 * uma competição agendada e vazia; por isso os dois efeitos são atômicos.
 */
export class LockCompetition {
  public constructor(private readonly unitOfWork: CompetitionUnitOfWork) {}

  public execute(
    input: CompetitionTransitionInput,
  ): Promise<Result<{ competitionId: string }, DomainError>> {
    return run(this.unitOfWork, async (repos) => {
      const snap = await repos.competitions.findCompetitionById(
        input.gameWorldId,
        input.competitionId,
      );
      if (snap === null) {
        return fail(
          new DomainError("COMPETITION_NOT_FOUND", "Competição não encontrada."),
        );
      }
      const agg = Competition.fromSnapshot(snap);
      if (!agg.ok) return agg;
      const locked = agg.value.lock();
      if (!locked.ok) return locked;
      const next = agg.value.snapshot();
      await repos.competitions.saveCompetition(next, snap.version);

      // A janela é garantida não-nula pelo lock (validateForLock).
      const draws = generateSchedule({
        format: next.format,
        clubIds: next.clubIds,
        startsOn: next.startsOn ?? "",
        endsOn: next.endsOn ?? "",
        legs: next.config.rules.legs,
        groupCount: next.config.rules.groupCount,
      });
      await repos.competitions.materializeSchedule(
        input.gameWorldId,
        input.competitionId,
        draws,
      );
      return succeed({ competitionId: input.competitionId });
    });
  }
}

/** Começa (AGENDADA→EM_ANDAMENTO). */
export class StartCompetition {
  public constructor(private readonly unitOfWork: CompetitionUnitOfWork) {}
  public execute(input: CompetitionTransitionInput) {
    return applyTransition(this.unitOfWork, input, "start");
  }
}

export interface HomologateCompetitionInput {
  readonly gameWorldId: string;
  readonly competitionId: string;
  /** Seed do mundo, para ids determinísticos dos lançamentos (R-182). */
  readonly worldSeed: string;
  /** Data do mundo na homologação (R-177). */
  readonly occurredOn: string;
  readonly seasonNumber?: number;
}

/**
 * Homologa a competição (EM_ANDAMENTO→ENCERRADA) e PAGA os prêmios no mesmo
 * commit (C7-V6, R-205): lê a classificação final (projeção dos jogos, R-178) e
 * credita cada clube pelo razão — cota de participação + prêmio por posição, e o
 * prêmio do artilheiro ao clube dele. O dinheiro entra por faucet do sistema
 * (`SYS:PRIZE_FAUCET`, criado sob demanda), preservando Σdébito=Σcrédito.
 *
 * Acesso/rebaixamento fica para depois (precisa de divisões, C7-V3b).
 */
export class FinishCompetition {
  public constructor(private readonly unitOfWork: CompetitionUnitOfWork) {}

  public execute(
    input: HomologateCompetitionInput,
  ): Promise<Result<{ competitionId: string }, DomainError>> {
    return run(this.unitOfWork, async (repos) => {
      const snap = await repos.competitions.findCompetitionById(
        input.gameWorldId,
        input.competitionId,
      );
      if (snap === null) {
        return fail(
          new DomainError("COMPETITION_NOT_FOUND", "Competição não encontrada."),
        );
      }
      const agg = Competition.fromSnapshot(snap);
      if (!agg.ok) return agg;
      const finished = agg.value.finish();
      if (!finished.ok) return finished;
      await repos.competitions.saveCompetition(agg.value.snapshot(), snap.version);

      const results = await repos.competitions.findEditionResults(
        input.gameWorldId,
        input.competitionId,
      );
      if (results !== null) {
        const paid = await payPrizes(repos, input, snap, results);
        if (!paid.ok) return paid;
      }
      // As partidas terminadas viram oficiais (C5-V3): sem homologação, a
      // competição encerra mas os jogos ficam "só simulados", não confirmados.
      await repos.competitions.homologateEditionMatches(
        input.gameWorldId,
        input.competitionId,
      );
      return succeed({ competitionId: input.competitionId });
    });
  }
}

/** Credita os prêmios da config pelo razão (R-205). Um lançamento por clube. */
async function payPrizes(
  repos: CompetitionRepositories,
  input: HomologateCompetitionInput,
  snap: CompetitionAggregateSnapshot,
  results: EditionResults,
): Promise<Result<void, DomainError>> {
  const prizes = snap.config.prizes;
  const seasonNumber = input.seasonNumber ?? 1;
  const timestampMilliseconds = Date.parse(`${input.occurredOn}T00:00:00.000Z`);
  const uuid = (context: string) =>
    deterministicUuidV7({
      worldSeed: input.worldSeed,
      context: `${input.competitionId}:${context}`,
      timestampMilliseconds,
    });

  const faucet = await ensurePrizeFaucet(
    repos.ledger,
    input.gameWorldId,
    uuid("prize-faucet"),
  );

  const standings = buildStandings(results.clubIds, results.finishedMatches);
  const participation = BigInt(prizes.participationMinor);

  // A cada clube: participação + prêmio da colocação final.
  for (let rank = 0; rank < standings.length; rank += 1) {
    const clubId = standings[rank]!.clubId;
    const positionMinor = BigInt(prizes.positionMinor[rank] ?? "0");
    const total = participation + positionMinor;
    const posted = await postPrize(repos.ledger, {
      gameWorldId: input.gameWorldId,
      clubId,
      amountMinor: total,
      description: `Premiação (${rank + 1}º) — ${snap.name}`,
      entryId: uuid(`prize:${clubId}`),
      sourceEventId: uuid(`prize-event:${clubId}`),
      faucetAccountId: faucet.id,
      seasonNumber,
      occurredOn: input.occurredOn,
    });
    if (!posted.ok) return posted;
  }

  // Prêmio do artilheiro ao clube dele.
  const topScorerMinor = BigInt(prizes.topScorerMinor);
  if (results.topScorer !== null && topScorerMinor > 0n) {
    const posted = await postPrize(repos.ledger, {
      gameWorldId: input.gameWorldId,
      clubId: results.topScorer.clubId,
      amountMinor: topScorerMinor,
      description: `Prêmio de artilheiro — ${snap.name}`,
      entryId: uuid(`topscorer:${results.topScorer.playerId}`),
      sourceEventId: uuid(`topscorer-event:${results.topScorer.playerId}`),
      faucetAccountId: faucet.id,
      seasonNumber,
      occurredOn: input.occurredOn,
    });
    if (!posted.ok) return posted;
  }

  return succeed(undefined);
}

/** Encontra ou cria o faucet de prêmio do mundo (aditivo — a gênese não o cria). */
async function ensurePrizeFaucet(
  ledger: LedgerRepository,
  gameWorldId: string,
  id: string,
): Promise<LedgerAccountSnapshot> {
  const existing = await ledger.findAccount(
    gameWorldId as never,
    AccountOwnerScope.WORLD,
    "SYS:PRIZE_FAUCET",
  );
  if (existing !== null) return existing;
  const account: LedgerAccountSnapshot = {
    id,
    gameWorldId,
    ownerScope: AccountOwnerScope.WORLD,
    clubId: null,
    systemAccount: SystemAccount.SYS_PRIZE_FAUCET,
    accountCode: "SYS:PRIZE_FAUCET",
    accountType: FinancialAccountType.SYSTEM_FAUCET,
    normalSide: AccountNormalSide.CREDIT,
    currencyId: BASE_CURRENCY_ID,
    version: 1,
  } as LedgerAccountSnapshot;
  await ledger.saveAccount(account, null);
  return account;
}

/** Um prêmio: DÉBITO no caixa do clube (ativo sobe), CRÉDITO no faucet. */
async function postPrize(
  ledger: LedgerRepository,
  p: {
    gameWorldId: string;
    clubId: string;
    amountMinor: bigint;
    description: string;
    entryId: string;
    sourceEventId: string;
    faucetAccountId: string;
    seasonNumber: number;
    occurredOn: string;
  },
): Promise<Result<void, DomainError>> {
  if (p.amountMinor <= 0n) return succeed(undefined);
  const cash = await ledger.findAccount(
    p.gameWorldId as never,
    AccountOwnerScope.CLUB,
    `CASH:${p.clubId}`,
  );
  if (cash === null) {
    return fail(
      new DomainError("LEDGER_ACCOUNT_MISSING", "Conta de caixa não existe."),
    );
  }
  const entry = JournalEntry.post({
    id: p.entryId,
    gameWorldId: p.gameWorldId as never,
    clubId: p.clubId as never,
    currencyId: BASE_CURRENCY_ID,
    flowClass: MoneyFlowClass.FAUCET,
    description: p.description,
    sourceEventId: p.sourceEventId,
    seasonNumber: p.seasonNumber,
    occurredOn: p.occurredOn,
    lines: [
      {
        financialAccountId: cash.id,
        direction: JournalLineDirection.DEBIT,
        amountMinor: p.amountMinor,
        currencyId: BASE_CURRENCY_ID,
      },
      {
        financialAccountId: p.faucetAccountId,
        direction: JournalLineDirection.CREDIT,
        amountMinor: p.amountMinor,
        currencyId: BASE_CURRENCY_ID,
      },
    ],
  });
  if (!entry.ok) return entry;
  await ledger.appendJournalEntry(entry.value.snapshot());
  return succeed(undefined);
}

class Rollback extends Error {
  public constructor(public readonly domainError: DomainError) {
    super(domainError.message);
  }
}

async function run<T>(
  unitOfWork: CompetitionUnitOfWork,
  work: (
    repositories: CompetitionRepositories,
  ) => Promise<Result<T, DomainError>>,
): Promise<Result<T, DomainError>> {
  try {
    return await unitOfWork.run(async (repositories) => {
      const result = await work(repositories);
      if (!result.ok) throw new Rollback(result.error);
      return result;
    });
  } catch (error) {
    if (error instanceof Rollback) return fail(error.domainError);
    throw error;
  }
}
