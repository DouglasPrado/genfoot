import {
  ActivateProvisionedWorld,
  AdvanceWorldDays,
  ApplyClubIdentity,
  ArchiveWorld,
  CloseSeasonFinances,
  ConfirmOnboarding,
  CreateWorld,
  DeleteWorld,
  EndClubControl,
  GenerateWorldGenesis,
  PlayNextRound,
  SignPlayer,
  PromoteYouthPlayer,
  DemoteToYouthPlayer,
  ReleasePlayer,
  SellPlayer,
  ListPlayer,
  CreateCompetition,
  ConfigureCompetition,
  LockCompetition,
  StartCompetition,
  FinishCompetition,
  defaultLeagueConfig,
  SetOfflinePlan,
  SaveAutomation,
  ToggleAutomation,
  RunClubAutopilot,
  SetWorldClock,
  AdvanceWorldOneDay,
  InspectWorld,
  JoinWorld,
  PauseWorld,
  ReleaseClubReservation,
  RequestClubSwitch,
  ReserveClub,
  ResumeWorld,
  SetWorldIdentity,
  SetTrainingPlan,
  AccrueClubTraining,
  ApplySeasonAccruals,
  ApplySeasonAging,
  StartTrainingSession,
  CollectTrainingSession,
  SettleDueTrainingSessions,
  SettleDueGroupTrainingSessions,
  TalkToPlayer,
  TalkStance,
  talkStanceFormDelta,
  seasonIdFor,
  generateYouthClass,
  TrainingFocus,
  type ClubControlRepository,
  type ClubReadModel,
  type ClubUnitOfWork,
  type GenesisUnitOfWork,
  type MatchPlayRepository,
  type PresenceRepository,
  type WorldClockRepository,
  type CompetitionReadModel,
  type TrainingPlanRepository,
  type TrainingContextReader,
  type AccrualContextReader,
  type AccrualBufferWriter,
  type SeasonAccrualUnitOfWork,
  type SeasonAgingUnitOfWork,
  type SeasonLifecycleRepository,
  type TrainingSessionUnitOfWork,
  type CohesionTrainingUnitOfWork,
  TrainFormationCohesion,
  StartGroupTrainingSession,
  CollectGroupTrainingSession,
  type GroupTrainingSessionUnitOfWork,
  type LineupRepository,
  type LineupContextReader,
  SetClubLineup,
  type PlayerRepository,
  type PushTokenRepository,
  type AiTrainingUnitOfWork,
  type IndividualTrainingPlanRepository,
  type IndividualTrainingUnitOfWork,
  type IndividualTrainingTarget,
  SetIndividualTrainingPlan,
  SettleDueIndividualTrainingPlans,
  SettleTrainingInjuries,
  OpenInjuryEpisode,
  type MentorshipRepository,
  type MedicalUnitOfWork,
  type MedicalRepositories,
  type MentorshipUnitOfWork,
  LinkMentor,
  UnlinkMentor,
  SettleDueMentorships,
  type CollectiveTrainingUnitOfWork,
  SettleDueCollectiveTraining,
  RegisterPushToken,
  RunAiClubsTraining,
  buildTrainingReportMessage,
  type SeasonFinanceUnitOfWork,
  type TransferUnitOfWork,
  type PromoteYouthUnitOfWork,
  type DemoteToYouthUnitOfWork,
  type ReleaseUnitOfWork,
  type SellUnitOfWork,
  type ListUnitOfWork,
  type CompetitionUnitOfWork,
  type AutomationUnitOfWork,
  type OfflinePlan,
  type ConfigureCompetitionPatch,
  type ClubRepository,
  type IdentityUnitOfWork,
  type WorldDomainEvent,
  type WorldMutationResult,
  type WorldRepository,
} from "@grinta/core";
import {
  DomainError,
  WorldDate,
  fail,
  parseGameWorldId,
  parseRulesetVersion,
  succeed,
  type Result,
} from "@grinta/shared";
import { randomUUID } from "node:crypto";

import { z } from "zod";

import type { CommandEnvelope } from "./command-contract.js";
import {
  sendExpoPush,
  type ExpoPushMessage,
} from "../push/expo-push-sender.js";

/**
 * O barramento de commands depois do extermínio da arquitetura morta (R-175).
 *
 * Eram ~148 commands sobre 16 mega-agregados e o adapter JSON. **Sobraram 10** —
 * os que uma vertical viva exige hoje: o admin criando um mundo, gerando os
 * clubes, ativando e apagando; e o jogador entrando e escolhendo clube.
 *
 * Os outros não foram adiados: foram APAGADOS, com os contextos que os serviam.
 * Voltam um a um, já em agregado por entidade sobre Postgres, quando uma tela
 * precisar deles — e aí nascem certos na primeira vez. Construir 148 commands
 * antes de qualquer cliente provar que eram os certos foi o que produziu 16
 * contextos completos convivendo com 11 de 114 telas.
 *
 * Não há mais `repository: JsonWorldRepository` no contexto. Só Postgres.
 */

export interface CommandOutcome {
  readonly resource: string | null;
  readonly mutation?: WorldMutationResult;
}

export interface CommandContext {
  /** Escopo transacional de C1 (R-175/R-176): agregado e evento no mesmo commit. */
  readonly identityUnitOfWork: IdentityUnitOfWork;
  /** O mundo é tabela, sempre (R-173/R-182). Raiz de tudo: todo command o lê. */
  readonly worlds: WorldRepository;
  /** C3 — o clube é tabela. É o que destrava `identity:reserve-club`. */
  readonly clubs: ClubRepository;
  /** C1 — só para perguntar se alguém está jogando antes de apagar o mundo. */
  readonly controls: ClubControlRepository;
  /** Escopo transacional de C3: clube + evento no mesmo commit (Decisão 19.10). */
  readonly clubUnitOfWork: ClubUnitOfWork;
  /** A gênese é atômica: 16 clubes + 368 jogadores + 16 elencos numa transação. */
  readonly genesisUnitOfWork: GenesisUnitOfWork;
  /** C5 — joga a próxima rodada da liga (simulação determinística). */
  readonly matchPlay: MatchPlayRepository;
  /** X-001 — a presença do usuário no mundo (heartbeat). */
  readonly presence: PresenceRepository;
  /** MUNDO-V1 — o relógio do mundo (config de tempo por dia lógico). */
  readonly worldClock: WorldClockRepository;
  /** MUNDO-V2 — o motor do dia lê as competições para iniciar/homologar por data. */
  readonly competitionReadModel: CompetitionReadModel;
  readonly trainingPlanRepository: TrainingPlanRepository;
  readonly trainingContextReader: TrainingContextReader;
  readonly accrualContextReader: AccrualContextReader;
  readonly accrualBufferWriter: AccrualBufferWriter;
  readonly seasonAccrualUnitOfWork: SeasonAccrualUnitOfWork;
  readonly seasonAgingUnitOfWork: SeasonAgingUnitOfWork;
  /** R-219 — materialização da temporada como entidade do mundo. */
  readonly seasonLifecycle: SeasonLifecycleRepository;
  /** R-221 Fase 2a — treino de sessão com progresso instantâneo. */
  readonly trainingSessionUnitOfWork: TrainingSessionUnitOfWork;
  readonly cohesionTrainingUnitOfWork: CohesionTrainingUnitOfWork;
  readonly groupTrainingUnitOfWork: GroupTrainingSessionUnitOfWork;
  /** R-220 Fase 1 — escalação corrente do clube + leitura do elenco. */
  readonly clubLineupRepository: LineupRepository;
  readonly lineupContextReader: LineupContextReader;
  readonly playerRepository: PlayerRepository;
  /** Push remoto (Expo) — registro do token do device por conta. */
  readonly pushTokenRepository: PushTokenRepository;
  /** Treino dos clubes de IA na virada (balanceamento). */
  readonly aiTrainingUnitOfWork: AiTrainingUnitOfWork;
  readonly individualTrainingPlanRepository: IndividualTrainingPlanRepository;
  readonly individualTrainingUnitOfWork: IndividualTrainingUnitOfWork;
  /** Departamento médico: settle da virada (gatilho MED-1 por carga). */
  readonly medicalUnitOfWork: MedicalUnitOfWork;
  readonly mentorshipRepository: MentorshipRepository;
  readonly mentorshipUnitOfWork: MentorshipUnitOfWork;
  readonly collectiveTrainingUnitOfWork: CollectiveTrainingUnitOfWork;
  /** C6 — a transferência atômica: dinheiro + contrato + elenco (R-192). */
  readonly transferUnitOfWork: TransferUnitOfWork;
  /** C8 — sobe um jovem da base ao profissional (atômico sobre os dois elencos). */
  readonly promoteYouthUnitOfWork: PromoteYouthUnitOfWork;
  /** C8 — desce um profissional (≤21) de volta à base (atômico sobre os dois elencos). */
  readonly demoteToYouthUnitOfWork: DemoteToYouthUnitOfWork;
  /** C6 — dispensa um jogador (tira do elenco + encerra contrato). */
  readonly releaseUnitOfWork: ReleaseUnitOfWork;
  /** C6/C9 — vende um jogador ao mercado (crédito do valor via faucet, R-199). */
  readonly sellUnitOfWork: SellUnitOfWork;
  /** C6 — coloca um jogador à venda (cria a TransferListing). */
  readonly listUnitOfWork: ListUnitOfWork;
  /** C7 — competição autorada: criar, configurar, travar, iniciar, homologar (R-202). */
  readonly competitionUnitOfWork: CompetitionUnitOfWork;
  /** X-001 — o plano offline do clube: o que a IA pode decidir na ausência. */
  readonly automationUnitOfWork: AutomationUnitOfWork;
  /** C9 — o débito de custos de UM clube no encerramento de temporada. */
  readonly seasonFinanceUnitOfWork: SeasonFinanceUnitOfWork;
  /** Para iterar os clubes do mundo na virada (o débito roda para cada um). */
  readonly clubReadModel: ClubReadModel;
  /**
   * Quem agiu — a conta do JOGO, vinda da SESSÃO.
   *
   * Nunca do payload: o evento grava `actorId`, e quem é o ator é o token que
   * chegou, não o que o cliente escreveu. Um `actorId` de payload deixaria
   * qualquer um assinar o rebranding em nome de outro.
   *
   * `null` = comando de sistema (admin, scheduler) — o `actorType` do evento
   * vira SYSTEM.
   */
  readonly actorId: string | null;
  readonly envelope: CommandEnvelope;
}

