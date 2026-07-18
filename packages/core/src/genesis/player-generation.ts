import {
  GOALKEEPING_ATTRIBUTES,
  MENTAL_ATTRIBUTES,
  PHYSICAL_ATTRIBUTES,
  TECHNICAL_ATTRIBUTES,
  derivePlayerOverall,
  type PlayerAttributeCode,
  type PlayerAttributes,
} from "../players/player-attributes.js";
import { SeededRandom } from "../foundation/seeded-random.js";

import { PlayerPosition } from "./genesis-types.js";

/**
 * A geração do elenco inicial — GDD §1 (`01-mundo-persistente-e-clubes.md:158`).
 *
 * > todos os clubes partem de **1.380 pontos de overall para 23 jogadores**
 * > (média-alvo 60; média nunca superior a 62), variando apenas como esses
 * > pontos se dividem entre defesa, meio, ataque e goleiros.
 *
 * Duas regras, e elas puxam em sentidos opostos: o teto é **comum** (nenhum
 * clube começa mais forte) e o perfil é **próprio** (nenhum clube começa igual).
 * Escolher clube só é escolha se as duas valerem.
 *
 * O que isto substitui: o gerador antigo resolvia `mental` por equação para a
 * nota cair em 60 — com 4 escalares. Não dá para fazer isso com 39, e não
 * precisa (ver `shiftToTarget`).
 */

/** O elenco do GDD: 23 jogadores. */
export const SQUAD_POSITION_TEMPLATE: readonly PlayerPosition[] = [
  PlayerPosition.GK,
  PlayerPosition.GK,
  PlayerPosition.CB,
  PlayerPosition.CB,
  PlayerPosition.CB,
  PlayerPosition.CB,
  PlayerPosition.LB,
  PlayerPosition.LB,
  PlayerPosition.RB,
  PlayerPosition.RB,
  PlayerPosition.CDM,
  PlayerPosition.CDM,
  PlayerPosition.CM,
  PlayerPosition.CM,
  PlayerPosition.CM,
  PlayerPosition.CAM,
  PlayerPosition.CAM,
  PlayerPosition.LW,
  PlayerPosition.RW,
  PlayerPosition.ST,
  PlayerPosition.ST,
  PlayerPosition.ST,
  PlayerPosition.CF,
];

/** "1.380 pontos de overall para 23 jogadores" — GDD §1. */
export const SQUAD_OVERALL_BUDGET = 1380;

/**
 * O PREENCHIMENTO inicial do elenco — R-57: "elenco inicial com **23
 * jogadores**". É quantos a gênese materializa por clube, o teto comum de
 * largada (GDD §1). NÃO é o máximo: uma compra pode levar o elenco além disto.
 *
 * É constante, não coluna (R-190): gravar por elenco permitiria dois clubes com
 * largadas diferentes, o oposto do "teto comum" do GDD §1.
 */
export const SQUAD_SIZE = 23;

/**
 * O TETO de registro do elenco — R-193. O elenco nasce com 23 (R-57) mas pode
 * receber reforços até este limite; sem esta folga, todo clube nasceria cheio e
 * o mercado (R-192) nasceria travado — nenhuma contratação caberia.
 *
 * Também constante (não coluna), pela mesma justiça de largada da R-190: o teto
 * é comum a todos os clubes.
 */
export const MAX_SQUAD_SIZE = 30;

/** Os setores entre os quais o GDD manda o teto variar. */
const Sector = {
  GOALKEEPER: "GOALKEEPER",
  DEFENCE: "DEFENCE",
  MIDFIELD: "MIDFIELD",
  ATTACK: "ATTACK",
} as const;

type Sector = (typeof Sector)[keyof typeof Sector];

function sectorOf(position: PlayerPosition): Sector {
  switch (position) {
    case PlayerPosition.GK:
      return Sector.GOALKEEPER;
    case PlayerPosition.CB:
    case PlayerPosition.LB:
    case PlayerPosition.RB:
    case PlayerPosition.LWB:
    case PlayerPosition.RWB:
      return Sector.DEFENCE;
    case PlayerPosition.CDM:
    case PlayerPosition.CM:
    case PlayerPosition.CAM:
    case PlayerPosition.LM:
    case PlayerPosition.RM:
      return Sector.MIDFIELD;
    default:
      return Sector.ATTACK;
  }
}

