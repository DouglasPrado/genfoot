import { DomainError, WorldDate, fail, succeed, type Result } from "@grinta/shared";

import { deterministicUuidV7, timestampOf } from "../foundation/deterministic-uuid.js";

import {
  ClubAggregateType,
  ClubEventType,
  clubEvent,
  type ClubIdentityAppliedPayload,
} from "./club-events.js";
import type { ClubRepositories, ClubUnitOfWork } from "./club-unit-of-work.js";
import { Club } from "./club.js";
import type { ClubSnapshot, VisualIdentitySnapshot } from "./club-types.js";

/**
 * Commands de C3 sobre agregados por entidade (R-175).
 *
 * O que sumiu em relação ao `WorldClubPortfolio` que isto substitui:
 *
 * - **A varredura de nome em memória.** `world-club-portfolio.ts:157` percorria
 *   os 16 clubes do mundo para saber se o nome estava livre. Quem arbitra agora
 *   é o índice único PARCIAL do Postgres (`ClubIdentityPeriod_nome_unico_vigente`,
 *   `WHERE effectiveThrough IS NULL`): dois clubes não podem se chamar igual
 *   HOJE, e um nome abandonado volta ao pool. Entre um `SELECT` e um `UPDATE`
 *   cabia outra requisição; o índice não tem essa janela.
 * - **O `commandReceipt` dentro do agregado.** Idempotência é do barramento
 *   (R-176/R-184), não de cada caso de uso.
 * - **`portfolioRevision`.** Morreu com o mega-agregado (R-175).
 *
 * Toda escrita passa pelo `UnitOfWork`: agregado e evento no MESMO commit
 * (Decisão 19.10) — e em C3 isso vale dobrado, porque um clube ocupa 6 tabelas.
 */

export interface ApplyClubIdentityInput {
  readonly gameWorldId: string;
  readonly clubId: string;
  /** Concorrência otimista por agregado (R-175). */
  readonly expectedVersion: number;
  readonly name: string;
  readonly shortCode: string;
  /** `undefined` = não mexe na identidade visual; `null` = remove. */
  readonly visualIdentity?: VisualIdentitySnapshot | null;
  readonly worldSeed: string;
  readonly occurredOn: string;
  readonly actorId: string;
  readonly correlationId?: string;
}

/**
 * Aplica a identidade do clube: nome, código e visual (BC-003).
 *
 * O nome NÃO é coluna — é um PERÍODO com vigência. Renomear abre um período novo
 * e fecha o anterior na véspera; o histórico nunca é reescrito. Quem faz isso é o
 * `Club.updateIdentity`, que já existia e sobreviveu ao extermínio.
 *
 * Emite UM evento — `ClubIdentityApplied`, com `periodOpened` dizendo se a
 * identidade OFICIAL mudou. O catálogo (`:390`) promete dois; o log só aceita um
 * por versão de agregado, e o período não é agregado. Ver `club-events.ts`.
 */
export class ApplyClubIdentity {
  public constructor(private readonly unitOfWork: ClubUnitOfWork) {}

  public execute(
    input: ApplyClubIdentityInput,
  ): Promise<Result<ClubSnapshot, DomainError>> {
    return run(this.unitOfWork, async (repositories) => {
      const current = await repositories.clubs.findClubById(
        input.gameWorldId as never,
        input.clubId as never,
      );
      if (current === null) {
        return fail(
          new DomainError("CLUB_NOT_FOUND", "Clube não encontrado.", {
            clubId: input.clubId,
          }),
        );
      }
      if (current.version !== input.expectedVersion) {
        return fail(
          new DomainError(
            "AGGREGATE_VERSION_CONFLICT",
            "O clube mudou por baixo.",
            { currentVersion: current.version },
          ),
        );
      }

      const effectiveOn = WorldDate.parse(input.occurredOn);
      if (!effectiveOn.ok) return effectiveOn;

      const loaded = Club.fromSnapshot(current);
      if (!loaded.ok) return loaded;

      /**
       * O id do período é determinístico e derivado do clube + do dia.
       *
       * Não é enfeite: rebranding no MESMO dia lógico substitui o período aberto
       * em vez de empilhar (`club.ts`, a regra de 5f1c654). Derivar do dia faz o
       * id ser o mesmo, e o reenvio do comando escrever a mesma linha em vez de
       * criar uma órfã.
       */
      const identityId = deterministicUuidV7<"ClubIdentityPeriod">({
        worldSeed: input.worldSeed,
        context: `club-identity:${input.clubId}:${input.occurredOn}`,
        timestampMilliseconds: timestampOf(input.occurredOn),
      });

      const applied = loaded.value.updateIdentity({
        name: input.name,
        shortCode: input.shortCode,
        effectiveOn: effectiveOn.value,
        rulesetVersion: current.identity.rulesetVersion,
        identityId,
        ...(input.visualIdentity === undefined
          ? {}
          : input.visualIdentity === null
            ? {}
            : { visualIdentity: input.visualIdentity }),
      });
      if (!applied.ok) return applied;

      const snapshot = loaded.value.snapshot();

      /**
       * O índice único parcial arbitra o nome. Uma checagem prévia aqui teria a
       * janela que ela finge fechar: entre o SELECT e o INSERT cabe outro
       * rebranding com o mesmo nome. Deixamos o Postgres recusar e traduzimos.
       */
      try {
        await repositories.clubs.saveClub(snapshot, current.version);
      } catch (error) {
        if (isNameTaken(error)) {
          return fail(
            new DomainError(
              "CLUB_NAME_ALREADY_TAKEN",
              "Já existe um clube com esse nome neste mundo.",
              { name: input.name },
            ),
          );
        }
        throw error;
      }

      const nomeMudou =
        current.identity.name !== snapshot.identity.name ||
        current.identity.shortCode !== snapshot.identity.shortCode;
      const visualMudou =
        JSON.stringify(current.identity.visualIdentity ?? null) !==
        JSON.stringify(snapshot.identity.visualIdentity ?? null);

      // UM comando, UM fato, UM evento. Tentei dois (o catálogo :390 promete
      // `ClubIdentityApplied` + `ClubIdentityPeriodOpened`) e o log recusou: ele
      // aceita um evento por versão de agregado, e o período não é agregado —
      // não tem `version`, e ninguém o disputa. Ver `club-events.ts`.
      if (nomeMudou || visualMudou) {
        await emit(repositories, { ...input, clubVersion: snapshot.version }, {
          aggregateType: ClubAggregateType.CLUB,
          aggregateId: snapshot.id,
          aggregateVersion: snapshot.version,
        }, ClubEventType.CLUB_IDENTITY_APPLIED, {
          clubId: input.clubId,
          identityPeriodId: identityId,
          periodOpened: nomeMudou,
          previousName: current.identity.name,
          name: snapshot.identity.name,
          previousShortCode: current.identity.shortCode,
          shortCode: snapshot.identity.shortCode,
          effectiveFrom: snapshot.identity.effectiveFrom,
          visualIdentity: snapshot.identity.visualIdentity ?? null,
          changedFields: changedVisualFields(
            current.identity.visualIdentity,
            snapshot.identity.visualIdentity,
          ),
        } satisfies ClubIdentityAppliedPayload);
      }

      return succeed(snapshot);
    });
  }
}