export type CommandHandler = (
  context: CommandContext,
) => Promise<Result<CommandOutcome, DomainError>>;

function invalidPayload(error: z.ZodError): DomainError {
  return new DomainError("COMMAND_PAYLOAD_INVALID", error.message);
}

/**
 * A confirmação vai no PAYLOAD, e é checada no domínio.
 *
 * Uma confirmação que mora só no modal não protege nada: quem chama a API direto
 * — script, curl, um bug de outra tela — apaga o mundo sem digitar coisa alguma.
 * O modal pede nome e uuid porque é bom para o operador; o comando exige o seed
 * porque é o que impede o acidente.
 */
const deleteWorldPayload = z.object({
  confirmSeed: z.string().min(1),
});

/**
 * `ApplyClubIdentity` (catálogo `:386`, risco baixo, MF-25).
 *
 * O payload do catálogo é `{crestAssetId?, colors?, kitAssetId?, tributes?}` —
 * puramente cosmético. O nome/código NÃO estão lá, e é a extensão que o BC-003
 * fez conscientemente (892e0e9): a identidade do clube é um PERÍODO, e nome e
 * visual mudam juntos ao abrir um. Segui o modelo do BC-003 e os NOMES DE EVENTO
 * do catálogo — eles não conflitam.
 *
 * `expectedVersion` é obrigatório: concorrência otimista por agregado (R-175).
 * Sem ele, dois rebrandings simultâneos escreveriam um por cima do outro.
 */
const applyClubIdentityPayload = z.object({
  clubId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  name: z.string().min(1),
  // O catálogo canônico do domínio valida o resto (visual-identity-catalog):
  // aqui só a forma. Duplicar a regra de paleta seria dois donos para ela.
  shortCode: z.string().regex(/^[A-Z0-9]{2,5}$/u),
  visualIdentity: z
    .object({
      primaryColor: z.string(),
      secondaryColor: z.string(),
      tertiaryColor: z.string().nullable(),
      homeKitTemplateId: z.string(),
      awayKitTemplateId: z.string(),
      crestTemplateId: z.string(),
    })
    .optional(),
});

const promoteYouthPayload = z.object({
  clubId: z.string().uuid(),
  playerId: z.string().uuid(),
});

const signPlayerPayload = z.object({
  buyingClubId: z.string().uuid(),
  sellerClubId: z.string().uuid(),
  playerId: z.string().uuid(),
  feeMinor: z.union([z.string(), z.number()]).transform((v) => BigInt(v)),
  currentSeason: z.number().int().positive().default(1),
});

// ── Competição autorada (C7, R-202..R-207) ──────────────────────────────────
// O zod garante só a FORMA; as regras (nº par de clubes, potência de 2, janela
// coerente) são do agregado — duplicar aqui seria dois donos para a mesma regra.
const competitionTypeEnum = z.enum([
  "LEAGUE",
  "CUP",
  "SUPER_CUP",
  "INTERNATIONAL_CUP",
  "FRIENDLY",
]);
const competitionFormatEnum = z.enum([
  "ROUND_ROBIN",
  "DOUBLE_ROUND_ROBIN",
  "KNOCKOUT",
  "GROUPS_AND_KNOCKOUT",
  "SWISS",
]);
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);
const minor = z.string().regex(/^\d+$/u);

const createCompetitionPayload = z.object({
  name: z.string().min(1),
  type: competitionTypeEnum,
  format: competitionFormatEnum,
  tier: z.number().int().positive().nullable().default(null),
  reputation: z.number().int().min(0).max(100).optional(),
  /** Pirâmide (R-204): divisões do mesmo campeonato compartilham este id. */
  championshipId: z.string().uuid().nullable().optional(),
});

const competitionRulesSchema = z.object({
  pointsWin: z.number().int(),
  pointsDraw: z.number().int(),
  legs: z.union([z.literal(1), z.literal(2)]),
  promotionSlots: z.number().int().min(0),
  relegationSlots: z.number().int().min(0),
  tiebreakers: z
    .array(
      z.enum([
        "POINTS",
        "WINS",
        "GOAL_DIFFERENCE",
        "GOALS_FOR",
        "HEAD_TO_HEAD",
        "FAIR_PLAY",
        "DRAW",
      ]),
    )
    .min(1),
  groupCount: z.number().int().positive().nullable(),
  qualifiersPerGroup: z.number().int().positive().nullable(),
});
const competitionPrizesSchema = z.object({
  participationMinor: minor,
  winBonusMinor: minor,
  positionMinor: z.array(minor),
  topScorerMinor: minor,
  bestPlayerMinor: minor,
});
const competitionConfigSchema = z.object({
  rules: competitionRulesSchema,
  prizes: competitionPrizesSchema,
  qualifications: z.array(
    z.object({
      targetCompetitionId: z.string().uuid(),
      criteria: z.enum(["TOP_POSITIONS", "CHAMPION", "CUP_WINNER"]),
      slots: z.number().int().positive(),
    }),
  ),
});
const configureCompetitionPayload = z.object({
  competitionId: z.string().uuid(),
  name: z.string().min(1).optional(),
  type: competitionTypeEnum.optional(),
  format: competitionFormatEnum.optional(),
  tier: z.number().int().positive().nullable().optional(),
  clubIds: z.array(z.string().uuid()).optional(),
  startsOn: dateOnly.nullable().optional(),
  endsOn: dateOnly.nullable().optional(),
  config: competitionConfigSchema.optional(),
});

/**
 * Autoria de um CAMPEONATO inteiro (R-204): a pirâmide de divisões numa tacada.
 * Cada item de `divisions` é uma divisão (tier = posição no array, 1 = topo),
 * com seus clubes e as vagas de acesso/rebaixamento — o dono põe 0 no acesso do
 * topo e 0 no rebaixamento do fundo. Todas compartilham a janela e o mesmo
 * `championshipId`, gerado aqui, que liga a pirâmide para o rollover.
 */
const createChampionshipPayload = z.object({
  name: z.string().min(1),
  startsOn: dateOnly,
  endsOn: dateOnly,
  format: competitionFormatEnum.default("ROUND_ROBIN"),
  divisions: z
    .array(
      z.object({
        clubIds: z.array(z.string().uuid()).min(2),
        promotionSlots: z.number().int().min(0),
        relegationSlots: z.number().int().min(0),
      }),
    )
    .min(1),
  /** Premiação comum às divisões (opcional; padrão = sem prêmios). */
  prizes: competitionPrizesSchema.optional(),
});
const competitionTransitionPayload = z.object({
  competitionId: z.string().uuid(),
});

// X-001 — o plano offline. O zod só valida a FORMA; as invariantes (alto risco
// não delegável, coerência nível×profundidade) são do agregado ClubAIProfile.
const minorStr = z.string().regex(/^\d+$/u);
const setOfflinePlanPayload = z.object({
  clubId: z.string().uuid(),
  automationLevel: z.enum([
    "MANUAL",
    "ASSISTED",
    "SEMI_AUTOMATED",
    "FULLY_AUTOMATED",
  ]),
  offlineDecisionLevel: z.number().int(),
  lineupPolicy: z.string().min(1),
  substitutionPolicy: z.string().min(1),
  marketPolicy: z.string().min(1),
  crisisPolicy: z.string().min(1),
  authorityLimits: z.object({
    maxDebtMinor: minorStr,
    maxTransferSpendMinor: minorStr,
    canSellKeyPlayers: z.boolean(),
    canChangeIdentity: z.boolean(),
  }),
});

const saveAutomationPayload = z.object({
  clubId: z.string().uuid(),
  ruleId: z.string().uuid().optional(),
  activate: z.boolean().default(false),
  name: z.string().min(1),
  level: z.enum(["MANUAL", "ASSISTED", "SEMI_AUTOMATED", "FULLY_AUTOMATED"]),
  triggerEvent: z.string().min(1),
  condition: z.unknown().optional(),
  action: z.unknown().optional(),
  risk: z.number().int(),
  priority: z.number().int(),
});

const toggleAutomationPayload = z.object({
  clubId: z.string().uuid(),
  ruleId: z.string().uuid(),
  activate: z.boolean(),
});

// X-001 presença: só diz se está entrando (online) ou saindo. QUEM é o ator vem
// do token (actorId), nunca do payload.
const presencePayload = z.object({
  online: z.boolean().default(true),
});

const registerPushTokenPayload = z.object({
  expoPushToken: z.string().min(1),
  platform: z.enum(["ios", "android"]).default("ios"),
});

const runAutopilotPayload = z.object({
  clubId: z.string().uuid(),
  triggerEvent: z.string().min(1),
});

// MUNDO-V1 — o relógio: quantos segundos reais valem um dia lógico, e se roda.
const setClockPayload = z.object({
  realSecondsPerDay: z.number().int(),
  running: z.boolean().default(true),
});

const createWorldPayload = z.object({
  seed: z.string().min(1),
  startDate: z.string(),
  rulesetVersion: z.string().default("1.0.0"),
});

const advanceDaysPayload = z.object({
  days: z.number().int().positive(),
});

/**
 * Congelar e inativar aceitam um motivo, que viaja até o evento.
 *
 * Opcional de propósito: exigir motivo obrigatório em operação de incidente é
 * atrito na hora errada, e produz "asdf" como motivo. Ausente vira `null` — que
 * é "não disseram", e não uma string vazia fingindo texto.
 */
const worldLifecyclePayload = z.object({
  reason: z.string().trim().min(1).max(280).optional(),
});

/**
 * Identidade do mundo. Update parcial, e os três casos são distintos:
 * campo ausente = não mexe · `null` = limpa · texto = grava.
 *
 * `nullable().optional()` carrega essa diferença até o domínio. Um
 * `.optional()` sozinho tornaria "limpar o nome" inexprimível pela API.
 *
 * Os limites (60/500) NÃO são repetidos aqui: quem valida tamanho é o agregado,
 * e um número duplicado na borda vira dois números que divergem. O zod só
 * garante o tipo.
 */
const generateIntakePayload = z.object({
  seasonId: z.string().uuid(),
  size: z.number().int().positive().optional(),
});

const applySeasonPayload = z.object({
  seasonId: z.string().uuid(),
});

