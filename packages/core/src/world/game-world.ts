import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type Result,
} from "@grinta/shared";

import {
  WORLD_DESCRIPTION_MAX_LENGTH,
  WORLD_NAME_MAX_LENGTH,
  WORLD_OBJECT_KEY_MAX_LENGTH,
  WorldStatus,
  type CreateGameWorldInput,
  type GameWorldSnapshot,
  type WorldDomainEvent,
  type WorldIdentityInput,
  type WorldProvisioningEvidence,
} from "./world-types.js";

/**
 * Dias por temporada. Constante declarada — sua casa canônica é
 * `GameRuleConfig`/R-182 (`seasonDays`), que ainda não existe (mesma dívida
 * assumida do `COOLDOWN_DAYS` no mobile). Não é número mágico escondido: é o
 * único ponto que decide quando o relógio vira a temporada.
 */
export const SEASON_DAYS = 365;

/**
 * Apara e decide entre texto e ausência. Só-espaço vira `null`: sem isto, `"   "`
 * seria um nome que a tela renderiza vazio, e ninguém entende por que o mundo
 * perdeu o título.
 *
 * Recusa o que passa do limite em vez de truncar — truncar grava um nome que
 * ninguém escolheu, e cala.
 */
function normalizeText(
  value: string | null,
  maxLength: number,
  code: string,
): Result<string | null, DomainError> {
  if (value === null) return succeed(null);
  const trimmed = value.trim();
  if (trimmed === "") return succeed(null);
  if (trimmed.length > maxLength) {
    return fail(
      new DomainError(code, `O texto passa de ${maxLength} caracteres.`, {
        length: trimmed.length,
        maxLength,
      }),
    );
  }
  return succeed(trimmed);
}

export class GameWorld {
  readonly #events: WorldDomainEvent[] = [];
  readonly #id: GameWorldSnapshot["id"];
  readonly #seed: string;
  readonly #startDate: WorldDate;
  readonly #rulesetVersion: GameWorldSnapshot["rulesetVersion"];
  #name: string | null;
  #description: string | null;
  #bannerKey: string | null;
  #squarePhotoKey: string | null;
  #currentDate: WorldDate;
  #status: GameWorldSnapshot["status"];
  #worldSequence: number;
  #version: number;

  private constructor(
    input: Readonly<{
      id: GameWorldSnapshot["id"];
      seed: string;
      name: string | null;
      description: string | null;
      bannerKey: string | null;
      squarePhotoKey: string | null;
      startDate: WorldDate;
      currentDate: WorldDate;
      rulesetVersion: GameWorldSnapshot["rulesetVersion"];
      status: GameWorldSnapshot["status"];
      worldSequence: number;
      version: number;
    }>,
  ) {
    this.#id = input.id;
    this.#seed = input.seed;
    this.#name = input.name;
    this.#description = input.description;
    this.#bannerKey = input.bannerKey;
    this.#squarePhotoKey = input.squarePhotoKey;
    this.#startDate = input.startDate;
    this.#currentDate = input.currentDate;
    this.#rulesetVersion = input.rulesetVersion;
    this.#status = input.status;
    this.#worldSequence = input.worldSequence;
    this.#version = input.version;
  }

  public static create(
    input: CreateGameWorldInput,
  ): Result<GameWorld, DomainError> {
    const seed = input.seed.trim();
    if (seed === "") {
      return fail(
        new DomainError("INVALID_WORLD_SEED", "A seed do mundo é obrigatória."),
      );
    }

    return succeed(
      new GameWorld({
        id: input.id,
        seed,
        // Mundo nasce sem rótulo. `null` é ausência; um default tipo "Mundo 1"
        // seria um nome que ninguém escolheu, indistinguível de um escolhido.
        name: null,
        description: null,
        bannerKey: null,
        squarePhotoKey: null,
        startDate: input.startDate,
        currentDate: input.startDate,
        rulesetVersion: input.rulesetVersion,
        status: WorldStatus.CREATING,
        worldSequence: 0,
        version: 1,
      }),
    );
  }

