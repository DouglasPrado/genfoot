/** Tipos de apresentação derivados da projeção oficial do elenco. */
export type PlayerForm = "up" | "steady" | "down";
export type PositionGroup = "GOL" | "DEF" | "MEI" | "ATA";

/**
 * Rollup de atributos (R-179): 4 grupos derivados dos 39 atributos finos, na
 * escala 0–100. `goalkeeping` é `null` em quem não é goleiro (não se aplica ≠ 0).
 * Vem real da query `roster` (RosterView.groups).
 */
export interface PlayerGroups {
  readonly technical: number;
  readonly physical: number;
  readonly mental: number;
  readonly goalkeeping: number | null;
}

export interface SquadPlayer {
  readonly id: string;
  readonly number: number;
  readonly name: string;
  readonly position: string;
  readonly group: PositionGroup;
  readonly age: number;
  readonly ovr: number;
  readonly pot: number;
  readonly fitness: number; // 0..100
  readonly form: PlayerForm;
  readonly morale: number; // 0..100
  readonly contractYears: number;
  readonly starter: boolean;
  /** Barras de habilidade do card (4 grupos reais). `null` se a query não trouxe. */
  readonly groups: PlayerGroups | null;
  /** Os 39 atributos finos, por código (R-188). `null` se a query não trouxe. */
  readonly attributes: Record<string, number | null> | null;
}
