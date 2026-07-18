/**
 * Lógica pura da tela de Elenco (M-SQUAD): agrupamento por setor, ordenação e o
 * "relatório de elenco" (profundidade por posição e lacunas). Sem React, sem
 * rede, sem `Date.now()` — só transforma o que a query `roster` já trouxe.
 */

export type Sector = "GOL" | "DEF" | "MEI" | "ATA";

/** A ordem canônica de exibição — do gol ao ataque. */
export const SECTORS: readonly Sector[] = ["GOL", "DEF", "MEI", "ATA"];

export const SECTOR_LABEL: Readonly<Record<Sector, string>> = {
  GOL: "Goleiros",
  DEF: "Defensores",
  MEI: "Meio-campistas",
  ATA: "Atacantes",
};

/** A que setor cada posição pertence. Desconhecida cai no meio (defensivo). */
const SECTOR_BY_POSITION: Readonly<Record<string, Sector>> = {
  GK: "GOL",
  CB: "DEF",
  LB: "DEF",
  RB: "DEF",
  LWB: "DEF",
  RWB: "DEF",
  CDM: "MEI",
  CM: "MEI",
  CAM: "MEI",
  LM: "MEI",
  RM: "MEI",
  LW: "ATA",
  RW: "ATA",
  ST: "ATA",
  CF: "ATA",
};

export function sectorOf(code: string): Sector {
  return SECTOR_BY_POSITION[code] ?? "MEI";
}

/**
 * O mínimo de jogadores por setor para o time entrar em campo com um 4-4-2 e
 * ter margem de troca. Abaixo disso é lacuna (o elenco não escala sozinho). Não
 * é regra de balanceamento do GDD — é o piso para "dá para jogar".
 */
const MINIMUM_DEPTH: Readonly<Record<Sector, number>> = {
  GOL: 2,
  DEF: 4,
  MEI: 4,
  ATA: 2,
};

/** O contrato mínimo que a lógica lê de cada jogador (a query traz mais). */
export interface RosterPlayerLike {
  readonly primaryPosition: string;
  readonly overall: number;
  readonly age: number;
  readonly availability: string;
}

export interface RosterSection<T> {
  readonly sector: Sector;
  readonly label: string;
  readonly players: readonly T[];
}

/**
 * Agrupa por setor na ordem canônica, cada setor ordenado por overall (desc),
 * desempate por idade (mais novo primeiro). Setores sem ninguém são omitidos.
 * `only` recorta para um setor (o filtro da tela); `null`/omitido = todos.
 */
export function groupBySector<T extends RosterPlayerLike>(
  players: readonly T[],
  only: Sector | null = null,
): RosterSection<T>[] {
  const sections: RosterSection<T>[] = [];
  for (const sector of SECTORS) {
    if (only !== null && sector !== only) continue;
    const inSector = players
      .filter((p) => sectorOf(p.primaryPosition) === sector)
      .sort((a, b) => b.overall - a.overall || a.age - b.age);
    if (inSector.length === 0) continue;
    sections.push({ sector, label: SECTOR_LABEL[sector], players: inSector });
  }
  return sections;
}

export interface SquadReport {
  readonly total: number;
  /** Quantos jogadores em cada setor. */
  readonly depth: Readonly<Record<Sector, number>>;
  /** Idade média (uma casa decimal); 0 se o elenco está vazio. */
  readonly averageAge: number;
  /** Overall médio (inteiro); 0 se vazio. */
  readonly averageOverall: number;
  /** Setores abaixo do piso — o elenco não escala sozinho ali. */
  readonly gaps: readonly Sector[];
}

/** O cabeçalho da tela: tamanho, profundidade por setor, médias e lacunas. */
export function buildSquadReport(
  players: readonly RosterPlayerLike[],
): SquadReport {
  const depth: Record<Sector, number> = { GOL: 0, DEF: 0, MEI: 0, ATA: 0 };
  let ageSum = 0;
  let ovrSum = 0;
  for (const p of players) {
    depth[sectorOf(p.primaryPosition)] += 1;
    ageSum += p.age;
    ovrSum += p.overall;
  }
  const total = players.length;
  const gaps = SECTORS.filter((s) => depth[s] < MINIMUM_DEPTH[s]);
  return {
    total,
    depth,
    averageAge: total === 0 ? 0 : Math.round((ageSum / total) * 10) / 10,
    averageOverall: total === 0 ? 0 : Math.round(ovrSum / total),
    gaps,
  };
}

export type AvailabilityTone = "ok" | "warn" | "danger";

export interface AvailabilityBadge {
  readonly label: string;
  readonly tone: AvailabilityTone;
}

/**
 * Rótulo PT + tom da disponibilidade esportiva (M-02). Só rende badge quando há
 * algo a dizer — AVAILABLE devolve `null` (jogador apto não precisa de selo).
 */
export function availabilityBadge(
  availability: string,
): AvailabilityBadge | null {
  switch (availability) {
    case "INJURED":
      return { label: "Lesionado", tone: "danger" };
    case "SUSPENDED":
      return { label: "Suspenso", tone: "danger" };
    case "CONVENED":
      return { label: "Convocado", tone: "warn" };
    case "UNAVAILABLE":
      return { label: "Indisponível", tone: "warn" };
    case "AVAILABLE":
    default:
      return null;
  }
}
