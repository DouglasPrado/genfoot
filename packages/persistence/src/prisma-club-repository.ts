import type {
  ClubDepartmentKind,
  ClubId,
  ClubRepository,
  ClubSnapshot,
  ClubStatus,
  StadiumLicenseStatus,
  VisualIdentitySnapshot,
} from "@grinta/core";
import { parseRulesetVersion, type GameWorldId } from "@grinta/shared";

import type { Prisma } from "./generated/prisma/client.js";

/**
 * Adapter do clube (R-175). Um agregado, um clube — o `WorldClubPortfolio`
 * carregava os 16 clubes do mundo para mexer em um.
 *
 * Este adapter é o que destrava `identity:reserve-club`: a reserva já vive no
 * Postgres e pendura em `Club` por FK, mas o clube só existia dentro do blob
 * JSON. A FK falhava contra uma tabela vazia.
 *
 * `Prisma.TransactionClient` no construtor não é detalhe: ele não tem
 * `$transaction`, então este adapter NÃO consegue abrir a sua. Um clube ocupa 6
 * tabelas, e meio clube gravado é corrupção — quem chama `saveClub` tem que
 * estar dentro de uma transação. É o tipo que impõe, não o comentário.
 *
 * NÃO escritos por C3, e cada um por um motivo: `cashMinor`/`wageBudgetMinor`/
 * `transferBudgetMinor`/`currencyId` são projeção do razão e pertencem ao C9 —
 * o clube nunca escreve `LedgerEntry` (context map:78). `fanBaseSize`,
 * `boardPatience` e `pressureLevel` são do C10. `foundedYear` não existe no
 * domínio. Ficam no default até terem dono — dívida declarada, não descuido.
 */
export class PrismaClubRepository implements ClubRepository {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async findClubById(
    gameWorldId: GameWorldId,
    clubId: ClubId,
  ): Promise<ClubSnapshot | null> {
    const row = await this.client.club.findUnique({
      where: { gameWorldId_id: { gameWorldId, id: clubId } },
      include: {
        identityPeriods: { orderBy: { effectiveFrom: "asc" } },
        stadium: true,
        departments: { orderBy: { type: "asc" } },
        ticketPolicies: { orderBy: { effectiveOn: "asc" } },
        commercialAgreements: { orderBy: { startsOn: "asc" } },
        boardDecisions: { orderBy: { recordedAt: "asc" } },
      },
    });
    if (row === null) return null;
    return toSnapshot(row);
  }