/**
 * Os atributos que definem cada função — **calibração**, não canon.
 *
 * O GDD define a LISTA (§2) e a R-09 define os PESOS da nota, mas nenhum dos
 * dois diz quais atributos um zagueiro deve ter altos. Sem isso o grid de 39
 * seria ruído: um zagueiro finalizaria tão bem quanto o centroavante, e a R-179
 * queria exatamente o contrário ("scouting vira ruído... tática não tem sobre o
 * que operar").
 *
 * `core` sobe, `weak` desce, o resto fica na base. Valores para ajustar.
 */
const CORE: Readonly<Record<PlayerPosition, readonly PlayerAttributeCode[]>> = {
  [PlayerPosition.GK]: [...GOALKEEPING_ATTRIBUTES, "concentration", "bravery"],
  [PlayerPosition.CB]: ["marking", "tackling", "heading", "strength", "jumping", "positioning", "bravery"],
  [PlayerPosition.LB]: ["marking", "tackling", "crossing", "stamina", "pace", "recovery"],
  [PlayerPosition.RB]: ["marking", "tackling", "crossing", "stamina", "pace", "recovery"],
  [PlayerPosition.LWB]: ["crossing", "stamina", "pace", "acceleration", "recovery"],
  [PlayerPosition.RWB]: ["crossing", "stamina", "pace", "acceleration", "recovery"],
  [PlayerPosition.CDM]: ["tackling", "marking", "positioning", "shortPassing", "stamina", "strength"],
  [PlayerPosition.CM]: ["shortPassing", "longPassing", "vision", "stamina", "decisions", "firstTouch"],
  [PlayerPosition.CAM]: ["vision", "shortPassing", "dribbling", "firstTouch", "setPieces", "decisions"],
  [PlayerPosition.LM]: ["crossing", "stamina", "dribbling", "shortPassing"],
  [PlayerPosition.RM]: ["crossing", "stamina", "dribbling", "shortPassing"],
  [PlayerPosition.LW]: ["dribbling", "pace", "acceleration", "crossing", "agility"],
  [PlayerPosition.RW]: ["dribbling", "pace", "acceleration", "crossing", "agility"],
  [PlayerPosition.ST]: ["finishing", "longShots", "heading", "composure", "acceleration", "explosiveness"],
  [PlayerPosition.CF]: ["finishing", "firstTouch", "vision", "shortPassing", "composure"],
};

const WEAK: Readonly<Record<PlayerPosition, readonly PlayerAttributeCode[]>> = {
  [PlayerPosition.GK]: [],
  [PlayerPosition.CB]: ["finishing", "dribbling", "crossing", "longShots"],
  [PlayerPosition.LB]: ["finishing", "heading", "longShots"],
  [PlayerPosition.RB]: ["finishing", "heading", "longShots"],
  [PlayerPosition.LWB]: ["finishing", "heading", "longShots"],
  [PlayerPosition.RWB]: ["finishing", "heading", "longShots"],
  [PlayerPosition.CDM]: ["finishing", "crossing"],
  [PlayerPosition.CM]: ["marking", "heading"],
  [PlayerPosition.CAM]: ["marking", "tackling", "heading"],
  [PlayerPosition.LM]: ["marking", "heading"],
  [PlayerPosition.RM]: ["marking", "heading"],
  [PlayerPosition.LW]: ["marking", "tackling", "heading", "strength"],
  [PlayerPosition.RW]: ["marking", "tackling", "heading", "strength"],
  [PlayerPosition.ST]: ["marking", "tackling"],
  [PlayerPosition.CF]: ["marking", "tackling"],
};

/** O grid do goleiro é só do goleiro; nos outros, os técnicos de linha caem. */
const GK_OUTFIELD_MALUS = 12;
const CORE_BONUS = 10;
const WEAK_MALUS = 12;

export interface GeneratedSquadPlayer {
  readonly position: PlayerPosition;
  readonly attributes: PlayerAttributes;
  /** Idade em anos na data de início do mundo (R-57: 26–33). */
  readonly age: number;
  readonly potentialAbility: number;
}

