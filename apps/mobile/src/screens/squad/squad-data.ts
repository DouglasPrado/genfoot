/** Tipos de apresentação derivados da projeção oficial do elenco. */
export type PlayerForm = "up" | "steady" | "down";
export type PositionGroup = "GOL" | "DEF" | "MEI" | "ATA";

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
}