  public async saveClub(
    snapshot: ClubSnapshot,
    expectedVersion: number | null,
  ): Promise<void> {
    const { gameWorldId, id } = snapshot;
    const data = {
      regionId: snapshot.regionId,
      status: snapshot.status,
      reputationBand: snapshot.reputationBand,
      version: snapshot.version,
    };

    if (expectedVersion === null) {
      await this.client.club.create({ data: { id, gameWorldId, ...data } });
    } else {
      const { count } = await this.client.club.updateMany({
        where: { id, gameWorldId, version: expectedVersion },
        data,
      });
      if (count === 0) throw new ClubVersionConflict(id, expectedVersion);
    }

    // As coleções são reescritas, não somadas: o array do domínio é a verdade, e
    // a tabela tem que ficar IGUAL a ele. Um save que só insere duplicaria tudo
    // no segundo save. Apagar e reinserir dentro da transação é O(filhos) por
    // save — aceitável porque o clube é pequeno (1 estádio, 6 departamentos), e
    // é o que mantém a tabela sendo função do agregado, não do seu histórico de
    // escritas.
    const scope = { gameWorldId, clubId: id };
    await this.client.clubIdentityPeriod.deleteMany({ where: scope });
    await this.client.stadium.deleteMany({ where: scope });
    await this.client.clubDepartment.deleteMany({ where: scope });
    await this.client.ticketPricePolicy.deleteMany({ where: scope });
    await this.client.commercialAgreement.deleteMany({ where: scope });
    await this.client.boardDecision.deleteMany({ where: scope });

    // `identity` não vira coluna: ela É o período aberto. Gravar as duas coisas
    // criaria duas fontes para "como o clube se chama hoje" — e duas fontes
    // divergem em silêncio. O snapshot tem `identity` e `identityHistory`
    // porque o domínio lê os dois; a tabela guarda um só.
    await this.client.clubIdentityPeriod.createMany({
      data: snapshot.identityHistory.map((period) => ({
        id: period.id,
        ...scope,
        name: period.name,
        shortCode: period.shortCode,
        effectiveFrom: fromWorldDate(period.effectiveFrom),
        effectiveThrough:
          period.effectiveThrough === null
            ? null
            : fromWorldDate(period.effectiveThrough),
        rulesetVersion: period.rulesetVersion,
        ...visualIdentityColumns(period.visualIdentity),
      })),
    });

    await this.client.stadium.create({
      data: {
        id: snapshot.stadium.id,
        ...scope,
        name: snapshot.stadium.name,
        tenure: snapshot.stadium.tenure,
        capacity: snapshot.stadium.capacity,
        pitchQuality: snapshot.stadium.pitchQuality,
        condition: snapshot.stadium.condition,
        licenseStatus: snapshot.stadium.licenseStatus,
        maintenanceDueOn: nullableWorldDate(snapshot.stadium.maintenanceDueOn),
        version: snapshot.stadium.version,
      },
    });

    await this.client.clubDepartment.createMany({
      data: snapshot.departments.map((department) => ({
        ...scope,
        type: department.kind,
        level: department.level,
        targetLevel: department.targetLevel,
        capacity: department.capacity,
        condition: department.condition,
        maintenanceDueOn: nullableWorldDate(department.maintenanceDueOn),
      })),
    });

    await this.client.ticketPricePolicy.createMany({
      data: snapshot.ticketPolicies.map((policy) => ({
        id: policy.id,
        ...scope,
        // R-181: a coluna é BigInt; o domínio ainda tem `number`. A conversão é
        // segura porque o preço de um ingresso não chega perto de 2^53 — e ela
        // some quando C9 levar o dinheiro para bigint.
        priceMinor: BigInt(policy.priceMinor),
        effectiveOn: fromWorldDate(policy.effectiveOn),
        rulesetVersion: policy.rulesetVersion,
      })),
    });

    await this.client.commercialAgreement.createMany({
      data: snapshot.commercialAgreements.map((agreement) => ({
        id: agreement.id,
        ...scope,
        asset: agreement.asset,
        exclusive: agreement.exclusive,
        startsOn: fromWorldDate(agreement.startsOn),
        endsOn: fromWorldDate(agreement.endsOn),
        externalAgreementRef: agreement.externalAgreementRef,
        rulesetVersion: agreement.rulesetVersion,
      })),
    });

    await this.client.boardDecision.createMany({
      data: snapshot.boardDecisions.map((decision) => ({
        id: decision.id,
        ...scope,
        decisionType: decision.decisionType,
        authorId: decision.authorId,
        justification: decision.justification,
        effectiveFrom: fromWorldDate(decision.effectiveFrom),
        effectiveThrough: nullableWorldDate(decision.effectiveThrough),
        recordedAt: fromWorldDate(decision.recordedAt),
        rulesetVersion: decision.rulesetVersion,
      })),
    });
  }
}

export class ClubVersionConflict extends Error {
  public readonly code = "CLUB_VERSION_CONFLICT";
  public constructor(id: string, expectedVersion: number) {
    super(`Clube ${id} mudou: versão esperada ${expectedVersion} não confere.`);
  }
}

interface ClubRow {
  readonly id: string;
  readonly gameWorldId: string;
  readonly regionId: string;
  readonly status: string;
  readonly reputationBand: number;
  readonly version: number;
  readonly identityPeriods: readonly IdentityPeriodRow[];
  readonly stadium: StadiumRow | null;
  readonly departments: readonly DepartmentRow[];
  readonly ticketPolicies: readonly TicketPolicyRow[];
  readonly commercialAgreements: readonly CommercialAgreementRow[];
  readonly boardDecisions: readonly BoardDecisionRow[];
}