/**
 * A curva etária da R-57: "predomínio 26–33 anos (**≈70% em 29–33 e ≈30% em
 * 26–28**)".
 *
 * Não é o mesmo que sortear uniforme em 26–33 — isso daria ~62/38. A diferença
 * é de projeto: "o elenco inicial típico é veterano" (§1) é o que força o valor
 * a vir da gestão, e não da largada.
 */
function ageFor(random: SeededRandom): number {
  return random.nextInt(0, 100) < 70
    ? random.nextInt(29, 34) // 70% veteranos
    : random.nextInt(26, 29); // 30% em maturação
}

/**
 * "potencial limitado" (R-57).
 *
 * O potencial nunca fica abaixo da nota atual — seria um jogador que já passou
 * do próprio teto, e o agregado usa `potential` como trava de evolução. E a
 * folga encolhe com a idade: aos 33 não há para onde crescer.
 */
function potentialFor(overall: number, age: number, random: SeededRandom): number {
  const folga = Math.max(0, 34 - age); // 8 aos 26; 1 aos 33
  return Math.min(85, overall + random.nextInt(0, folga + 1));
}

export interface GenerateSquadInput {
  readonly worldSeed: string;
  readonly clubIndex: number;
}

/**
 * Distribui os 1.380 pontos pelos 23 lugares — mesmo total, perfil por clube.
 *
 * A perturbação é de **soma zero por construção**: cada rodada tira `k` de um
 * setor e dá `k` a outro. É o que faz o teto ser comum e o perfil ser próprio,
 * sem depender de a aritmética "quase" fechar.
 */
function sectorTargets(input: GenerateSquadInput): Map<Sector, number> {
  const counts = new Map<Sector, number>();
  for (const position of SQUAD_POSITION_TEMPLATE) {
    const sector = sectorOf(position);
    counts.set(sector, (counts.get(sector) ?? 0) + 1);
  }

  const base = SQUAD_OVERALL_BUDGET / SQUAD_POSITION_TEMPLATE.length; // 60
  const targets = new Map<Sector, number>();
  for (const [sector, count] of counts) targets.set(sector, base * count);

  const random = new SeededRandom({
    worldSeed: input.worldSeed,
    context: `squad-profile:${input.clubIndex}`,
  });
  const sectors = [...counts.keys()];
  for (let round = 0; round < 6; round += 1) {
    const from = sectors[random.nextInt(0, sectors.length)]!;
    const to = sectors[random.nextInt(0, sectors.length)]!;
    if (from === to) continue;
    const points = random.nextInt(2, 9);
    targets.set(from, targets.get(from)! - points);
    targets.set(to, targets.get(to)! + points);
  }
  return targets;
}

/**
 * Gera o grid de um jogador em torno do arquétipo da posição, sem alvo.
 * `shiftToTarget` ajusta a nota depois.
 */
function archetypeGrid(
  position: PlayerPosition,
  random: SeededRandom,
): Record<PlayerAttributeCode, number | null> {
  const core = new Set<string>(CORE[position]);
  const weak = new Set<string>(WEAK[position]);
  const isGoalkeeper = position === PlayerPosition.GK;

  const grid: Record<string, number | null> = {};
  for (const code of [
    ...TECHNICAL_ATTRIBUTES,
    ...PHYSICAL_ATTRIBUTES,
    ...MENTAL_ATTRIBUTES,
  ]) {
    let value = random.nextInt(50, 66);
    if (core.has(code)) value += CORE_BONUS;
    if (weak.has(code)) value -= WEAK_MALUS;
    // O goleiro não é um jogador de linha ruim — ele joga outro jogo. Os
    // técnicos de linha caem, e o grid dele (que é o que a R-09 pesa) sobe.
    if (isGoalkeeper && (TECHNICAL_ATTRIBUTES as readonly string[]).includes(code)) {
      value -= GK_OUTFIELD_MALUS;
    }
    grid[code] = value;
  }
  for (const code of GOALKEEPING_ATTRIBUTES) {
    grid[code] = isGoalkeeper
      ? random.nextInt(50, 66) + (core.has(code) ? CORE_BONUS : 0)
      : null;
  }
  return grid;
}