const accrueDayPayload = z.object({
  clubId: z.string().uuid(),
  seasonId: z.string().uuid(),
});

const talkToPlayerPayload = z.object({
  clubId: z.string().uuid(),
  playerId: z.string().uuid(),
  stance: z.nativeEnum(TalkStance),
});

const talkToSquadPayload = z.object({
  clubId: z.string().uuid(),
  stance: z.nativeEnum(TalkStance),
});

const startSessionPayload = z.object({
  clubId: z.string().uuid(),
  playerId: z.string().uuid(),
  // 1..5 habilidades; o domínio valida o limite e a aplicabilidade.
  attributeCodes: z.array(z.string()).min(1).max(5),
});

const collectSessionPayload = z.object({
  playerId: z.string().uuid(),
});

const setLineupPayload = z.object({
  clubId: z.string().uuid(),
  formation: z.string(),
  starters: z.array(z.string().uuid()),
  bench: z.array(z.string().uuid()),
  expectedVersion: z.number().int().nullable(),
});

const trainFormationPayload = z.object({
  clubId: z.string().uuid(),
});

const startGroupTrainingPayload = z.object({
  clubId: z.string().uuid(),
  formation: z.string(),
  participantIds: z.array(z.string().uuid()),
});

const collectGroupTrainingPayload = z.object({
  clubId: z.string().uuid(),
});

const trainingPlanPayload = z.object({
  clubId: z.string().uuid(),
  /**
   * OPCIONAL (espelha `player-development` e a query `training-plan`, R-221):
   * omitido → o handler materializa/resolve a temporada corrente do mundo. O
   * mobile não conhece o season, e exigi-lo aqui tornava o plano coletivo
   * inconstruível: nenhuma query devolvia esse uuid para a tela mandar de volta.
   */
  seasonId: z.string().uuid().optional(),
  name: z.string(),
  focus: z.nativeEnum(TrainingFocus),
  intensity: z.number().int(),
  entries: z.array(
    z.object({
      playerId: z.string().uuid(),
      focus: z.nativeEnum(TrainingFocus),
      workload: z.number().int(),
    }),
  ),
  expectedVersion: z.number().int().nullable(),
});

const individualTrainingPlanPayload = z.object({
  clubId: z.string().uuid(),
  playerId: z.string().uuid(),
  target: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("ATTRIBUTE"), attributeCodes: z.array(z.string()) }),
    z.object({ kind: z.literal("POSITION"), position: z.string() }),
    z.object({ kind: z.literal("GK_ARCHETYPE"), archetype: z.string() }),
  ]),
  intensity: z.number().int(),
  expectedVersion: z.number().int().nullable(),
});

const linkMentorPayload = z.object({
  clubId: z.string().uuid(),
  menteeId: z.string().uuid(),
  mentorId: z.string().uuid(),
  expectedVersion: z.number().int().nullable(),
});

const unlinkMentorPayload = z.object({
  clubId: z.string().uuid(),
  menteeId: z.string().uuid(),
});

const worldIdentityPayload = z.object({
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  // As CHAVES do objeto no R2, produzidas por POST /worlds/{id}/images/{kind}.
  // Não é URL: o agregado não conhece CDN.
  bannerKey: z.string().nullable().optional(),
  squarePhotoKey: z.string().nullable().optional(),
});

function requireWorldId(
  rawWorldId: string | undefined,
): Result<string, DomainError> {
  return rawWorldId === undefined
    ? fail(new DomainError("COMMAND_PAYLOAD_INVALID", "worldId é obrigatório."))
    : succeed(rawWorldId);
}

async function loadWorld(
  worlds: CommandContext["worlds"],
  rawWorldId: string | undefined,
) {
  const raw = requireWorldId(rawWorldId);
  if (!raw.ok) return raw;
  const worldId = parseGameWorldId(raw.value);
  if (!worldId.ok) return worldId;
  const world = await new InspectWorld(worlds).execute(worldId.value);
  if (!world.ok) return world;
  return succeed({ worldId: worldId.value, snapshot: world.value });
}

/**
 * A VIRADA de temporada (R-219/R-113): para cada temporada do mundo que fechou
 * no avanço, aplica treino (accrual) e idade (declínio+aposentadoria) chaveados
 * pelo id determinístico da temporada, e depois materializa a próxima ACTIVE e
 * reaponta `currentSeasonId`. Idempotente em todos os passos — reavançar não
 * reaplica. Compartilhado pelos dois caminhos de avanço (`world:advance-day` e
 * `world:advance-days`) para não divergirem. Finanças NÃO entram aqui (o
 * fechamento por clube é do handler plural, que tem o read model de clubes).
 */
async function applySeasonTurns(
  deps: Pick<CommandContext, "seasonAgingUnitOfWork" | "seasonLifecycle">,
  world: {
    readonly worldId: Parameters<ApplySeasonAging["execute"]>[0]["gameWorldId"];
    readonly seed: string;
    readonly startDate: string;
    readonly currentDate: string;
    readonly rulesetVersion: string;
  },
  closedSeasonNumbers: readonly number[],
): Promise<void> {
  if (closedSeasonNumbers.length === 0) return;
  // R-221: o CRESCIMENTO saiu da virada — o treino agora aplica na hora por
  // sessão. A virada só envelhece (R-217) e materializa a próxima temporada
  // (R-219). O accrual-na-virada (ApplySeasonAccruals) foi desligado daqui.
  const applyAging = new ApplySeasonAging(deps.seasonAgingUnitOfWork);
  for (const number of closedSeasonNumbers) {
    const closingSeasonId = seasonIdFor(world.seed, world.worldId, number);
    await applyAging.execute({
      gameWorldId: world.worldId,
      seasonId: closingSeasonId,
      worldSeed: world.seed,
      worldDate: world.currentDate,
      rulesetVersion: world.rulesetVersion as never,
    });
  }
  await deps.seasonLifecycle.ensureCurrentSeason({
    gameWorldId: world.worldId,
    worldSeed: world.seed,
    startDate: world.startDate,
    currentDate: world.currentDate,
  });
}

/**
 * Liberação do treino de sessão na VIRADA do dia (decisão do dono 2026-07-20,
 * emenda à R-220.2 / destrava a Trava B-08). Roda DEPOIS de avançar o relógio,
 * nos dois caminhos (`world:advance-day` / `world:advance-days`): toda sessão
 * individual que cumpriu sua duração (1 dia) é coletada — ganho aplicado, jogador
 * liberado — sem coleta manual. Idempotente (a sessão vira inativa ao settlar).
 */
async function settleDueTraining(
  deps: Pick<
    CommandContext,
    "trainingSessionUnitOfWork" | "pushTokenRepository"
  >,
  world: {
    readonly worldId: string;
    readonly seed: string;
    readonly currentDate: string;
    readonly rulesetVersion: string;
  },
): Promise<void> {
  const result = await new SettleDueTrainingSessions(
    deps.trainingSessionUnitOfWork,
  ).execute({
    gameWorldId: world.worldId,
    worldSeed: world.seed,
    worldDate: world.currentDate,
    rulesetVersion: world.rulesetVersion as never,
  });
  if (!result.ok) return;

  // Push de treino completo (best-effort, FORA da transação do domínio): para
  // cada sessão settlada, avisa o DONO do clube — jogador + atributo antes→depois.
  // Clube de IA (sem controlador) não tem token: a lista sai vazia e nada é enviado.
  const messages: ExpoPushMessage[] = [];
  for (const report of result.value.reports) {
    const tokens = await deps.pushTokenRepository.findTokensForClub(
      world.worldId,
      report.clubId,
    );
    if (tokens.length === 0) continue;
    const text = buildTrainingReportMessage({
      playerName: report.playerName,
      changes: report.changes,
    });
    for (const to of tokens) {
      messages.push({ to, title: text.title, body: text.body });
    }
  }
  await sendExpoPush(messages);
}

/**
 * Settle do treino em GRUPO na virada (irmão do individual): encerra as sessões
 * de grupo que cumpriram a duração — sobe o entrosamento e libera os
 * participantes — para que esquecer de coletar não prenda o grupo. Idempotente.
 */
async function settleDueGroupTraining(
  deps: Pick<CommandContext, "groupTrainingUnitOfWork">,
  world: { readonly worldId: string; readonly currentDate: string },
): Promise<void> {
  await new SettleDueGroupTrainingSessions(deps.groupTrainingUnitOfWork).execute({
    gameWorldId: world.worldId,
    worldDate: world.currentDate,
  });
}

/**
 * Treino dos clubes de IA na virada (balanceamento): desenvolve os jogadores e
 * sobe o entrosamento dos clubes SEM técnico humano, para não ficarem parados
 * enquanto o do jogador evolui. Best-effort: uma falha não derruba a virada.
 */
async function runAiTraining(
  deps: Pick<CommandContext, "aiTrainingUnitOfWork">,
  world: {
    readonly worldId: string;
    readonly seed: string;
    readonly currentDate: string;
    readonly rulesetVersion: string;
  },
): Promise<void> {
  try {
    await new RunAiClubsTraining(deps.aiTrainingUnitOfWork).execute({
      gameWorldId: world.worldId,
      worldSeed: world.seed,
      worldDate: world.currentDate,
      rulesetVersion: world.rulesetVersion as never,
    });
  } catch (err) {
    console.warn(`[ai-training] falha no treino dos clubes de IA: ${String(err)}`);
  }
}

/**
 * Settle do DEPARTAMENTO MÉDICO na virada: sorteia lesão por carga (F13/R-21)
 * e abre o episódio em EVALUATION. É o gatilho MED-1 — sem ele a máquina
 * médica existe mas nada a inicia. Best-effort: uma falha não derruba a virada.
 */
async function settleTrainingInjuries(
  deps: Pick<CommandContext, "medicalUnitOfWork">,
  world: {
    readonly worldId: string;
    readonly seed: string;
    readonly currentDate: string;
  },
): Promise<void> {
  try {
    await deps.medicalUnitOfWork.run(async (repos: MedicalRepositories) =>
      new SettleTrainingInjuries(
        repos.loads,
        new OpenInjuryEpisode(repos.episodes),
      ).execute({
        gameWorldId: world.worldId,
        worldSeed: world.seed,
        worldDate: world.currentDate,
      }),
    );
  } catch (err) {
    console.warn(`[medical] falha no settle de lesões: ${String(err)}`);
  }
}