  public static fromSnapshot(
    snapshot: GameWorldSnapshot,
  ): Result<GameWorld, DomainError> {
    const startDate = WorldDate.parse(snapshot.startDate);
    if (!startDate.ok) return startDate;

    const currentDate = WorldDate.parse(snapshot.currentDate);
    if (!currentDate.ok) return currentDate;

    if (
      !Number.isSafeInteger(snapshot.worldSequence) ||
      snapshot.worldSequence < 0 ||
      !Number.isSafeInteger(snapshot.version) ||
      snapshot.version < 1
    ) {
      return fail(
        new DomainError(
          "INVALID_WORLD_SNAPSHOT",
          "Sequência ou versão inválida no snapshot.",
        ),
      );
    }

    return succeed(
      new GameWorld({
        id: snapshot.id,
        seed: snapshot.seed,
        name: snapshot.name,
        description: snapshot.description,
        bannerKey: snapshot.bannerKey,
        squarePhotoKey: snapshot.squarePhotoKey,
        startDate: startDate.value,
        currentDate: currentDate.value,
        rulesetVersion: snapshot.rulesetVersion,
        status: snapshot.status,
        worldSequence: snapshot.worldSequence,
        version: snapshot.version,
      }),
    );
  }

  public activate(
    evidence: WorldProvisioningEvidence,
  ): Result<void, DomainError> {
    if (this.#status !== WorldStatus.CREATING) {
      return fail(
        new DomainError(
          "INVALID_WORLD_TRANSITION",
          "Somente mundos CREATING podem ser ativados.",
          {
            status: this.#status,
          },
        ),
      );
    }

    if (evidence.rulesetVersion !== this.#rulesetVersion) {
      return fail(
        new DomainError(
          "RULESET_VERSION_MISMATCH",
          "A gênese foi produzida com uma versão de ruleset diferente do mundo.",
        ),
      );
    }

    if (
      evidence.generatedClubCount !== 16 ||
      evidence.clubsWithValidSquads !== 16 ||
      evidence.generatedPlayerCount !== 368 ||
      evidence.playersPerSquad !== 23 ||
      evidence.calendarValidated !== true
    ) {
      return fail(
        new DomainError(
          "WORLD_PROVISIONING_INCOMPLETE",
          "O mundo exige 16 clubes, 16 elencos válidos de 23 atletas e calendário validado.",
        ),
      );
    }

    this.#status = WorldStatus.ACTIVE;
    this.record("WorldCreated", {
      gameWorldId: this.#id,
      seed: this.#seed,
      rulesetVersion: this.#rulesetVersion,
    });
    this.record("WorldActivated", {
      gameWorldId: this.#id,
      rulesetVersion: this.#rulesetVersion,
    });

    return succeed(undefined);
  }