/**
 * Move a nota do jogador até o alvo somando a MESMA constante a todo atributo.
 *
 * Isto funciona por uma propriedade, não por sorte: os pesos da R-09 **somam 1**
 * e os rollups são médias, então somar δ a cada atributo soma exatamente δ à
 * nota. É o que dispensa a equação que o gerador antigo resolvia — e ela não
 * teria solução com 39 incógnitas.
 *
 * O arquétipo sobrevive ao deslocamento: somar a mesma constante a todos
 * preserva as diferenças entre eles. O zagueiro segue marcando melhor do que
 * finaliza.
 */
function shiftToTarget(
  position: PlayerPosition,
  grid: Record<PlayerAttributeCode, number | null>,
  target: number,
): PlayerAttributes {
  const current = derivePlayerOverall(position, grid as PlayerAttributes);
  const delta = target - current;
  const shifted: Record<string, number | null> = {};
  for (const [code, value] of Object.entries(grid)) {
    shifted[code] =
      value === null ? null : Math.max(1, Math.min(99, value + delta));
  }
  return shifted as PlayerAttributes;
}

/**
 * O elenco inicial de um clube: 23 jogadores, 1.380 pontos, perfil próprio.
 *
 * Determinístico por `(worldSeed, clubIndex)` — R-182. Sem `Math.random`.
 */
export function generateSquadAttributes(
  input: GenerateSquadInput,
): readonly GeneratedSquadPlayer[] {
  const targets = perSlotTargets(input);
  return SQUAD_POSITION_TEMPLATE.map((position, slot) => {
    const random = new SeededRandom({
      worldSeed: input.worldSeed,
      context: `player:${input.clubIndex}:${slot}`,
    });
    const attributes = shiftToTarget(
      position,
      archetypeGrid(position, random),
      targets[slot]!,
    );
    const age = ageFor(random);
    return {
      position,
      attributes,
      age,
      potentialAbility: potentialFor(
        derivePlayerOverall(position, attributes),
        age,
        random,
      ),
    };
  });
}

/**
 * O alvo de nota de cada um dos 23 lugares.
 *
 * Duas camadas de variação, e as duas são de soma zero:
 *
 * 1. **Entre setores** (`sectorTargets`) — o que o GDD pede explicitamente.
 * 2. **Dentro do setor** — o que ele não pede e o jogo exige: 8 defensores de
 *    nota 60 idêntica não formam um elenco, formam uma lista. Sem titular nem
 *    reserva, escalar o time não é decisão. É por isso que a primeira versão
 *    disto estava errada apesar de os testes passarem: o teto e a média fechavam,
 *    e o elenco era chapado.
 *
 * O total segue sendo 1.380 porque toda troca tira de um lugar e dá a outro.
 */
function perSlotTargets(input: GenerateSquadInput): readonly number[] {
  const sectors = sectorTargets(input);
  const slotsBySector = new Map<Sector, number[]>();
  SQUAD_POSITION_TEMPLATE.forEach((position, slot) => {
    const sector = sectorOf(position);
    slotsBySector.set(sector, [...(slotsBySector.get(sector) ?? []), slot]);
  });

  const targets = new Array<number>(SQUAD_POSITION_TEMPLATE.length).fill(0);
  for (const [sector, slots] of slotsBySector) {
    const total = sectors.get(sector)!;
    const base = Math.round(total / slots.length);
    const local = slots.map(() => base);
    // Sobra da divisão inteira: some no primeiro, para o setor fechar no total.
    local[0]! += total - base * slots.length;

    const random = new SeededRandom({
      worldSeed: input.worldSeed,
      context: `slot-spread:${input.clubIndex}:${sector}`,
    });
    for (let round = 0; round < slots.length * 2; round += 1) {
      const from = random.nextInt(0, local.length);
      const to = random.nextInt(0, local.length);
      if (from === to) continue;
      const points = random.nextInt(1, 5);
      // Não deixa o reserva virar amador nem o titular virar craque: o elenco
      // inicial é "veterano e equilibrado" (GDD §1), não uma escada.
      if (local[from]! - points < base - 8 || local[to]! + points > base + 8) {
        continue;
      }
      local[from]! -= points;
      local[to]! += points;
    }
    slots.forEach((slot, index) => {
      targets[slot] = local[index]!;
    });
  }
  return targets;
}
