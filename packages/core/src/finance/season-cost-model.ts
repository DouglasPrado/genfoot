/**
 * Modelo de custo de temporada — o que o clube paga por temporada, decomposto.
 *
 * Função PURA (zero I/O, zero `Date.now`/`Math.random`), determinística: a mesma
 * entrada dá o mesmo total. É a fonte da tela de Finanças (M-FINANCE) e do débito
 * de encerramento (`close-season-finances.ts`).
 *
 * **Honestidade sobre a lacuna.** Cada linha carrega uma `provenance`:
 * - `CONTRACTED` — sai de um contrato real (`salaryPerSeasonMinor`).
 * - `ESTIMATED` — derivado de dado real por estimador de 1ª passada (jogador da
 *   gênese sem contrato — R-189; manutenção de infra/estádio, sem coeficiente
 *   canônico).
 * - as categorias sem fonte alguma (comissão técnica, viagens, impostos,
 *   comissão de empresário) NÃO viram linha R$ 0 fictícia: entram em `omitted`,
 *   e a UI mostra "não disponível". Não se inventa dado (regra dura do projeto).
 */

import type { ClubDepartmentKind } from "../clubs/club-types.js";
import {
  estimatePlayerValueMinor,
  estimateSalaryPerSeasonMinor,
} from "../players/player-value.js";

import {
  estimateInfraMaintenanceMinor,
  estimateStadiumMaintenanceMinor,
} from "./cost-estimators.js";

export const SeasonCostCategory = {
  PLAYER_WAGES: "PLAYER_WAGES",
  STAFF_WAGES: "STAFF_WAGES",
  INFRA_MAINTENANCE: "INFRA_MAINTENANCE",
  STADIUM_MAINTENANCE: "STADIUM_MAINTENANCE",
  OPERATING: "OPERATING",
  TRAVEL: "TRAVEL",
  TAXES: "TAXES",
  AGENT_COMMISSION: "AGENT_COMMISSION",
} as const;

export type SeasonCostCategory =
  (typeof SeasonCostCategory)[keyof typeof SeasonCostCategory];

export const CostProvenance = {
  CONTRACTED: "CONTRACTED",
  ESTIMATED: "ESTIMATED",
  UNAVAILABLE: "UNAVAILABLE",
} as const;

export type CostProvenance =
  (typeof CostProvenance)[keyof typeof CostProvenance];

export interface SeasonCostPlayerInput {
  readonly playerId: string;
  readonly overall: number;
  readonly age: number;
  /** O salário do contrato ACTIVE, ou `null` para jogador sem contrato (R-189). */
  readonly salaryPerSeasonMinor: bigint | null;
}

export interface SeasonCostDepartmentInput {
  readonly kind: ClubDepartmentKind;
  readonly level: number;
  readonly capacity: number;
  readonly condition: number;
}

export interface SeasonCostStadiumInput {
  readonly capacity: number;
  readonly condition: number;
}

export interface SeasonCostModelInput {
  readonly currencyId: string;
  readonly players: readonly SeasonCostPlayerInput[];
  readonly departments: readonly SeasonCostDepartmentInput[];
  readonly stadium: SeasonCostStadiumInput;
}

export interface SeasonCostLine {
  readonly category: SeasonCostCategory;
  readonly amountMinor: bigint;
  readonly provenance: CostProvenance;
}

export interface SeasonCostBreakdown {
  readonly currencyId: string;
  readonly totalMinor: bigint;
  readonly lines: readonly SeasonCostLine[];
  readonly contractedPlayerCount: number;
  readonly estimatedPlayerCount: number;
  /** Categorias sem fonte real hoje — omitidas, nunca zeradas com número falso. */
  readonly omitted: readonly SeasonCostCategory[];
}

/** Categorias sem qualquer fonte materializada no domínio atual. */
const OMITTED_CATEGORIES: readonly SeasonCostCategory[] = [
  SeasonCostCategory.STAFF_WAGES,
  SeasonCostCategory.OPERATING,
  SeasonCostCategory.TRAVEL,
  SeasonCostCategory.TAXES,
  SeasonCostCategory.AGENT_COMMISSION,
];

export function computeSeasonCost(
  input: SeasonCostModelInput,
): SeasonCostBreakdown {
  let contractedWagesMinor = 0n;
  let estimatedWagesMinor = 0n;
  let contractedPlayerCount = 0;
  let estimatedPlayerCount = 0;

  for (const player of input.players) {
    if (player.salaryPerSeasonMinor !== null) {
      contractedWagesMinor += player.salaryPerSeasonMinor;
      contractedPlayerCount += 1;
    } else {
      estimatedWagesMinor += estimateSalaryPerSeasonMinor(
        estimatePlayerValueMinor(player.overall, player.age),
      );
      estimatedPlayerCount += 1;
    }
  }

  const infraMinor = input.departments.reduce(
    (acc, department) =>
      acc +
      estimateInfraMaintenanceMinor(
        department.level,
        department.capacity,
        department.condition,
      ),
    0n,
  );

  const stadiumMinor = estimateStadiumMaintenanceMinor(
    input.stadium.capacity,
    input.stadium.condition,
  );

  // Ordem determinística: folha contratada, folha estimada, infra, estádio.
  const lines: SeasonCostLine[] = [];
  if (contractedPlayerCount > 0) {
    lines.push({
      category: SeasonCostCategory.PLAYER_WAGES,
      amountMinor: contractedWagesMinor,
      provenance: CostProvenance.CONTRACTED,
    });
  }
  if (estimatedPlayerCount > 0) {
    lines.push({
      category: SeasonCostCategory.PLAYER_WAGES,
      amountMinor: estimatedWagesMinor,
      provenance: CostProvenance.ESTIMATED,
    });
  }
  if (infraMinor > 0n) {
    lines.push({
      category: SeasonCostCategory.INFRA_MAINTENANCE,
      amountMinor: infraMinor,
      provenance: CostProvenance.ESTIMATED,
    });
  }
  if (stadiumMinor > 0n) {
    lines.push({
      category: SeasonCostCategory.STADIUM_MAINTENANCE,
      amountMinor: stadiumMinor,
      provenance: CostProvenance.ESTIMATED,
    });
  }

  const totalMinor = lines.reduce((acc, line) => acc + line.amountMinor, 0n);

  return {
    currencyId: input.currencyId,
    totalMinor,
    lines,
    contractedPlayerCount,
    estimatedPlayerCount,
    omitted: OMITTED_CATEGORIES,
  };
}
