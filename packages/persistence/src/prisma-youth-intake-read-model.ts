import { scoutPotentialBand } from "@grinta/core";

import type { Prisma } from "./generated/prisma/client.js";

/**
 * O pool de captação de um mundo (R-218, `M-YOUTH-INTAKE`).
 *
 * Candidato de captação = `Player` com `generationSource = SCOUT_FOUND` e SEM
 * vínculo de elenco (sem `SquadMembership` ativo). Ao ser contratado (contrato
 * de formação, bloqueado C6/C9), ele ganha squad e sai do pool.
 *
 * O que a tela vê é a FAIXA do olheiro (R-04), nunca o potencial exato: o
 * `potentialAbility` real é lido do banco mas só a banda sai daqui.
 */

/**
 * Qualidade de olheiro assumida enquanto o staff/olheiro não está ligado à
 * captação. Provisório declarado (candidato a VAL-001): um olheiro mediano.
 * Quando o `ScoutMember`/staff entrar, a qualidade vem dele.
 */
const PROVISIONAL_SCOUT_QUALITY = 55;
/** Ciclos de observação: 1 enquanto não há acompanhamento continuado. */
const PROVISIONAL_CYCLES = 1;

export interface YouthIntakeCandidateView {
  readonly playerId: string;
  readonly primaryPosition: string;
  readonly age: number;
  readonly potentialBand: { readonly min: number; readonly max: number; readonly confidence: number };
}

export interface YouthIntakeReadModel {
  candidates(gameWorldId: string): Promise<readonly YouthIntakeCandidateView[]>;
}

export class PrismaYouthIntakeReadModel implements YouthIntakeReadModel {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async candidates(
    gameWorldId: string,
  ): Promise<readonly YouthIntakeCandidateView[]> {
    const rows = await this.client.player.findMany({
      where: {
        gameWorldId,
        generationSource: "SCOUT_FOUND",
        // Candidato ainda solto: nenhuma vinculação de elenco ativa.
        squadMemberships: { none: { isActive: true } },
      },
      select: {
        id: true,
        primaryPosition: true,
        potentialAbility: true,
        person: { select: { ageVirtual: true } },
      },
    });

    return rows.map((row) => ({
      playerId: row.id,
      primaryPosition: row.primaryPosition,
      age: row.person.ageVirtual,
      // A verdade (potentialAbility) entra aqui mas NÃO sai — só a faixa.
      potentialBand: scoutPotentialBand({
        truePotential: row.potentialAbility,
        scoutQuality: PROVISIONAL_SCOUT_QUALITY,
        cycles: PROVISIONAL_CYCLES,
      }),
    }));
  }
}
