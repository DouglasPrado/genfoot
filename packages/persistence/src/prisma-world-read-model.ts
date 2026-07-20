import type { WorldListItemView, WorldReadModel } from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";

/**
 * Listagem dos mundos, no Postgres (R-173/R-182).
 *
 * Tudo numa consulta só: `clubCount` e `openSlots` saem de `_count`, e a
 * participação do usuário de um `where` no include. Sem N+1 e sem a tela ter de
 * perguntar "quantas vagas?" mundo a mundo.
 */
export class PrismaWorldReadModel implements WorldReadModel {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async listWorlds(
    accountId?: string | null,
  ): Promise<readonly WorldListItemView[]> {
    const rows = await this.client.gameWorld.findMany({
      include: {
        _count: { select: { clubs: true } },
        /**
         * Os clubes SEM controle ativo — as vagas.
         *
         * `select: { id: true }` e não `_count`: o Prisma não conta relação
         * filtrando por neto (`Club` sem `ClubControl` ativo). Trazer só os ids
         * dos clubes com dono e subtrair é exato e barato — são dezenas por
         * mundo, não milhares.
         */
        clubs: {
          where: { controls: { some: { status: "ACTIVE" } } },
          select: { id: true },
        },
        // A participação DESTE usuário. Sem conta, a lista vem sem o campo — é o
        // caso do admin, que lista mundos sem jogar em nenhum.
        ...(accountId === undefined || accountId === null
          ? {}
          : {
              worldParticipants: {
                where: { userId: accountId },
                take: 1,
                include: { clubControls: { where: { status: "ACTIVE" }, take: 1 } },
              },
            }),
      },
      orderBy: { seed: "asc" },
    });

    return rows.map((row) => {
      const tomados = row.clubs.length;
      const participation = (
        row as unknown as { worldParticipants?: readonly ParticipantRow[] }
      ).worldParticipants?.[0];
      return {
        id: row.id,
        seed: row.seed,
        // O NOME que o admin definiu (`world:set-identity`). Anulável: mundo
        // semeado nasce sem ele, e a tela cai no `seed`. Sem este campo a
        // `M-WORLD-PICK` mostrava identificador técnico ("grinta-demo") ao
        // jogador, e a listagem do admin buscava o detalhe de cada mundo só
        // para tê-lo — N+1 requisições por uma coluna.
        name: row.name,
        status: row.status,
        // Só a data: o domínio não conhece hora (R-177).
        currentDate: row.currentDate.toISOString().slice(0, 10),
        startDate: row.startDate.toISOString().slice(0, 10),
        rulesetVersion: row.rulesetVersion,
        /**
         * A temporada CORRENTE. Anulável de propósito: mundo semeado nasce sem
         * ela, e 2 dos 24 mundos de desenvolvimento estão nesse estado.
         *
         * Sem este campo o cliente não tinha como montar plano de treino:
         * `training:set-plan` e a query `training-plan` exigem `seasonId`, e
         * NENHUMA query o devolvia — a tela precisaria adivinhar um uuid. Com o
         * campo, ela lê; e quando vem `null`, ela pode DIZER que o mundo ainda
         * não tem temporada, em vez de falhar sem explicação.
         */
        currentSeasonId: row.currentSeasonId,
        clubCount: row._count.clubs,
        openSlots: row._count.clubs - tomados,
        myParticipation:
          participation === undefined
            ? null
            : {
                status: participation.status,
                hasActiveControl: participation.clubControls.length > 0,
                cooldownUntilOn:
                  participation.cooldownUntilOn === null
                    ? null
                    : participation.cooldownUntilOn.toISOString().slice(0, 10),
              },
      };
    });
  }
}

interface ParticipantRow {
  readonly status: string;
  readonly cooldownUntilOn: Date | null;
  readonly clubControls: readonly unknown[];
}
