import type {
  DomainEvent,
  GameWorldId,
  RulesetVersion,
  WorldDate,
} from "@grinta/shared";

export const WorldStatus = {
  CREATING: "CREATING",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  FINISHED: "FINISHED",
  ARCHIVED: "ARCHIVED",
} as const;

export type WorldStatus = (typeof WorldStatus)[keyof typeof WorldStatus];

export interface CreateGameWorldInput {
  readonly id: GameWorldId;
  readonly seed: string;
  readonly startDate: WorldDate;
  readonly rulesetVersion: RulesetVersion;
}

export interface WorldProvisioningEvidence {
  readonly generatedClubCount: 16;
  readonly clubsWithValidSquads: 16;
  readonly generatedPlayerCount: 368;
  readonly playersPerSquad: 23;
  readonly calendarValidated: true;
  readonly rulesetVersion: RulesetVersion;
}

/**
 * Limites do texto de identidade. Recusar é melhor que truncar: truncar grava
 * um nome que ninguém escolheu e não avisa ninguém.
 */
export const WORLD_NAME_MAX_LENGTH = 60;
export const WORLD_DESCRIPTION_MAX_LENGTH = 500;
/**
 * A chave do objeto no bucket. O agregado não sabe montar chave — quem monta é a
 * borda do upload —, mas sabe recusar o que não cabe na coluna.
 */
export const WORLD_OBJECT_KEY_MAX_LENGTH = 512;

/**
 * Nome e descrição num update parcial: `undefined` = não mexa, `null` = limpe.
 * A distinção existe porque um PATCH que só manda `name` não pode apagar a
 * descrição por omissão.
 *
 * O `| undefined` explícito é necessário sob `exactOptionalPropertyTypes`: sem
 * ele, a chave só poderia estar AUSENTE, e `{name: undefined}` — que é o que um
 * `safeParse` do zod produz — seria recusado. Para este agregado os dois casos
 * são o mesmo ("não mexa"), e o tipo diz isso em vez de forçar a borda a apagar
 * chaves antes de chamar.
 */
export interface WorldIdentityInput {
  readonly name?: string | null | undefined;
  readonly description?: string | null | undefined;
  readonly bannerKey?: string | null | undefined;
  readonly squarePhotoKey?: string | null | undefined;
}

export interface GameWorldSnapshot {
  readonly id: GameWorldId;
  readonly seed: string;
  /**
   * Rótulo do mundo. `null` = sem nome — a tela cai no `seed`.
   *
   * NÃO é configuração. O schema dizia "pendente: vai para GameRuleConfig
   * (R-182)" e R-182 não diz isso: ela trata de `maxClubs`, `seasonDays`,
   * `initialClubCashMinor` e dos literais da gênese — dimensionamento. Nome é
   * identidade, e mora no agregado.
   */
  readonly name: string | null;
  readonly description: string | null;
  /**
   * A CHAVE do objeto no bucket, não a URL.
   *
   * O agregado não conhece CDN: gravar `https://cdn.oggiadmin.com.br/...` aqui
   * assaria infraestrutura — e o domínio de outro projeto — dentro do mundo, e
   * trocar de bucket quebraria todo banner já salvo. Quem compõe a URL pública é
   * a borda, que sabe o `R2_CDN_URL`.
   */
  readonly bannerKey: string | null;
  readonly squarePhotoKey: string | null;
  readonly startDate: string;
  readonly currentDate: string;
  readonly rulesetVersion: RulesetVersion;
  readonly status: WorldStatus;
  readonly worldSequence: number;
  readonly version: number;
}

export type WorldCreatedEvent = DomainEvent<
  "WorldCreated",
  Readonly<{
    gameWorldId: GameWorldId;
    seed: string;
    rulesetVersion: RulesetVersion;
  }>
>;

export type WorldActivatedEvent = DomainEvent<
  "WorldActivated",
  Readonly<{ gameWorldId: GameWorldId; rulesetVersion: RulesetVersion }>
>;

export type WorldDayAdvancedEvent = DomainEvent<
  "WorldDayAdvanced",
  Readonly<{
    gameWorldId: GameWorldId;
    gameDate: string;
    worldSequence: number;
  }>
>;

/**
 * A temporada virou — o relógio cruzou a fronteira de `SEASON_DAYS` (game-world).
 * `seasonNumber` é a temporada que ACABOU (a debitar no encerramento). É o
 * gatilho que a saga de virada consome para rodar os custos por clube (passo 14
 * do motor de virada). Substitui o `Season` órfão como sinal de fim de temporada
 * até `GameRuleConfig`/R-182 existir.
 */
export type WorldSeasonRolledOverEvent = DomainEvent<
  "SeasonRolledOver",
  Readonly<{
    gameWorldId: GameWorldId;
    seasonNumber: number;
    gameDate: string;
  }>
>;

/**
 * Congelado: o mundo existe, é lido, e o relógio não anda (`advanceDays` exige
 * ACTIVE). Reversível — é a diferença para `WorldArchived`.
 */
export type WorldPausedEvent = DomainEvent<
  "WorldPaused",
  Readonly<{ gameWorldId: GameWorldId; reason: string | null }>
>;

export type WorldResumedEvent = DomainEvent<
  "WorldResumed",
  Readonly<{ gameWorldId: GameWorldId }>
>;

/**
 * Inativo: terminal. Não é `world:delete` — o mundo continua no banco e
 * legível; o que acaba é a operação dele.
 */
export type WorldArchivedEvent = DomainEvent<
  "WorldArchived",
  Readonly<{ gameWorldId: GameWorldId; reason: string | null }>
>;

/** O evento carrega o valor final, não o delta: quem lê o log vê o que ficou. */
export type WorldIdentityChangedEvent = DomainEvent<
  "WorldIdentityChanged",
  Readonly<{
    gameWorldId: GameWorldId;
    name: string | null;
    description: string | null;
    bannerKey: string | null;
    squarePhotoKey: string | null;
  }>
>;

export type WorldDomainEvent =
  | WorldCreatedEvent
  | WorldActivatedEvent
  | WorldDayAdvancedEvent
  | WorldSeasonRolledOverEvent
  | WorldPausedEvent
  | WorldResumedEvent
  | WorldArchivedEvent
  | WorldIdentityChangedEvent;
