import type {
  ClubReadModel,
  ClubWorldView,
} from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";

/**
 * Leitura de C3 no Postgres (R-175).
 *
 * O nome do clube vem do PERÍODO vigente, não de uma coluna: o clube não tem
 * nome, tem história de nomes, e o de hoje é o que tem `effectiveThrough IS
 * NULL` (BC-003). O índice único parcial garante que há no máximo um — então o
 * `take: 1` não escolhe entre candidatos, ele pega o único.
 *
 * Um clube sem período vigente é linha corrompida, e a view diz isso em vez de
 * inventar string vazia: nome vazio numa lista parece clube sem nome, e o
 * defeito viajaria até a tela.
 */
export class PrismaClubReadModel implements ClubReadModel {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async summary(
    gameWorldId: string,
  ): Promise<Readonly<{ clubCount: number }>> {
    return { clubCount: await this.client.club.count({ where: { gameWorldId } }) };
  }

  public async worldView(gameWorldId: string): Promise<ClubWorldView> {
    const rows = await this.client.club.findMany({
      where: { gameWorldId },
      include: {
        stadium: true,
        identityPeriods: { where: { effectiveThrough: null }, take: 1 },
        // R-180: quem comanda é o controle ATIVO. Sem ele, o clube é da IA — e
        // é por isso que não há um campo "isAi" para ler.
        controls: {
          where: { status: "ACTIVE" },
          take: 1,
          include: { worldParticipant: { include: { user: true } } },
        },
        // R-25: retenção mole com prazo. Só HELD conta — CONFIRMED já virou
        // controle, e RELEASED/EXPIRED são passado.
        entryReservations: { where: { status: "HELD" }, take: 1 },
        departments: { orderBy: { type: "asc" } },
      },
      orderBy: { regionId: "asc" },
    });

    return {
      gameWorldId,
      clubs: rows.map((row) => {
        const identity = row.identityPeriods[0];
        if (identity === undefined) {
          throw new Error(`Clube ${row.id} não tem período de identidade vigente.`);
        }
        return {
          id: row.id,
          name: identity.name,
          shortCode: identity.shortCode,
          regionId: row.regionId,
          status: row.status,
          reputationBand: row.reputationBand,
          stadiumName: row.stadium?.name ?? "",
          stadiumCapacity: row.stadium?.capacity ?? 0,
          primaryColor: identity.primaryColor,
          secondaryColor: identity.secondaryColor,
          crestTemplateId: identity.crestTemplateId,
          manager: toManager(row.controls[0]),
          reservedUntil: toWorldDate(row.entryReservations[0]?.expiresOn),
          version: row.version,
          departments: row.departments.map((d) => ({
            kind: d.type,
            level: d.level,
            capacity: d.capacity,
            condition: d.condition,
          })),
        };
      }),
    };
  }
}

interface ControlRow {
  readonly worldParticipant: { readonly user: { readonly id: string; readonly name: string } | null } | null;
}

/**
 * O gestor, ou `null` para IA.
 *
 * `null` também quando o controle existe mas o join não resolve a conta: é linha
 * corrompida, e inventar um nome ali esconderia o defeito. Um clube que aparece
 * como automático quando deveria ter dono é visível; um clube com nome inventado
 * não é.
 */
function toManager(
  control: ControlRow | undefined,
): { accountId: string; name: string } | null {
  const user = control?.worldParticipant?.user;
  return user === undefined || user === null
    ? null
    : { accountId: user.id, name: user.name };
}

/** Só a data: o domínio não conhece hora (R-177). */
function toWorldDate(value: Date | null | undefined): string | null {
  return value === null || value === undefined
    ? null
    : value.toISOString().slice(0, 10);
}