interface IdentityPeriodRow {
  readonly id: string;
  readonly name: string;
  readonly shortCode: string;
  readonly effectiveFrom: Date;
  readonly effectiveThrough: Date | null;
  readonly rulesetVersion: string;
  readonly primaryColor: string | null;
  readonly secondaryColor: string | null;
  readonly tertiaryColor: string | null;
  readonly homeKitTemplateId: string | null;
  readonly awayKitTemplateId: string | null;
  readonly crestTemplateId: string | null;
}

interface StadiumRow {
  readonly id: string;
  readonly name: string;
  readonly tenure: string;
  readonly capacity: number;
  readonly pitchQuality: number;
  readonly condition: number;
  readonly licenseStatus: string;
  readonly maintenanceDueOn: Date | null;
  readonly version: number;
}

interface DepartmentRow {
  readonly type: string;
  readonly level: number;
  readonly targetLevel: number;
  readonly capacity: number;
  readonly condition: number;
  readonly maintenanceDueOn: Date | null;
}

interface TicketPolicyRow {
  readonly id: string;
  readonly priceMinor: bigint;
  readonly effectiveOn: Date;
  readonly rulesetVersion: string;
}

interface CommercialAgreementRow {
  readonly id: string;
  readonly asset: string;
  readonly exclusive: boolean;
  readonly startsOn: Date;
  readonly endsOn: Date;
  readonly externalAgreementRef: string;
  readonly rulesetVersion: string;
}

interface BoardDecisionRow {
  readonly id: string;
  readonly decisionType: string;
  readonly authorId: string;
  readonly justification: string;
  readonly effectiveFrom: Date;
  readonly effectiveThrough: Date | null;
  readonly recordedAt: Date;
  readonly rulesetVersion: string;
}

function toSnapshot(row: ClubRow): ClubSnapshot {
  const identityHistory = row.identityPeriods.map(toIdentityPeriod);
  // A identidade vigente é o período aberto. Se não há nenhum, a linha está
  // corrompida: um clube sem nome hoje não é um clube com nome vazio — é um
  // clube que o domínio recusaria (`Club.fromSnapshot`). Devolver um snapshot
  // meia-boca deixaria a invariante quebrar longe daqui.
  const current = identityHistory.find(({ effectiveThrough }) => effectiveThrough === null);
  if (current === undefined) {
    throw new Error(`Clube ${row.id} não tem período de identidade vigente.`);
  }
  if (row.stadium === null) {
    throw new Error(`Clube ${row.id} não tem estádio.`);
  }
  const stadium = row.stadium;
  return {
    id: row.id as ClubSnapshot["id"],
    gameWorldId: row.gameWorldId as GameWorldId,
    identity: current,
    identityHistory,
    regionId: row.regionId,
    reputationBand: row.reputationBand,
    status: row.status as ClubStatus,
    departments: row.departments.map((department) => ({
      kind: department.type as ClubDepartmentKind,
      level: department.level,
      targetLevel: department.targetLevel,
      capacity: department.capacity,
      condition: department.condition,
      maintenanceDueOn: toNullableWorldDate(department.maintenanceDueOn),
    })),
    stadium: {
      id: stadium.id as ClubSnapshot["stadium"]["id"],
      name: stadium.name,
      tenure: stadium.tenure as ClubSnapshot["stadium"]["tenure"],
      capacity: stadium.capacity,
      pitchQuality: stadium.pitchQuality,
      condition: stadium.condition,
      licenseStatus: stadium.licenseStatus as StadiumLicenseStatus,
      maintenanceDueOn: toNullableWorldDate(stadium.maintenanceDueOn),
      version: stadium.version,
    },
    ticketPolicies: row.ticketPolicies.map((policy) => ({
      id: policy.id as ClubSnapshot["ticketPolicies"][number]["id"],
      priceMinor: Number(policy.priceMinor),
      effectiveOn: toWorldDate(policy.effectiveOn),
      rulesetVersion: ruleset(policy.rulesetVersion, row.id),
    })),
    commercialAgreements: row.commercialAgreements.map((agreement) => ({
      id: agreement.id as ClubSnapshot["commercialAgreements"][number]["id"],
      asset: agreement.asset,
      exclusive: agreement.exclusive,
      startsOn: toWorldDate(agreement.startsOn),
      endsOn: toWorldDate(agreement.endsOn),
      externalAgreementRef: agreement.externalAgreementRef,
      rulesetVersion: ruleset(agreement.rulesetVersion, row.id),
    })),
    boardDecisions: row.boardDecisions.map((decision) => ({
      id: decision.id as ClubSnapshot["boardDecisions"][number]["id"],
      decisionType: decision.decisionType,
      authorId: decision.authorId,
      justification: decision.justification,
      effectiveFrom: toWorldDate(decision.effectiveFrom),
      effectiveThrough: toNullableWorldDate(decision.effectiveThrough),
      recordedAt: toWorldDate(decision.recordedAt),
      rulesetVersion: ruleset(decision.rulesetVersion, row.id),
    })),
    version: row.version,
  };
}