  /**
   * Nome e descrição do mundo. Update parcial: campo ausente fica como está,
   * `null` limpa.
   *
   * Vale em QUALQUER estado, inclusive ARCHIVED. O read-only de R-56 é sobre
   * simulação — "nenhuma partida nova roda" —, não sobre metadado: se reabrir um
   * mundo arquivado é decisão administrativa, rotulá-lo também é.
   *
   * Não toca a seed. Identidade é rótulo; seed é entrada do determinismo
   * (R-182), e por isso ela é `readonly` e isto aqui não é.
   */
  public setIdentity(input: WorldIdentityInput): Result<void, DomainError> {
    const name =
      input.name === undefined
        ? succeed(this.#name)
        : normalizeText(input.name, WORLD_NAME_MAX_LENGTH, "INVALID_WORLD_NAME");
    if (!name.ok) return name;

    const description =
      input.description === undefined
        ? succeed(this.#description)
        : normalizeText(
            input.description,
            WORLD_DESCRIPTION_MAX_LENGTH,
            "INVALID_WORLD_DESCRIPTION",
          );
    // Todos validam ANTES de qualquer atribuição: nome bom com descrição ruim
    // não pode gravar o nome e falhar depois. Metade aplicada é o pior resultado.
    if (!description.ok) return description;

    const bannerKey =
      input.bannerKey === undefined
        ? succeed(this.#bannerKey)
        : normalizeText(input.bannerKey, WORLD_OBJECT_KEY_MAX_LENGTH, "INVALID_WORLD_IMAGE_KEY");
    if (!bannerKey.ok) return bannerKey;

    const squarePhotoKey =
      input.squarePhotoKey === undefined
        ? succeed(this.#squarePhotoKey)
        : normalizeText(
            input.squarePhotoKey,
            WORLD_OBJECT_KEY_MAX_LENGTH,
            "INVALID_WORLD_IMAGE_KEY",
          );
    if (!squarePhotoKey.ok) return squarePhotoKey;

    this.#name = name.value;
    this.#description = description.value;
    this.#bannerKey = bannerKey.value;
    this.#squarePhotoKey = squarePhotoKey.value;
    this.record("WorldIdentityChanged", {
      gameWorldId: this.#id,
      name: this.#name,
      description: this.#description,
      bannerKey: this.#bannerKey,
      squarePhotoKey: this.#squarePhotoKey,
    });

    return succeed(undefined);
  }

  /**
   * Congela o mundo: ele continua legível, e o relógio para.
   *
   * A parada do relógio não é imposta aqui — `advanceDays` já exige ACTIVE. Este
   * método só muda o estado; o congelamento é consequência.
   */
  public pause(reason: string | null = null): Result<void, DomainError> {
    if (this.#status !== WorldStatus.ACTIVE) {
      return fail(
        new DomainError(
          "INVALID_WORLD_TRANSITION",
          "Somente mundos ACTIVE podem ser congelados.",
          { status: this.#status },
        ),
      );
    }

    this.#status = WorldStatus.PAUSED;
    this.record("WorldPaused", { gameWorldId: this.#id, reason });

    return succeed(undefined);
  }

  /**
   * Volta a andar, de CONGELADO **ou de INATIVO**.
   *
   * R-56 exige que arquivar seja "reversível por decisão administrativa", então
   * ARCHIVED devolve por aqui — não é estado terminal. Terminal é
   * `world:delete`, que apaga.
   *
   * Não recebe `WorldProvisioningEvidence` de propósito: voltar de CONGELADO não
   * gera clube nenhum, e exigir de novo a prova da gênese seria pedir ao operador
   * que provasse o que já é fato no banco. Quem valida gênese é `activate()`, uma
   * vez só, na saída de CREATING.
   */
  public resume(): Result<void, DomainError> {
    if (
      this.#status !== WorldStatus.PAUSED &&
      this.#status !== WorldStatus.ARCHIVED
    ) {
      return fail(
        new DomainError(
          "INVALID_WORLD_TRANSITION",
          "Somente mundos PAUSED ou ARCHIVED voltam a ficar ativos.",
          { status: this.#status },
        ),
      );
    }

    this.#status = WorldStatus.ACTIVE;
    this.record("WorldResumed", { gameWorldId: this.#id });

    return succeed(undefined);
  }

  /**
   * Inativa o mundo — o "arquivamento" de R-56.
   *
   * R-56 define o estado: "read-only — histórico, títulos e recordes
   * preservados; nenhuma partida nova roda —, **reversível** por decisão
   * administrativa". Read-only sai de graça (`advanceDays` exige ACTIVE) e a
   * reversão é `resume()`.
   *
   * Não confundir com `world:delete`, que apaga: aqui o mundo permanece no banco
   * e legível. Um mundo em CREATING não inativa — mundo que nunca abriu se
   * apaga, não se aposenta.
   *
   * **O gatilho de R-56 NÃO é verificado aqui**, e a lacuna é declarada: a
   * decisão condiciona o arquivamento a "≥ 2 temporadas sem usuário ativo" com
   * "aviso prévio de 30 dias", e nada disso é verificável hoje — não há
   * temporada ligada (`Season` é órfão, `currentSeasonId` nunca é escrito) nem
   * medida de atividade. Quem decide se o mundo está ocioso é o operador; o
   * domínio só recusa transição inválida.
   */
  public archive(reason: string | null = null): Result<void, DomainError> {
    if (
      this.#status !== WorldStatus.ACTIVE &&
      this.#status !== WorldStatus.PAUSED
    ) {
      return fail(
        new DomainError(
          "INVALID_WORLD_TRANSITION",
          "Somente mundos ACTIVE ou PAUSED podem ser inativados.",
          { status: this.#status },
        ),
      );
    }

    this.#status = WorldStatus.ARCHIVED;
    this.record("WorldArchived", { gameWorldId: this.#id, reason });

    return succeed(undefined);
  }

  public advanceDays(days: number): Result<void, DomainError> {
    if (this.#status !== WorldStatus.ACTIVE) {
      return fail(
        new DomainError(
          "WORLD_NOT_ACTIVE",
          "Somente mundos ACTIVE podem avançar o relógio.",
          {
            status: this.#status,
          },
        ),
      );
    }

    if (!Number.isSafeInteger(days) || days < 1) {
      return fail(
        new DomainError(
          "INVALID_DAY_COUNT",
          "days deve ser um inteiro positivo.",
          { days },
        ),
      );
    }

    for (let index = 0; index < days; index += 1) {
      const seasonBefore = this.seasonNumberOn(this.#currentDate);
      this.#currentDate = this.#currentDate.addDays(1);
      this.record("WorldDayAdvanced", {
        gameWorldId: this.#id,
        gameDate: this.#currentDate.toString(),
        worldSequence: this.#worldSequence + 1,
      });
      // Cruzou a fronteira da temporada: a que ACABOU é `seasonBefore`, e é a que
      // o encerramento vai debitar. Um evento por virada, no dia exato.
      const seasonAfter = this.seasonNumberOn(this.#currentDate);
      if (seasonAfter > seasonBefore) {
        this.record("SeasonRolledOver", {
          gameWorldId: this.#id,
          seasonNumber: seasonBefore,
          gameDate: this.#currentDate.toString(),
        });
      }
    }

    return succeed(undefined);
  }

  /**
   * A temporada de uma data: `floor(dias desde o início / SEASON_DAYS) + 1`. A
   * temporada 1 começa no `startDate`. `Date.parse` de string ISO fixa é
   * determinístico (o razão da gênese usa o mesmo) — não é o `Date.now` proibido.
   */
  private seasonNumberOn(date: WorldDate): number {
    const startMs = Date.parse(`${this.#startDate.toString()}T00:00:00.000Z`);
    const currentMs = Date.parse(`${date.toString()}T00:00:00.000Z`);
    const daysSinceStart = Math.floor((currentMs - startMs) / 86_400_000);
    return Math.floor(daysSinceStart / SEASON_DAYS) + 1;
  }

  public snapshot(): GameWorldSnapshot {
    return {
      id: this.#id,
      seed: this.#seed,
      name: this.#name,
      description: this.#description,
      bannerKey: this.#bannerKey,
      squarePhotoKey: this.#squarePhotoKey,
      startDate: this.#startDate.toString(),
      currentDate: this.#currentDate.toString(),
      rulesetVersion: this.#rulesetVersion,
      status: this.#status,
      worldSequence: this.#worldSequence,
      version: this.#version,
    };
  }

  public pullDomainEvents(): readonly WorldDomainEvent[] {
    return this.#events.splice(0, this.#events.length);
  }

  private record<TType extends WorldDomainEvent["type"]>(
    type: TType,
    payload: Extract<WorldDomainEvent, { type: TType }>["payload"],
  ): void {
    this.#version += 1;
    this.#worldSequence += 1;
    this.#events.push({
      type,
      eventVersion: 1,
      gameWorldId: this.#id,
      aggregateType: "GameWorld",
      aggregateVersion: this.#version,
      worldSequence: this.#worldSequence,
      worldDate: this.#currentDate.toString(),
      rulesetVersion: this.#rulesetVersion,
      payload,
    } as Extract<WorldDomainEvent, { type: TType }>);
  }
}
