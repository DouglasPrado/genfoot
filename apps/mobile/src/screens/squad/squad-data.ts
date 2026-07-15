/**
 * View-model do Elenco. Tipado e estável; valores são um *seed de apresentação*
 * na linguagem visual do app (não há protótipo de lista — prototipo-jogadores é
 * a folha de customização de avatar). A próxima fatia troca este seed pela query
 * `players` (playerLifecycle) da API.
 */
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

export interface SquadViewModel {
  readonly club: string;
  readonly formation: string;
  readonly avgOvr: number;
  readonly squadValueLabel: string;
  readonly wageBillLabel: string;
  readonly players: readonly SquadPlayer[];
}

export const SQUAD_SEED: SquadViewModel = {
  club: "BELFORT",
  formation: "4-2-1-3",
  avgOvr: 76,
  squadValueLabel: "€ 48,6M",
  wageBillLabel: "1,2 mi/sem",
  players: [
    { id: "p1", number: 1, name: "Rafael Lima", position: "GOL", group: "GOL", age: 23, ovr: 78, pot: 82, fitness: 96, form: "steady", morale: 82, contractYears: 2, starter: true },
    { id: "p2", number: 2, name: "João Victor", position: "LD", group: "DEF", age: 21, ovr: 74, pot: 81, fitness: 88, form: "up", morale: 76, contractYears: 3, starter: true },
    { id: "p3", number: 3, name: "Gabriel Mendes", position: "ZAG", group: "DEF", age: 26, ovr: 79, pot: 82, fitness: 71, form: "down", morale: 64, contractYears: 1, starter: true },
    { id: "p4", number: 4, name: "Bruno Alves", position: "ZAG", group: "DEF", age: 28, ovr: 80, pot: 80, fitness: 92, form: "steady", morale: 80, contractYears: 2, starter: true },
    { id: "p5", number: 6, name: "Diego Rocha", position: "LE", group: "DEF", age: 24, ovr: 75, pot: 79, fitness: 85, form: "up", morale: 78, contractYears: 2, starter: true },
    { id: "p6", number: 5, name: "Pedro Henrique", position: "VOL", group: "MEI", age: 22, ovr: 76, pot: 84, fitness: 90, form: "up", morale: 84, contractYears: 3, starter: true },
    { id: "p7", number: 8, name: "Matheus Costa", position: "MEI", group: "MEI", age: 22, ovr: 78, pot: 85, fitness: 58, form: "down", morale: 70, contractYears: 1, starter: true },
    { id: "p8", number: 10, name: "Lucas Ferreira", position: "MEI", group: "MEI", age: 24, ovr: 82, pot: 87, fitness: 94, form: "up", morale: 88, contractYears: 4, starter: true },
    { id: "p9", number: 7, name: "André Santos", position: "PTD", group: "ATA", age: 25, ovr: 81, pot: 85, fitness: 89, form: "steady", morale: 83, contractYears: 3, starter: true },
    { id: "p10", number: 9, name: "Thiago Nunes", position: "ATA", group: "ATA", age: 20, ovr: 77, pot: 88, fitness: 91, form: "up", morale: 86, contractYears: 4, starter: true },
    { id: "p11", number: 11, name: "Igor Barbosa", position: "PTE", group: "ATA", age: 23, ovr: 76, pot: 82, fitness: 83, form: "steady", morale: 74, contractYears: 2, starter: true },
    { id: "p12", number: 12, name: "Caio Ribeiro", position: "GOL", group: "GOL", age: 19, ovr: 68, pot: 79, fitness: 100, form: "steady", morale: 72, contractYears: 3, starter: false },
    { id: "p13", number: 14, name: "Felipe Souza", position: "ZAG", group: "DEF", age: 30, ovr: 74, pot: 74, fitness: 80, form: "down", morale: 60, contractYears: 1, starter: false },
    { id: "p14", number: 18, name: "Vitor Gomes", position: "MEI", group: "MEI", age: 21, ovr: 71, pot: 83, fitness: 87, form: "up", morale: 79, contractYears: 3, starter: false },
    { id: "p15", number: 20, name: "Marcelo Dias", position: "ATA", group: "ATA", age: 27, ovr: 75, pot: 76, fitness: 77, form: "steady", morale: 68, contractYears: 2, starter: false },
  ],
};