// ─── auxiliares ──────────────────────────────────────────────────────────────

/**
 * A violação do índice único parcial de nome vigente.
 *
 * Casa pela MENSAGEM, e isso é medido, não suposto: eu tinha escrito isto
 * lendo `meta.target`, o teste mostrou o erro escapando, e a forma real é a que
 * `prisma-club-repository.test.ts` já provava —
 * `Unique constraint failed on the fields: (gameWorldId, name)`. O Prisma nomeia
 * os CAMPOS; o nome do índice parcial ele não expõe.
 *
 * Os campos bastam para distinguir: o outro índice parcial da mesma tabela é
 * sobre `(gameWorldId, clubId)`.
 */
function isNameTaken(error: unknown): boolean {
  if ((error as { code?: string })?.code !== "P2002") return false;
  const message = (error as { message?: string })?.message ?? "";
  return /Unique constraint failed on the fields[^)]*gameWorldId[^)]*name/u.test(
    message,
  );
}

function changedVisualFields(
  before: VisualIdentitySnapshot | undefined,
  after: VisualIdentitySnapshot | undefined,
): readonly string[] {
  if (after === undefined) return before === undefined ? [] : ["visualIdentity"];
  const keys = Object.keys(after) as (keyof VisualIdentitySnapshot)[];
  return keys.filter((key) => before?.[key] !== after[key]);
}

class Rollback extends Error {
  public constructor(public readonly domainError: DomainError) {
    super(domainError.message);
  }
}

/**
 * Uma falha de DOMÍNIO tem de desfazer a transação — senão a escrita parcial
 * fica, e em C3 "parcial" é um clube sem estádio. Prisma só desfaz por exceção,
 * então empacotamos o erro, lançamos, e desempacotamos fora. O `Result` do
 * chamador não muda.
 */
async function run<T>(
  unitOfWork: ClubUnitOfWork,
  work: (repositories: ClubRepositories) => Promise<Result<T, DomainError>>,
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

async function emit(
  repositories: ClubRepositories,
  context: {
    gameWorldId: string;
    worldSeed: string;
    occurredOn: string;
    actorId: string;
    correlationId?: string;
    /** A versão do clube DEPOIS do comando — o discriminador do eventId. */
    clubVersion: number;
  },
  subject: {
    aggregateType: ClubAggregateType;
    aggregateId: string;
    aggregateVersion: number;
  },
  eventType: ClubEventType,
  payload: ClubIdentityAppliedPayload,
): Promise<void> {
  await repositories.events.append([
    clubEvent({
      // Determinístico: reprocessar o mesmo comando produz o mesmo eventId, e o
      // unique do log recusa o duplicado em vez de bifurcar a história.
      /**
       * Determinístico: reprocessar o mesmo comando produz o mesmo eventId, e o
       * unique do log recusa o duplicado em vez de bifurcar a história.
       *
       * **A versão do CLUBE entra na semente, e ela é o que distingue.** Derivar
       * só de `(tipo, agregado, versão do agregado)` colidia num caso real, e o
       * HTTP o achou: rebranding no mesmo dia lógico SUBSTITUI o período aberto
       * (a regra de 5f1c654) — mesmo `identityId`, mesma "versão 1" do período.
       * Dois rebrandings no mesmo dia geravam o mesmo eventId para fatos
       * diferentes, e o log recusava o segundo com `Unique constraint failed on
       * (id)`.
       *
       * A versão do clube sempre anda, mesmo quando a do período não anda. É ela
       * que separa "o mesmo comando reenviado" de "outro comando".
       */
      eventId: deterministicUuidV7({
        worldSeed: context.worldSeed,
        context: `club-event:${eventType}:${subject.aggregateId}:${subject.aggregateVersion}:${context.clubVersion}`,
        timestampMilliseconds: timestampOf(context.occurredOn),
      }),
      gameWorldId: context.gameWorldId,
      aggregateType: subject.aggregateType,
      aggregateId: subject.aggregateId,
      aggregateVersion: subject.aggregateVersion,
      eventType,
      payload,
      occurredOn: context.occurredOn,
      actorId: context.actorId,
      correlationId: context.correlationId ?? null,
      causationId: context.correlationId ?? null,
    }),
  ]);
}