/**
 * Settle dos planos INDIVIDUAIS na virada: aplica cada plano ao seu jogador
 * (desenvolvimento rumo ao alvo). Best-effort: uma falha não derruba a virada.
 */
async function settleIndividualTraining(
  deps: Pick<CommandContext, "individualTrainingUnitOfWork">,
  world: {
    readonly worldId: string;
    readonly seed: string;
    readonly currentDate: string;
    readonly rulesetVersion: string;
  },
): Promise<void> {
  try {
    await new SettleDueIndividualTrainingPlans(
      deps.individualTrainingUnitOfWork,
    ).execute({
      gameWorldId: world.worldId,
      worldSeed: world.seed,
      worldDate: world.currentDate,
      rulesetVersion: world.rulesetVersion as never,
    });
  } catch (err) {
    console.warn(`[individual-training] falha no settle individual: ${String(err)}`);
  }
}

/**
 * Settle da MENTORIA na virada: evolução acelerada dos pupilos. Best-effort:
 * uma falha não derruba a virada.
 */
async function settleMentorships(
  deps: Pick<CommandContext, "mentorshipUnitOfWork">,
  world: {
    readonly worldId: string;
    readonly seed: string;
    readonly currentDate: string;
    readonly rulesetVersion: string;
  },
): Promise<void> {
  try {
    await new SettleDueMentorships(deps.mentorshipUnitOfWork).execute({
      gameWorldId: world.worldId,
      worldSeed: world.seed,
      worldDate: world.currentDate,
      rulesetVersion: world.rulesetVersion as never,
    });
  } catch (err) {
    console.warn(`[mentorship] falha no settle de mentoria: ${String(err)}`);
  }
}

/**
 * Settle do plano COLETIVO na virada: desenvolve os jogadores pelo foco e grava
 * o aviso-resumo (fecha a lacuna do plano coletivo inerte). Best-effort.
 */
async function settleCollectiveTraining(
  deps: Pick<CommandContext, "collectiveTrainingUnitOfWork">,
  world: {
    readonly worldId: string;
    readonly seed: string;
    readonly currentDate: string;
    readonly rulesetVersion: string;
  },
): Promise<void> {
  try {
    await new SettleDueCollectiveTraining(
      deps.collectiveTrainingUnitOfWork,
    ).execute({
      gameWorldId: world.worldId,
      worldSeed: world.seed,
      worldDate: world.currentDate,
      rulesetVersion: world.rulesetVersion as never,
    });
  } catch (err) {
    console.warn(`[collective-training] falha no settle coletivo: ${String(err)}`);
  }
}

interface IdentityUseCase {
  execute(input: never): Promise<Result<unknown, DomainError>>;
}

/**
 * Os payloads de C1.
 *
 * Isto NÃO existia, e o buraco era real: o `ic()` repassava `...payload` como
 * `never` direto ao caso de uso. Um campo obrigatório ausente não virava
 * `COMMAND_PAYLOAD_INVALID` — descia até o Prisma e voltava como crash, com o
 * caminho do arquivo e o CÓDIGO-FONTE do adapter dentro da resposta HTTP.
 *
 * **Cada schema espelha o `Input` do caso de uso — não o que eu achava que ele
 * pedia.** A primeira versão destes schemas foi escrita de memória, e dois dos
 * seis estavam errados: `end-club-control` e `request-switch` pediam
 * `{accountId, clubId}` quando o domínio quer `controlId`. Uma validação
 * inventada é pior que nenhuma — ela RECUSA o payload certo e diz que a culpa é
 * do cliente. Só apareceu ao chamar por HTTP.
 *
 * `acceptInheritedState` é `literal(true)` e NÃO vai ao domínio: o catálogo o
 * define como a confirmação de assumir o clube COM o estado herdado — dívidas,
 * contratos, promessas — e marca o command como risco alto. `false` não é "outro
 * caminho", é ausência de consentimento; recusá-lo na borda deixa o domínio
 * livre de um flag que só pode valer `true`.
 */
const identityPayloads: Record<string, z.ZodType> = {
  // JoinWorldInput
  "identity:join-world": z.object({ accountId: z.string().uuid() }),
  // ReserveClubInput (o `attemptKey` vem do envelope, não do payload)
  "identity:reserve-club": z.object({
    accountId: z.string().uuid(),
    clubId: z.string().uuid(),
    expiresOn: z.string(),
  }),
  // ConfirmOnboardingInput + a confirmação de risco alto do catálogo (:81)
  "identity:confirm-onboarding": z.object({
    reservationId: z.string().uuid(),
    acceptInheritedState: z.literal(true),
  }),
  // ReleaseClubReservationInput
  "identity:release-club-reservation": z.object({
    reservationId: z.string().uuid(),
  }),
  /**
   * EndClubControlInput — `controlId`, não `clubId`: quem termina é o CONTROLE,
   * e o clube continua existindo (a IA assume, R-180).
   *
   * `cooldownDays` tem default aqui e isso é dívida declarada: ele é config de
   * mundo (`GameRuleConfig`) e volta para lá com C2 (R-182). O próprio input do
   * domínio já diz isso. 30 é o valor de R-26.
   */
  "identity:end-club-control": z.object({
    controlId: z.string().uuid(),
    reason: z.string().min(1),
    cooldownDays: z.number().int().nonnegative().default(30),
  }),
  // RequestClubSwitch É um ReserveClub por dentro — mesmo input.
  "identity:request-switch": z.object({
    accountId: z.string().uuid(),
    clubId: z.string().uuid(),
    expiresOn: z.string(),
  }),
};

/**
 * Adapter dos commands de C1.
 *
 * Sem `idempotencyKey` no input: cada comando é naturalmente idempotente pela
 * chave natural do banco. O `idempotencyKey` do envelope entra como
 * `attemptKey` — semente do id determinístico dos roots que são 1-por-VEZ
 * (reserva, controle), e é o que faz o retry devolver o mesmo id em vez de
 * criar uma segunda reserva.
 *
 * A tabela `IdempotencyKey` (R-176/R-184) é do barramento, não do caso de uso, e
 * ainda não está ligada aqui — pendência declarada.
 */
function ic(
  build: (unitOfWork: IdentityUnitOfWork) => IdentityUseCase,
): CommandHandler {
  return async ({ worlds, identityUnitOfWork, envelope }) => {
    const schema = identityPayloads[envelope.commandType];
    if (schema === undefined) {
      return fail(
        new DomainError(
          "COMMAND_PAYLOAD_INVALID",
          `Sem contrato de payload para ${envelope.commandType}.`,
        ),
      );
    }
    const parsed = schema.safeParse(envelope.payload ?? {});
    if (!parsed.success) return fail(invalidPayload(parsed.error));

    // O mundo é tabela (R-182): `seed` e `currentDate` vêm do Postgres, e o
    // mundo enfim é reproduzível a partir do banco.
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const input = {
      ...(parsed.data as Record<string, unknown>),
      gameWorldId: world.value.worldId,
      worldSeed: world.value.snapshot.seed,
      occurredOn: world.value.snapshot.currentDate,
      attemptKey: envelope.idempotencyKey,
      correlationId: envelope.correlationId,
    };
    try {
      const result = await build(identityUnitOfWork).execute(input as never);
      if (!result.ok) return result;
      return succeed({ resource: `identity:${world.value.worldId}` });
    } catch (error) {
      // A mensagem do erro NÃO vai para o cliente. Um erro do Prisma carrega o
      // caminho do arquivo e um trecho do código-fonte do adapter — vazar isso
      // numa resposta HTTP entrega o interior do servidor a quem chamou. O
      // detalhe vai para o log, onde tem dono.
      console.error(`[${envelope.commandType}] falhou:`, error);
      return fail(
        new DomainError("COMMAND_EXECUTION_FAILED", "Falha ao executar command."),
      );
    }
  };
}