function toIdentityPeriod(
  row: IdentityPeriodRow,
): ClubSnapshot["identityHistory"][number] {
  const visualIdentity = toVisualIdentity(row);
  return {
    id: row.id as ClubSnapshot["identity"]["id"],
    name: row.name,
    shortCode: row.shortCode,
    effectiveFrom: toWorldDate(row.effectiveFrom),
    effectiveThrough: toNullableWorldDate(row.effectiveThrough),
    rulesetVersion: ruleset(row.rulesetVersion, row.id),
    // A chave é OMITIDA quando não há identidade visual, não posta como
    // `undefined`: a serialização canônica recusa `undefined` (R-176), e um
    // clube gerado nasce sem identidade visual — o jogador a define ao
    // personalizar (BC-003).
    ...(visualIdentity === null ? {} : { visualIdentity }),
  };
}

function toVisualIdentity(row: IdentityPeriodRow): VisualIdentitySnapshot | null {
  if (
    row.primaryColor === null ||
    row.secondaryColor === null ||
    row.homeKitTemplateId === null ||
    row.awayKitTemplateId === null ||
    row.crestTemplateId === null
  ) {
    return null;
  }
  return {
    primaryColor: row.primaryColor,
    secondaryColor: row.secondaryColor,
    tertiaryColor: row.tertiaryColor,
    homeKitTemplateId: row.homeKitTemplateId,
    awayKitTemplateId: row.awayKitTemplateId,
    crestTemplateId: row.crestTemplateId,
  };
}

function visualIdentityColumns(visualIdentity: VisualIdentitySnapshot | undefined) {
  return visualIdentity === undefined
    ? {}
    : {
        primaryColor: visualIdentity.primaryColor,
        secondaryColor: visualIdentity.secondaryColor,
        tertiaryColor: visualIdentity.tertiaryColor,
        homeKitTemplateId: visualIdentity.homeKitTemplateId,
        awayKitTemplateId: visualIdentity.awayKitTemplateId,
        crestTemplateId: visualIdentity.crestTemplateId,
      };
}

function ruleset(value: string, owner: string): ClubSnapshot["identity"]["rulesetVersion"] {
  const parsed = parseRulesetVersion(value);
  if (!parsed.ok) {
    throw new Error(`${owner} tem rulesetVersion inválido: ${value}`);
  }
  return parsed.value;
}

/** `YYYY-MM-DD` → meia-noite UTC, que é o que a coluna DATE guarda. */
function fromWorldDate(worldDate: string): Date {
  return new Date(`${worldDate}T00:00:00.000Z`);
}

function nullableWorldDate(worldDate: string | null): Date | null {
  return worldDate === null ? null : fromWorldDate(worldDate);
}

/** Volta só a data: o domínio não conhece hora (R-177). */
function toWorldDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toNullableWorldDate(value: Date | null): string | null {
  return value === null ? null : toWorldDate(value);
}
