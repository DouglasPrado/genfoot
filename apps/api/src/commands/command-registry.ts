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
  InspectWorld,
  JoinWorld,
  PauseWorld,
  ReleaseClubReservation,
  RequestClubSwitch,
  ReserveClub,
  ResumeWorld,
  SetWorldIdentity,
  type ClubControlRepository,
  type ClubReadModel,
  type ClubUnitOfWork,
  type GenesisUnitOfWork,
  type MatchPlayRepository,
  type SeasonFinanceUnitOfWork,
  type TransferUnitOfWork,
  type PromoteYouthUnitOfWork,
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
import { z } from "zod";

import type { CommandEnvelope } from "./command-contract.js";

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
  /** C6 — a transferência atômica: dinheiro + contrato + elenco (R-192). */
  readonly transferUnitOfWork: TransferUnitOfWork;
  /** C8 — sobe um jovem da base ao profissional (atômico sobre os dois elencos). */
  readonly promoteYouthUnitOfWork: PromoteYouthUnitOfWork;
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
   * temporada (`SeasonRolledOver`), roda o ENCERRAMENTO por clube: debita os
   * custos da temporada que acabou no caixa de cada um (passo 14 do motor de
   * virada). Cada débito é idempotente por (clube, temporada) — reavançar não
   * cobra duas vezes. Sem receita materializada ainda, isso só drena o caixa: a
   * insolvência progressiva é o comportamento assumido (R-45), não um bug.
   */
  "world:advance-days": async ({
    worlds,
    clubReadModel,
    seasonFinanceUnitOfWork,
    envelope,
  }) => {
    const world = await loadWorld(worlds, envelope.worldId);
    if (!world.ok) return world;
    const parsed = advanceDaysPayload.safeParse(envelope.payload);
    if (!parsed.success) return fail(invalidPayload(parsed.error));

    const advanced = await new AdvanceWorldDays(worlds).execute(
      world.value.worldId,
      parsed.data.days,
    );
    if (!advanced.ok) return advanced;

    const rollovers = advanced.value.events.filter(
      (event): event is Extract<WorldDomainEvent, { type: "SeasonRolledOver" }> =>
        event.type === "SeasonRolledOver",
    );
    if (rollovers.length > 0) {
      const worldView = await clubReadModel.worldView(world.value.worldId);
      const closer = new CloseSeasonFinances(seasonFinanceUnitOfWork);
      for (const rollover of rollovers) {
        for (const club of worldView.clubs) {
          // Uma falha num clube não derruba a virada dos outros — o débito é
          // por clube e idempotente; o que faltar reprocessa no próximo avanço.
          await closer.execute({
            gameWorldId: world.value.worldId,
            clubId: club.id,
            seasonNumber: rollover.payload.seasonNumber,
            worldSeed: advanced.value.world.seed,
            occurredOn: advanced.value.world.currentDate,
          });
        }
      }
    }

    return succeed({
      resource: `world:${world.value.worldId}`,
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

  "world:activate": async ({ worlds, clubs, envelope }) => {
    const raw = requireWorldId(envelope.worldId);
    if (!raw.ok) return raw;
    const worldId = parseGameWorldId(raw.value);
    if (!worldId.ok) return worldId;
    const result = await new ActivateProvisionedWorld(worlds, clubs).execute(
      worldId.value,
    );
    if (!result.ok) return result;
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