const handlers: Record<string, CommandHandler> = {
  "world:create": async ({ worlds, envelope }) => {
    const parsed = createWorldPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const startDate = WorldDate.parse(parsed.data.startDate);
    if (!startDate.ok) return startDate;
    const ruleset = parseRulesetVersion(parsed.data.rulesetVersion);
    if (!ruleset.ok) return ruleset;
    const result = await new CreateWorld(worlds).execute({
      seed: parsed.data.seed,
      startDate: startDate.value,
      rulesetVersion: ruleset.value,
    });
    if (!result.ok) return result;
    return succeed({
      resource: `world:${result.value.world.id}`,
      mutation: result.value,
    });
  },

  /**
   * A gênese não é guardada (R-185): é função pura do `seed`, que R-182 tornou
   * coluna. O que este command persiste é o EFEITO dela — as linhas de `Club`.
   */
  "world:genesis": async ({ worlds, genesisUnitOfWork, envelope }) => {
    const raw = requireWorldId(envelope.worldId);
    if (!raw.ok) return raw;
    const worldId = parseGameWorldId(raw.value);
    if (!worldId.ok) return worldId;
    const result = await new GenerateWorldGenesis(
      worlds,
      genesisUnitOfWork,
    ).execute(worldId.value);
    if (!result.ok) return result;
    return succeed({ resource: `world:${worldId.value}` });
  },

  /**
   * Joga a próxima rodada não disputada da liga (C5). O placar emerge do kernel
   * determinístico a partir da força dos elencos — não é definido por ninguém.
   * A tabela (projeção, R-178) se preenche sozinha depois.
   */
  /**
   * Avança o relógio do mundo N dias (dev/admin). Ao cruzar a fronteira de
   * temporada (`SeasonRolledOver`), roda a VIRADA da temporada que acabou —
   * sozinha, sem command manual (R-219/R-113):
   *
   * 1. treino: aplica o accrual da temporada e zera o buffer (INV-29);
   * 2. idade: declínio físico + aposentadoria por idade (R-217);
   * 3. finanças: debita os custos da temporada no caixa de cada clube (R-45);
   * 4. materializa a próxima temporada `ACTIVE`, fecha as anteriores e reaponta
   *    `currentSeasonId`.
   *
   * Cada passo é chaveado pela temporada que fechou (id determinístico) e é
   * idempotente — reavançar não reaplica treino, não reenvelhece nem recobra. A
   * captação e o contrato de formação NÃO entram aqui (C6/C9, fora de escopo).
   */
  "world:advance-days": async ({
    worlds,
    clubReadModel,
    seasonFinanceUnitOfWork,
    seasonAgingUnitOfWork,
    seasonLifecycle,
    trainingSessionUnitOfWork,
    groupTrainingUnitOfWork,
    pushTokenRepository,
    aiTrainingUnitOfWork,
    individualTrainingUnitOfWork,
    medicalUnitOfWork,
    mentorshipUnitOfWork,
    collectiveTrainingUnitOfWork,
    playerRepository,
    envelope,
  }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = advanceDaysPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));

    // R-221 Fase 2b: a forma sara com o tempo — decai pelos dias avançados.
    await playerRepository.decayForma(world.value.worldId, parsed.data.days);

    const advanced = await new AdvanceWorldDays(worlds).execute(
      world.value.worldId,
      parsed.data.days,
    );
    if (!advanced.ok) return advanced;

    const worldId = world.value.worldId;
    const worldSeed = advanced.value.world.seed;
    const worldDate = advanced.value.world.currentDate;

    const rollovers = advanced.value.events.filter(
      (event): event is Extract<WorldDomainEvent, { type: "SeasonRolledOver" }> =>
        event.type === "SeasonRolledOver",
    );
    const closedNumbers = rollovers.map((r) => r.payload.seasonNumber);
    if (rollovers.length > 0) {
      // Finanças: débito por clube da temporada que fechou (plural-only — este é
      // o handler que tem o read model de clubes). Idempotente por (clube,
      // temporada); uma falha num clube não derruba os outros nem a virada.
      const worldView = await clubReadModel.worldView(worldId);
      const closer = new CloseSeasonFinances(seasonFinanceUnitOfWork);
      for (const seasonNumber of closedNumbers) {
        for (const club of worldView.clubs) {
          await closer.execute({
            gameWorldId: worldId,
            clubId: club.id,
            seasonNumber,
            worldSeed,
            occurredOn: worldDate,
          });
        }
      }
    }
    // Treino + idade + materialização da próxima temporada (R-219), compartilhado
    // com o caminho singular. No-op quando nenhuma fronteira foi cruzada.
    await applySeasonTurns(
      { seasonAgingUnitOfWork, seasonLifecycle },
      {
        worldId,
        seed: worldSeed,
        startDate: advanced.value.world.startDate,
        currentDate: worldDate,
        rulesetVersion: advanced.value.world.rulesetVersion,
      },
      closedNumbers,
    );
    // Virada do dia: libera quem terminou o treino de sessão (1 dia). Como o
    // avanço pode pular vários dias, uma sessão que venceu no meio é settlada
    // aqui na data final — o ganho é tetado na duração, então não infla.
    await settleDueTraining(
      { trainingSessionUnitOfWork, pushTokenRepository },
      {
        worldId,
        seed: worldSeed,
        currentDate: worldDate,
        rulesetVersion: advanced.value.world.rulesetVersion,
      },
    );
    await settleDueGroupTraining(
      { groupTrainingUnitOfWork },
      { worldId, currentDate: worldDate },
    );
    await runAiTraining(
      { aiTrainingUnitOfWork },
      {
        worldId,
        seed: worldSeed,
        currentDate: worldDate,
        rulesetVersion: advanced.value.world.rulesetVersion,
      },
    );
    await settleIndividualTraining(
      { individualTrainingUnitOfWork },
      {
        worldId,
        seed: worldSeed,
        currentDate: worldDate,
        rulesetVersion: advanced.value.world.rulesetVersion,
      },
    );
    // Departamento médico: a carga do dia pode lesionar (F13/R-21).
    await settleTrainingInjuries(
      { medicalUnitOfWork },
      { worldId, seed: worldSeed, currentDate: worldDate },
    );
    await settleMentorships(
      { mentorshipUnitOfWork },
      {
        worldId,
        seed: worldSeed,
        currentDate: worldDate,
        rulesetVersion: advanced.value.world.rulesetVersion,
      },
    );
    await settleCollectiveTraining(
      { collectiveTrainingUnitOfWork },
      {
        worldId,
        seed: worldSeed,
        currentDate: worldDate,
        rulesetVersion: advanced.value.world.rulesetVersion,
      },
    );

    return succeed({
      resource: `world:${worldId}`,
      mutation: advanced.value,
    });
  },

  "world:play-round": async ({ worlds, matchPlay, envelope }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const result = await new PlayNextRound(
      world.value.snapshot.seed,
      matchPlay,
    ).execute(world.value.worldId);
    if (!result.ok) return result;
    return succeed({ resource: `round:${result.value.roundNumber}` });
  },

  /**
   * A compra de verdade (C6/R-192). Dinheiro, contrato e elenco num só commit —
   * ou os três, ou nenhum. A taxa é validada na faixa da R-26 dentro do domínio.
   */
  "market:sign-player": async ({ worlds, transferUnitOfWork, envelope }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = signPlayerPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const result = await new SignPlayer(transferUnitOfWork).execute({
      gameWorldId: world.value.worldId,
      buyingClubId: parsed.data.buyingClubId,
      sellerClubId: parsed.data.sellerClubId,
      playerId: parsed.data.playerId,
      feeMinor: parsed.data.feeMinor,
      currentSeason: parsed.data.currentSeason,
      worldSeed: world.value.snapshot.seed,
      occurredOn: world.value.snapshot.currentDate,
    });
    if (!result.ok) return result;
    return succeed({ resource: `player:${parsed.data.playerId}` });
  },

  /** C8 — a promoção base→profissional. Move a membership entre os dois elencos. */
  /** Treino — define o plano do clube na temporada (M-TRAINING, doc 23 §9). */
  "training:set-plan": async ({
    worlds,
    trainingPlanRepository,
    trainingContextReader,
    seasonLifecycle,
    envelope,
  }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = trainingPlanPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    // seasonId omitido → materializa/resolve a temporada corrente (R-219). É
    // idempotente por (mundo, número), então chamar aqui não duplica nem reabre
    // temporada fechada — e conserta o mundo que nasceu sem `currentSeasonId`,
    // estado em que 2 dos 24 mundos de desenvolvimento se encontram.
    const seasonId =
      parsed.data.seasonId ??
      (
        await seasonLifecycle.ensureCurrentSeason({
          gameWorldId: world.value.worldId,
          worldSeed: world.value.snapshot.seed,
          startDate: world.value.snapshot.startDate,
          currentDate: world.value.snapshot.currentDate,
        })
      ).currentSeasonId;
    const result = await new SetTrainingPlan(
      trainingPlanRepository,
      trainingContextReader,
    ).execute({
      gameWorldId: world.value.worldId,
      clubId: parsed.data.clubId,
      seasonId,
      worldSeed: world.value.snapshot.seed,
      occurredOn: world.value.snapshot.currentDate,
      name: parsed.data.name,
      focus: parsed.data.focus,
      intensity: parsed.data.intensity,
      entries: parsed.data.entries,
      expectedVersion: parsed.data.expectedVersion,
    });
    if (!result.ok) return result;
    return succeed({ resource: `training-plan:${result.value.plan.id}` });
  },

  /** Treino — define o plano INDIVIDUAL de um jogador (M-TRAINING-INDIV). */
  "training:set-individual-plan": async ({
    worlds,
    individualTrainingPlanRepository,
    trainingContextReader,
    envelope,
  }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = individualTrainingPlanPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const result = await new SetIndividualTrainingPlan(
      individualTrainingPlanRepository,
      trainingContextReader,
    ).execute({
      gameWorldId: world.value.worldId,
      clubId: parsed.data.clubId,
      playerId: parsed.data.playerId,
      worldSeed: world.value.snapshot.seed,
      occurredOn: world.value.snapshot.currentDate,
      target: parsed.data.target as IndividualTrainingTarget,
      intensity: parsed.data.intensity,
      expectedVersion: parsed.data.expectedVersion,
    });
    if (!result.ok) return result;
    return succeed({
      resource: `individual-training-plan:${result.value.plan.id}`,
    });
  },

  /** Mentoria — vincula um mentor a um pupilo (M-MENTORING). */
  "mentoring:link-mentor": async ({
    worlds,
    mentorshipRepository,
    trainingContextReader,
    envelope,
  }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = linkMentorPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const result = await new LinkMentor(
      mentorshipRepository,
      trainingContextReader,
    ).execute({
      gameWorldId: world.value.worldId,
      clubId: parsed.data.clubId,
      menteeId: parsed.data.menteeId,
      mentorId: parsed.data.mentorId,
      worldSeed: world.value.snapshot.seed,
      occurredOn: world.value.snapshot.currentDate,
      expectedVersion: parsed.data.expectedVersion,
    });
    if (!result.ok) return result;
    return succeed({ resource: `mentorship:${result.value.link.id}` });
  },

  /** Mentoria — desvincula o mentor de um pupilo. */
  "mentoring:unlink-mentor": async ({
    worlds,
    mentorshipRepository,
    envelope,
  }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = unlinkMentorPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const result = await new UnlinkMentor(mentorshipRepository).execute({
      gameWorldId: world.value.worldId,
      clubId: parsed.data.clubId,
      menteeId: parsed.data.menteeId,
    });
    if (!result.ok) return result;
    return succeed({ resource: `mentorship:${parsed.data.menteeId}` });
  },

  /**
   * Treino da formação como fonte de ENTROSAMENTO (R-220 Fase 3): põe os
   * titulares para treinar a formação escolhida e sobe a coesão do time — o
   * meio-termo que faltava entre "jogar partida" (sobe) e "transferência" (cai).
   */
  "training:train-formation": async ({
    worlds,
    cohesionTrainingUnitOfWork,
    envelope,
  }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = trainFormationPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const result = await cohesionTrainingUnitOfWork.run((repos) =>
      new TrainFormationCohesion(repos.lineup, repos.cohesion).execute({
        gameWorldId: world.value.worldId,
        clubId: parsed.data.clubId,
      }),
    );
    if (!result.ok) return result;
    return succeed({ resource: `club:${parsed.data.clubId}` });
  },

  /** Treino em GRUPO: inicia a sessão cronometrada da formação (R-220.2). */
  "training:start-group-session": async ({
    worlds,
    groupTrainingUnitOfWork,
    envelope,
  }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = startGroupTrainingPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const result = await new StartGroupTrainingSession(
      groupTrainingUnitOfWork,
    ).execute({
      gameWorldId: world.value.worldId,
      clubId: parsed.data.clubId,
      formation: parsed.data.formation,
      participantIds: parsed.data.participantIds,
      worldSeed: world.value.snapshot.seed,
      worldDate: world.value.snapshot.currentDate,
    });
    if (!result.ok) return result;
    return succeed({ resource: `group-training:${result.value.session.id}` });
  },

  /** Treino em GRUPO: coleta — sobe o entrosamento e libera os participantes. */
  "training:collect-group-session": async ({
    worlds,
    groupTrainingUnitOfWork,
    envelope,
  }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = collectGroupTrainingPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const result = await new CollectGroupTrainingSession(
      groupTrainingUnitOfWork,
    ).execute({
      gameWorldId: world.value.worldId,
      clubId: parsed.data.clubId,
      worldDate: world.value.snapshot.currentDate,
    });
    if (!result.ok) return result;
    return succeed({ resource: `club:${parsed.data.clubId}` } as never);
  },

  /** Moral — conversa do treinador: elogiar/criticar move a FORMA (R-221 2c). */
  "morale:talk-to-player": async ({ worlds, playerRepository, envelope }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = talkToPlayerPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const result = await new TalkToPlayer(playerRepository).execute({
      gameWorldId: world.value.worldId,
      clubId: parsed.data.clubId,
      playerId: parsed.data.playerId,
      stance: parsed.data.stance,
    });
    if (!result.ok) return result;
    return succeed({
      resource: `player:${parsed.data.playerId}`,
      forma: result.value.formaModifier,
    } as never);
  },

  /**
   * Moral — conversa com o ELENCO: move a forma de TODO o elenco profissional
   * (R-221 2c).
   *
   * Dizia "titulares" e estava errado: `nudgeClubForma` alcança o squad
   * `FIRST_TEAM` inteiro, não a escalação. O comando é `talk-to-squad` — squad é
   * elenco, não time titular —, e conversa de vestiário atingir só quem joga
   * seria a regra estranha. O comentário é que estava fora, não o código.
   */
  "morale:talk-to-squad": async ({ worlds, playerRepository, envelope }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = talkToSquadPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    await playerRepository.nudgeClubForma(
      world.value.worldId,
      parsed.data.clubId,
      talkStanceFormDelta(parsed.data.stance),
    );
    return succeed({ resource: `club:${parsed.data.clubId}` });
  },

  /** Treino de sessão — inicia; o jogador some do jogo enquanto treina (R-221 2a). */
  "training:start-session": async ({
    worlds,
    trainingSessionUnitOfWork,
    envelope,
  }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = startSessionPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const result = await new StartTrainingSession(
      trainingSessionUnitOfWork,
    ).execute({
      gameWorldId: world.value.worldId,
      clubId: parsed.data.clubId,
      playerId: parsed.data.playerId,
      attributeCodes: parsed.data.attributeCodes,
      worldSeed: world.value.snapshot.seed,
      worldDate: world.value.snapshot.currentDate,
    });
    if (!result.ok) return result;
    return succeed({ resource: `training-session:${result.value.session.id}` });
  },

  /** Treino de sessão — coleta: aplica o ganho NA HORA e libera o jogador (R-221 2a). */
  "training:collect-session": async ({
    worlds,
    trainingSessionUnitOfWork,
    envelope,
  }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = collectSessionPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const result = await new CollectTrainingSession(
      trainingSessionUnitOfWork,
    ).execute({
      gameWorldId: world.value.worldId,
      playerId: parsed.data.playerId,
      worldSeed: world.value.snapshot.seed,
      worldDate: world.value.snapshot.currentDate,
      rulesetVersion: world.value.snapshot.rulesetVersion as never,
    });
    if (!result.ok) return result;
    return succeed({
      resource: `player:${parsed.data.playerId}`,
      gain: result.value,
    } as never);
  },

  /** Tática — define a escalação corrente do clube (M-LINEUP, R-220 Fase 1). */
  "tactics:set-lineup": async ({
    worlds,
    clubLineupRepository,
    lineupContextReader,
    envelope,
  }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = setLineupPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const result = await new SetClubLineup(
      clubLineupRepository,
      lineupContextReader,
    ).execute({
      gameWorldId: world.value.worldId,
      clubId: parsed.data.clubId,
      worldSeed: world.value.snapshot.seed,
      occurredOn: world.value.snapshot.currentDate,
      formation: parsed.data.formation,
      starters: parsed.data.starters,
      bench: parsed.data.bench,
      expectedVersion: parsed.data.expectedVersion,
    });
    if (!result.ok) return result;
    // Avisos de fora-de-posição viajam no envelope — a tela decide se alerta.
    return succeed({
      resource: `lineup:${result.value.lineup.id}`,
      warnings: result.value.warnings,
    } as never);
  },

  /** Treino — um dia de accrual: soma o ganho do plano ao buffer (R-212/R-113). */
  "training:accrue-day": async ({
    worlds,
    trainingPlanRepository,
    accrualContextReader,
    accrualBufferWriter,
    envelope,
  }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = accrueDayPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const result = await new AccrueClubTraining(
      trainingPlanRepository,
      accrualContextReader,
      accrualBufferWriter,
    ).execute({
      gameWorldId: world.value.worldId,
      clubId: parsed.data.clubId,
      seasonId: parsed.data.seasonId,
    });
    if (!result.ok) return result;
    return succeed({ resource: `club:${parsed.data.clubId}` });
  },

  /** Treino — virada: aplica o accrual da temporada e zera o buffer (INV-29). */
  "training:apply-season": async ({ worlds, seasonAccrualUnitOfWork, envelope }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = applySeasonPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const result = await new ApplySeasonAccruals(seasonAccrualUnitOfWork).execute({
      gameWorldId: world.value.worldId,
      seasonId: parsed.data.seasonId,
      worldSeed: world.value.snapshot.seed,
      worldDate: world.value.snapshot.currentDate,
      rulesetVersion: world.value.snapshot.rulesetVersion as never,
    });
    if (!result.ok) return result;
    return succeed({ resource: `season:${parsed.data.seasonId}` });
  },

  /** Treino/idade — virada: declínio físico + aposentadoria por idade (R-217). */
  "training:apply-season-aging": async ({ worlds, seasonAgingUnitOfWork, envelope }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = applySeasonPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const result = await new ApplySeasonAging(seasonAgingUnitOfWork).execute({
      gameWorldId: world.value.worldId,
      seasonId: parsed.data.seasonId,
      worldSeed: world.value.snapshot.seed,
      worldDate: world.value.snapshot.currentDate,
      rulesetVersion: world.value.snapshot.rulesetVersion as never,
    });
    if (!result.ok) return result;
    return succeed({ resource: `season:${parsed.data.seasonId}` });
  },

  /** Captação — gera a safra anual de candidatos soltos (R-218). Idempotente. */
  "youth:generate-intake": async ({ worlds, playerRepository, envelope }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = generateIntakePayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const cls = generateYouthClass({
      worldSeed: world.value.snapshot.seed,
      gameWorldId: world.value.worldId,
      seasonId: parsed.data.seasonId,
      worldStartDate: world.value.snapshot.startDate,
      ...(parsed.data.size === undefined ? {} : { size: parsed.data.size }),
    });
    let created = 0;
    for (const candidate of cls.candidates) {
      // Idempotência por id determinístico: se o candidato já existe, a safra já
      // foi gerada nesta temporada — não duplica.
      const existing = await playerRepository.findPlayerById(
        world.value.worldId as never,
        candidate.player.id as never,
      );
      if (existing !== null) continue;
      await playerRepository.savePlayer(candidate, null);
      created += 1;
    }
    return succeed({ resource: `intake:${parsed.data.seasonId}`, created } as never);
  },

  "youth:promote-player": async ({ worlds, promoteYouthUnitOfWork, envelope }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = promoteYouthPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const result = await new PromoteYouthPlayer(promoteYouthUnitOfWork).execute({
      gameWorldId: world.value.worldId,
      clubId: parsed.data.clubId,
      playerId: parsed.data.playerId,
      occurredOn: world.value.snapshot.currentDate,
    });
    if (!result.ok) return result;
    return succeed({ resource: `player:${parsed.data.playerId}` });
  },

  /** C8 — descer à base: profissional ≤ 21 volta ao YOUTH_ACADEMY. */
  /** C6 — dispensar: o clube encerra o vínculo e o jogador deixa o elenco. */
  /** C6/C9 — vender: o clube recebe o valor estimado, o jogador sai (R-199). */
  /** C6 — colocar à venda: anuncia o jogador no mercado (não move ninguém). */
  "market:list-player": async ({ worlds, listUnitOfWork, envelope }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = promoteYouthPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const result = await new ListPlayer(listUnitOfWork).execute({
      gameWorldId: world.value.worldId,
      clubId: parsed.data.clubId,
      playerId: parsed.data.playerId,
      worldSeed: world.value.snapshot.seed,
      worldDate: world.value.snapshot.currentDate,
      occurredOn: world.value.snapshot.currentDate,
    });
    if (!result.ok) return result;
    return succeed({ resource: `player:${parsed.data.playerId}` });
  },

  "market:sell-player": async ({ worlds, sellUnitOfWork, envelope }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = promoteYouthPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const result = await new SellPlayer(sellUnitOfWork).execute({
      gameWorldId: world.value.worldId,
      clubId: parsed.data.clubId,
      playerId: parsed.data.playerId,
      worldSeed: world.value.snapshot.seed,
      worldDate: world.value.snapshot.currentDate,
      currentSeason: 1,
      occurredOn: world.value.snapshot.currentDate,
    });
    if (!result.ok) return result;
    return succeed({ resource: `player:${parsed.data.playerId}` });
  },

  "market:release-player": async ({ worlds, releaseUnitOfWork, envelope }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = promoteYouthPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const result = await new ReleasePlayer(releaseUnitOfWork).execute({
      gameWorldId: world.value.worldId,
      clubId: parsed.data.clubId,
      playerId: parsed.data.playerId,
      occurredOn: world.value.snapshot.currentDate,
    });
    if (!result.ok) return result;
    return succeed({ resource: `player:${parsed.data.playerId}` });
  },

  "youth:demote-player": async ({ worlds, demoteToYouthUnitOfWork, envelope }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = promoteYouthPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const result = await new DemoteToYouthPlayer(demoteToYouthUnitOfWork).execute({
      gameWorldId: world.value.worldId,
      clubId: parsed.data.clubId,
      playerId: parsed.data.playerId,
      worldDate: world.value.snapshot.currentDate,
      occurredOn: world.value.snapshot.currentDate,
    });
    if (!result.ok) return result;
    return succeed({ resource: `player:${parsed.data.playerId}` });
  },

  // ── Competição autorada (C7, R-202) ──────────────────────────────────────
  "competition:create": async ({ worlds, competitionUnitOfWork, envelope }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = createCompetitionPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    // O id é autorado (não é artefato determinístico da gênese): a idempotência
    // vem do barramento (fingerprint do pedido), não de um seed de mundo.
    const id = randomUUID();
    const result = await new CreateCompetition(competitionUnitOfWork).execute({
      id,
      gameWorldId: world.value.worldId,
      name: parsed.data.name,
      type: parsed.data.type,
      format: parsed.data.format,
      tier: parsed.data.tier,
      ...(parsed.data.reputation !== undefined
        ? { reputation: parsed.data.reputation }
        : {}),
      ...(parsed.data.championshipId !== undefined
        ? { championshipId: parsed.data.championshipId }
        : {}),
    });
    if (!result.ok) return result;
    return succeed({ resource: `competition:${id}` });
  },

  // Autora um CAMPEONATO inteiro (R-204): cria, configura e trava cada divisão,
  // todas ligadas por um mesmo championshipId. Depois disso o motor do dia
  // (MUNDO-V2) as inicia, joga e, na virada, aplica o acesso/rebaixamento entre
  // elas. As divisões são autoradas — não nascem na gênese.
  "championship:create": async ({ worlds, competitionUnitOfWork, envelope }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = createChampionshipPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));

    const gameWorldId = world.value.worldId;
    const championshipId = randomUUID();
    const base = defaultLeagueConfig();
    const legs = parsed.data.format === "DOUBLE_ROUND_ROBIN" ? 2 : 1;

    for (let index = 0; index < parsed.data.divisions.length; index += 1) {
      const division = parsed.data.divisions[index]!;
      const tier = index + 1;
      const competitionId = randomUUID();
      const created = await new CreateCompetition(
        competitionUnitOfWork,
      ).execute({
        id: competitionId,
        gameWorldId,
        name: `${parsed.data.name} · Divisão ${tier}`,
        type: "LEAGUE",
        format: parsed.data.format,
        tier,
        championshipId,
      });
      if (!created.ok) return created;

      const configured = await new ConfigureCompetition(
        competitionUnitOfWork,
      ).execute({
        gameWorldId,
        competitionId,
        patch: {
          clubIds: division.clubIds,
          startsOn: parsed.data.startsOn,
          endsOn: parsed.data.endsOn,
          config: {
            rules: {
              ...base.rules,
              legs,
              promotionSlots: division.promotionSlots,
              relegationSlots: division.relegationSlots,
            },
            prizes: parsed.data.prizes ?? base.prizes,
            qualifications: [],
          },
        },
      });
      if (!configured.ok) return configured;

      const locked = await new LockCompetition(competitionUnitOfWork).execute({
        gameWorldId,
        competitionId,
      });
      if (!locked.ok) return locked;
    }
    return succeed({ resource: `championship:${championshipId}` });
  },

  "competition:configure": async ({
    worlds,
    competitionUnitOfWork,
    envelope,
  }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = configureCompetitionPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const { competitionId, ...patch } = parsed.data;
    const result = await new ConfigureCompetition(
      competitionUnitOfWork,
    ).execute({
      gameWorldId: world.value.worldId,
      competitionId,
      patch: patch as ConfigureCompetitionPatch,
    });
    if (!result.ok) return result;
    return succeed({ resource: `competition:${competitionId}` });
  },

  "competition:lock": async ({ worlds, competitionUnitOfWork, envelope }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = competitionTransitionPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const result = await new LockCompetition(competitionUnitOfWork).execute({
      gameWorldId: world.value.worldId,
      competitionId: parsed.data.competitionId,
    });
    if (!result.ok) return result;
    return succeed({ resource: `competition:${parsed.data.competitionId}` });
  },

  "competition:start": async ({ worlds, competitionUnitOfWork, envelope }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = competitionTransitionPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const result = await new StartCompetition(competitionUnitOfWork).execute({
      gameWorldId: world.value.worldId,
      competitionId: parsed.data.competitionId,
    });
    if (!result.ok) return result;
    return succeed({ resource: `competition:${parsed.data.competitionId}` });
  },

  "competition:finish": async ({ worlds, competitionUnitOfWork, envelope }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = competitionTransitionPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const result = await new FinishCompetition(competitionUnitOfWork).execute({
      gameWorldId: world.value.worldId,
      competitionId: parsed.data.competitionId,
      worldSeed: world.value.snapshot.seed,
      occurredOn: world.value.snapshot.currentDate,
    });
    if (!result.ok) return result;
    return succeed({ resource: `competition:${parsed.data.competitionId}` });
  },

  // X-001 — o clube define o que a IA pode decidir na sua ausência (R-01).
  "automation:set-offline-plan": async ({
    worlds,
    automationUnitOfWork,
    envelope,
  }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = setOfflinePlanPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const { clubId, ...plan } = parsed.data;
    const result = await new SetOfflinePlan(automationUnitOfWork).execute({
      gameWorldId: world.value.worldId,
      clubId,
      plan: plan as OfflinePlan,
    });
    if (!result.ok) return result;
    return succeed({ resource: `club:${clubId}` });
  },

  // X-001 — regra "se gatilho então ação". Cada save congela uma versão.
  "automation:save-automation": async ({
    worlds,
    automationUnitOfWork,
    envelope,
  }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = saveAutomationPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const d = parsed.data;
    const result = await new SaveAutomation(automationUnitOfWork).execute({
      gameWorldId: world.value.worldId,
      clubId: d.clubId,
      ...(d.ruleId !== undefined ? { ruleId: d.ruleId } : {}),
      newRuleId: d.ruleId ?? randomUUID(),
      activate: d.activate,
      config: {
        name: d.name,
        level: d.level,
        triggerEvent: d.triggerEvent,
        condition: d.condition ?? null,
        action: d.action ?? null,
        risk: d.risk,
        priority: d.priority,
      },
    });
    if (!result.ok) return result;
    return succeed({ resource: `automation:${result.value.ruleId}` });
  },

  "automation:toggle-automation": async ({
    worlds,
    automationUnitOfWork,
    envelope,
  }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = toggleAutomationPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const result = await new ToggleAutomation(automationUnitOfWork).execute({
      gameWorldId: world.value.worldId,
      clubId: parsed.data.clubId,
      ruleId: parsed.data.ruleId,
      activate: parsed.data.activate,
    });
    if (!result.ok) return result;
    return succeed({ resource: `automation:${parsed.data.ruleId}` });
  },

  // X-001 — o usuário registra que está (ou deixou de estar) presente no mundo.
  "presence:heartbeat": async ({ worlds, presence, actorId, envelope }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    if (actorId === null) {
      return fail(
        new DomainError(
          "PRESENCE_REQUIRES_USER",
          "Presença exige uma sessão de usuário (o admin/sistema não tem presença de jogo).",
        ),
      );
    }
    const parsed = presencePayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    if (parsed.data.online) {
      await presence.recordOnline(world.value.worldId, actorId);
    } else {
      await presence.recordOffline(world.value.worldId, actorId);
    }
    return succeed({ resource: `presence:${actorId}` });
  },

  // Push remoto: o device registra seu Expo push token, atrelado à conta. Sem
  // mundo — o token vale para o usuário, não para uma partida.
  "identity:register-push-token": async ({
    pushTokenRepository,
    actorId,
    envelope,
  }) => {
    if (actorId === null) {
      return fail(
        new DomainError(
          "PUSH_TOKEN_REQUIRES_USER",
          "Registrar o push exige uma sessão de usuário.",
        ),
      );
    }
    const parsed = registerPushTokenPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const result = await new RegisterPushToken(pushTokenRepository).execute({
      accountId: actorId,
      expoPushToken: parsed.data.expoPushToken,
      platform: parsed.data.platform,
    });
    if (!result.ok) return result;
    return succeed({ resource: `push-token:${actorId}` });
  },

  // X-001 — o executor: roda a automação do clube num gatilho. A precedência
  // (humano presente → IA se cala) decide dentro do caso de uso.
  "automation:run-autopilot": async ({
    worlds,
    automationUnitOfWork,
    envelope,
  }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = runAutopilotPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const result = await new RunClubAutopilot(automationUnitOfWork).execute({
      gameWorldId: world.value.worldId,
      clubId: parsed.data.clubId,
      triggerEvent: parsed.data.triggerEvent,
      // Presença é tempo real: o "agora" é o relógio de parede, na borda.
      nowIso: new Date().toISOString(),
      occurredOn: world.value.snapshot.currentDate,
      worldSeed: world.value.snapshot.seed,
    });
    if (!result.ok) return result;
    return succeed({ resource: `club:${parsed.data.clubId}` });
  },

  // MUNDO-V1 — configura o relógio: o mundo passa a andar sozinho (ou pausa).
  "world:set-clock": async ({ worlds, worldClock, envelope }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = setClockPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    const result = await new SetWorldClock(worldClock).execute({
      gameWorldId: world.value.worldId,
      realSecondsPerDay: parsed.data.realSecondsPerDay,
      running: parsed.data.running,
      // O relógio de parede AGORA, na borda — para agendar o próximo tick.
      nowIso: new Date().toISOString(),
    });
    if (!result.ok) return result;
    return succeed({ resource: `world:${world.value.worldId}` });
  },

  // MUNDO-V2 — avança UM dia lógico e roda o trabalho do dia (abre competições,
  // joga as partidas vencidas, homologa as encerradas). O motor do mundo.
  "world:advance-day": async ({
    worlds,
    competitionUnitOfWork,
    competitionReadModel,
    matchPlay,
    seasonAgingUnitOfWork,
    seasonLifecycle,
    trainingSessionUnitOfWork,
    groupTrainingUnitOfWork,
    pushTokenRepository,
    aiTrainingUnitOfWork,
    individualTrainingUnitOfWork,
    medicalUnitOfWork,
    mentorshipUnitOfWork,
    collectiveTrainingUnitOfWork,
    playerRepository,
    envelope,
  }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    // R-221 Fase 2b: a forma decai um dia. Antes de jogar o dia, para a partida
    // do dia já ler a forma decaída.
    await playerRepository.decayForma(world.value.worldId, 1);
    const result = await new AdvanceWorldOneDay({
      worlds,
      competitionUnitOfWork,
      competitionReadModel,
      matchPlay,
    }).execute({ gameWorldId: world.value.worldId });
    if (!result.ok) return result;
    // R-219: se o dia cruzou a fronteira de temporada, roda a virada (treino +
    // idade + materialização). Mesmo helper do caminho plural. Recarrega para o
    // relógio já avançado.
    const after = await loadWorld(worlds, envelope.worldId);
    if (after.ok) {
      await applySeasonTurns(
        { seasonAgingUnitOfWork, seasonLifecycle },
        {
          worldId: after.value.worldId,
          seed: after.value.snapshot.seed,
          startDate: after.value.snapshot.startDate,
          currentDate: after.value.snapshot.currentDate,
          rulesetVersion: after.value.snapshot.rulesetVersion,
        },
        result.value.seasonsClosed,
      );
      // Virada do dia: libera quem terminou o treino de sessão (1 dia) e avisa
      // o dono por push (treino completo).
      await settleDueTraining(
        { trainingSessionUnitOfWork, pushTokenRepository },
        {
          worldId: after.value.worldId,
          seed: after.value.snapshot.seed,
          currentDate: after.value.snapshot.currentDate,
          rulesetVersion: after.value.snapshot.rulesetVersion,
        },
      );
      // E o treino em GRUPO que cumpriu a duração (sobe entrosamento, libera).
      await settleDueGroupTraining(
        { groupTrainingUnitOfWork },
        {
          worldId: after.value.worldId,
          currentDate: after.value.snapshot.currentDate,
        },
      );
      // Clubes de IA treinam também (balanceamento).
      await runAiTraining(
        { aiTrainingUnitOfWork },
        {
          worldId: after.value.worldId,
          seed: after.value.snapshot.seed,
          currentDate: after.value.snapshot.currentDate,
          rulesetVersion: after.value.snapshot.rulesetVersion,
        },
      );
      // Planos individuais aplicados na virada.
      await settleIndividualTraining(
        { individualTrainingUnitOfWork },
        {
          worldId: after.value.worldId,
          seed: after.value.snapshot.seed,
          currentDate: after.value.snapshot.currentDate,
          rulesetVersion: after.value.snapshot.rulesetVersion,
        },
      );
      // Departamento médico: a carga do dia pode lesionar (F13/R-21).
      await settleTrainingInjuries(
        { medicalUnitOfWork },
        {
          worldId: after.value.worldId,
          seed: after.value.snapshot.seed,
          currentDate: after.value.snapshot.currentDate,
        },
      );
      // Mentoria: evolução acelerada dos pupilos.
      await settleMentorships(
        { mentorshipUnitOfWork },
        {
          worldId: after.value.worldId,
          seed: after.value.snapshot.seed,
          currentDate: after.value.snapshot.currentDate,
          rulesetVersion: after.value.snapshot.rulesetVersion,
        },
      );
      await settleCollectiveTraining(
        { collectiveTrainingUnitOfWork },
        {
          worldId: after.value.worldId,
          seed: after.value.snapshot.seed,
          currentDate: after.value.snapshot.currentDate,
          rulesetVersion: after.value.snapshot.rulesetVersion,
        },
      );
    }
    return succeed({ resource: `world:${world.value.worldId}` });
  },

  "world:activate": async ({ worlds, clubs, seasonLifecycle, envelope }) => {
    const raw = requireWorldId(envelope.worldId);
    if (!raw.ok) return raw;
    const worldId = parseGameWorldId(raw.value);
    if (!worldId.ok) return worldId;
    const result = await new ActivateProvisionedWorld(worlds, clubs).execute(
      worldId.value,
    );
    if (!result.ok) return result;
    // R-219: a temporada nasce com o mundo. Materializa a Temporada 1 ACTIVE e
    // aponta currentSeasonId ANTES de qualquer autoria de competição, para a
    // competição ANEXAR-se a ela (o ensureSeasonId encontra esta linha).
    const world = result.value.world;
    await seasonLifecycle.ensureCurrentSeason({
      gameWorldId: worldId.value,
      worldSeed: world.seed,
      startDate: world.startDate,
      currentDate: world.currentDate,
    });
    return succeed({
      resource: `world:${worldId.value}`,
      mutation: result.value,
    });
  },

  /**
   * Nome e descrição. Vale em qualquer status — identidade é rótulo
   * administrativo, não simulação.
   */
  "world:set-identity": async ({ worlds, envelope }) => {
    const loaded = await loadWorld(worlds, envelope.worldId);
    if (!loaded.ok) return loaded;
    const parsed = worldIdentityPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));

    const result = await new SetWorldIdentity(worlds).execute(
      loaded.value.worldId,
      parsed.data,
    );
    if (!result.ok) return result;
    return succeed({
      resource: `world:${loaded.value.worldId}`,
      mutation: result.value,
    });
  },

  /**
   * Congela o mundo: segue legível, o relógio para. Reversível por `world:resume`.
   */
  "world:pause": async ({ worlds, envelope }) => {
    const loaded = await loadWorld(worlds, envelope.worldId);
    if (!loaded.ok) return loaded;
    const parsed = worldLifecyclePayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));

    const result = await new PauseWorld(worlds).execute(
      loaded.value.worldId,
      parsed.data.reason ?? null,
    );
    if (!result.ok) return result;
    return succeed({
      resource: `world:${loaded.value.worldId}`,
      mutation: result.value,
    });
  },

  /** Descongela — de CONGELADO ou de INATIVO (R-56: arquivar é reversível). */
  "world:resume": async ({ worlds, envelope }) => {
    const loaded = await loadWorld(worlds, envelope.worldId);
    if (!loaded.ok) return loaded;

    const result = await new ResumeWorld(worlds).execute(loaded.value.worldId);
    if (!result.ok) return result;
    return succeed({
      resource: `world:${loaded.value.worldId}`,
      mutation: result.value,
    });
  },

  /**
   * Inativa (arquiva, R-56): read-only, preserva histórico/títulos/recordes,
   * REVERSÍVEL por `world:resume`. Não é `world:delete`.
   *
   * O gatilho de R-56 (≥2 temporadas ociosas, aviso de 30 dias) não é conferido:
   * não há temporada ligada nem medida de atividade para conferir. Quem julga o
   * ócio é o operador — a lacuna está declarada no agregado, não escondida aqui.
   */
  "world:archive": async ({ worlds, envelope }) => {
    const loaded = await loadWorld(worlds, envelope.worldId);
    if (!loaded.ok) return loaded;
    const parsed = worldLifecyclePayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));

    const result = await new ArchiveWorld(worlds).execute(
      loaded.value.worldId,
      parsed.data.reason ?? null,
    );
    if (!result.ok) return result;
    return succeed({
      resource: `world:${loaded.value.worldId}`,
      mutation: result.value,
    });
  },

  /**
   * Apaga o mundo e TUDO que pende dele. Irreversível.
   *
   * Não confunda com arquivar (R-56): arquivar põe em read-only, preserva
   * "histórico, títulos e recordes" e é reversível — e agora existe, em
   * `world:archive`. Deletar não é nada disso, e por isso recusa mundo com
   * gestor ativo.
   */
  "world:delete": async ({ worlds, controls, envelope }) => {
    const raw = requireWorldId(envelope.worldId);
    if (!raw.ok) return raw;
    const worldId = parseGameWorldId(raw.value);
    if (!worldId.ok) return worldId;
    const parsed = deleteWorldPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));

    const result = await new DeleteWorld(worlds, controls).execute({
      gameWorldId: worldId.value,
      confirmSeed: parsed.data.confirmSeed,
    });
    if (!result.ok) return result;
    // `resource` null: o recurso deixou de existir — apontar para ele seria
    // mandar o cliente buscar um 404.
    return succeed({ resource: null });
  },

  /**
   * Personalizar o clube (BC-003 / MF-25). Voltou: o command vivia dentro do
   * `WorldClubPortfolio` e foi apagado com ele (R-175).
   */
  "club:apply-identity": async ({ worlds, clubUnitOfWork, envelope, actorId }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = applyClubIdentityPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));
    if (actorId === null) {
      // Personalizar clube é ato de JOGADOR. Sem conta de jogo não há quem
      // assine — e o `actorId` do evento não pode ser inventado.
      return fail(
        new DomainError(
          "FORBIDDEN_NOT_CONTROLLER",
          "É preciso uma conta de jogo para personalizar um clube.",
        ),
      );
    }

    const { visualIdentity, ...identity } = parsed.data;
    const result = await new ApplyClubIdentity(clubUnitOfWork).execute({
      ...identity,
      // `exactOptionalPropertyTypes`: `visualIdentity: undefined` NÃO é o mesmo
      // que ausente. Ausente = "não mexe no visual"; presente-e-undefined seria
      // um valor. O spread condicional preserva a diferença.
      ...(visualIdentity === undefined ? {} : { visualIdentity }),
      gameWorldId: world.value.worldId,
      worldSeed: world.value.snapshot.seed,
      // A data do MUNDO, não a do relógio: o período de identidade vige em data
      // de mundo (R-177), e é ela que decide se o rebranding abre período novo
      // ou substitui o de hoje.
      occurredOn: world.value.snapshot.currentDate,
      actorId,
      ...(envelope.correlationId === undefined
        ? {}
        : { correlationId: envelope.correlationId }),
    });
    if (!result.ok) return result;
    return succeed({ resource: `club:${parsed.data.clubId}` });
  },

  "identity:join-world": ic((u) => new JoinWorld(u)),
  "identity:reserve-club": ic((u) => new ReserveClub(u)),
  "identity:confirm-onboarding": ic((u) => new ConfirmOnboarding(u)),
  "identity:release-club-reservation": ic((u) => new ReleaseClubReservation(u)),
  "identity:end-club-control": ic((u) => new EndClubControl(u)),
  "identity:request-switch": ic((u) => new RequestClubSwitch(u)),
};

export function resolveCommandHandler(
  commandType: string,
): CommandHandler | undefined {
  return handlers[commandType];
}

export function registeredCommandTypes(): readonly string[] {
  return Object.keys(handlers);
}
