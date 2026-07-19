import {
  GOALKEEPING_ATTRIBUTES,
  MENTAL_ATTRIBUTES,
  PHYSICAL_ATTRIBUTES,
  TECHNICAL_ATTRIBUTES,
  derivePlayerOverall,
  type PlayerAggregateSnapshot,
  type PlayerAttributes,
  type PlayerCareerStatus,
  type PlayerId,
  type PlayerRepository,
} from "@grinta/core";
import type { GameWorldId } from "@grinta/shared";

import type { Prisma } from "./generated/prisma/client.js";

const LINE_ATTRIBUTES = [
  ...TECHNICAL_ATTRIBUTES,
  ...PHYSICAL_ATTRIBUTES,
  ...MENTAL_ATTRIBUTES,
] as const;

/**
 * Adapter do jogador (R-175). Um agregado, um jogador.
 *
 * O jogador ocupa 3 tabelas — `Person`, `Player`, `PlayerAttributes` — e por
 * isso `Prisma.TransactionClient` no construtor: ele NÃO tem `$transaction`, e
 * o tipo impede este adapter de abrir a sua. Meio jogador gravado é um jogador
 * sem atributos, que o `Player.fromSnapshot` recusaria. Quem chama `savePlayer`
 * tem que já estar dentro de uma transação.
 *
 * **`currentAbility` é gravado, e não é uma segunda verdade.** O GDD diz que o
 * overall é derivado (`:120`), e é: quem calcula é sempre
 * `derivePlayerOverall`, aqui inclusive — a coluna nunca é lida de volta para
 * virar nota. Ela existe para o SQL poder ordenar e filtrar por força sem
 * reidratar 368 agregados (mercado, IA, o ranking do admin). É projeção, não
 * fonte; se divergir dos atributos, os atributos ganham.
 *
 * NÃO escritos por C4, cada um por um motivo:
 *
 * - `clubId` — **morreu** (R-189). Quem liga jogador a clube é o elenco.
 * - `currencyId`/`marketValueMinor`/`wageExpectationMinor` — dinheiro, e dinheiro
 *   é C9. O GDD §1 proíbe gerar valor "de forma isolada", fora da economia
 *   fechada. Ficam no default até C9 existir.
 * - `injuryProneness`/`ambition`/`loyalty`/`professionalism` — traços, e eles
 *   divergem em três lugares ao mesmo tempo (este bloco, `PlayerPersonality` e a
 *   lista canônica do GDD). R-188 registrou a pendência e não a resolveu.
 * - `heightCm`/`weightKg` — não existem no domínio.
 *
 * Dívida declarada, não descuido.
 */
export class PrismaPlayerRepository implements PlayerRepository {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async findPlayerById(
    gameWorldId: GameWorldId,
    playerId: PlayerId,
  ): Promise<PlayerAggregateSnapshot | null> {
    const row = await this.client.player.findUnique({
      where: { gameWorldId_id: { gameWorldId, id: playerId } },
      include: { attributes: true, person: true },
    });
    if (row === null || row.attributes === null) return null;

    return {
      player: {
        id: row.id as PlayerId,
        gameWorldId,
        personId: row.personId as PlayerAggregateSnapshot["player"]["personId"],
        primaryPosition: row.primaryPosition,
        ...(row.secondaryPosition === null
          ? {}
          : { secondaryPosition: row.secondaryPosition }),
        // Sem `as` nos enums: o enum gerado pelo Prisma É a mesma união de
        // strings do domínio, e o compilador confere isso a cada build. Se um dia
        // divergirem, o build quebra aqui — que é onde tem de quebrar.
        dominantFoot: row.dominantFoot,
        careerStatus: row.status as PlayerCareerStatus,
        availability: row.availability,
        generationSource: row.generationSource,
        generatedAtSeasonNumber: row.generatedAtSeasonNumber ?? 1,
        attributes: readAttributes(row.attributes),
        currentAbility: row.currentAbility,
        baselineAbility: row.baselineAbility,
        potentialAbility: row.potentialAbility,
        dynamicState: {
          morale: row.morale,
          confidence: row.confidence,
          happiness: row.happiness,
          fatigue: row.fatigue,
          matchSharpness: row.matchSharpness,
        },
        lastProcessedOn: isoDate(row.lastProcessedOn),
        version: row.version,
      },
      person: {
        id: row.person.id as PlayerAggregateSnapshot["person"]["id"],
        gameWorldId,
        firstName: row.person.firstName,
        lastName: row.person.lastName,
        birthDate: isoDate(row.person.birthDate),
        nationality: row.person.nationality,
        version: row.person.version,
      },
    };
  }

  public async savePlayer(
    snapshot: PlayerAggregateSnapshot,
    expectedVersion: number | null,
  ): Promise<void> {
    const { player, person } = snapshot;

    if (expectedVersion === null) {
      await this.client.person.create({
        data: {
          id: person.id,
          gameWorldId: person.gameWorldId,
          firstName: person.firstName,
          lastName: person.lastName,
          nationality: person.nationality,
          birthDate: new Date(`${person.birthDate}T00:00:00.000Z`),
          ageVirtual: ageOn(person.birthDate, player.lastProcessedOn),
          version: person.version,
        },
      });
      await this.client.player.create({
        data: {
          id: player.id,
          gameWorldId: player.gameWorldId,
          personId: player.personId,
          primaryPosition: player.primaryPosition,
          secondaryPosition: player.secondaryPosition ?? null,
          dominantFoot: player.dominantFoot,
          status: player.careerStatus,
          availability: player.availability,
          generationSource: player.generationSource,
          generatedAtSeasonNumber: player.generatedAtSeasonNumber,
          currentAbility: derivePlayerOverall(
            player.primaryPosition,
            player.attributes,
          ),
          baselineAbility: player.baselineAbility,
          potentialAbility: player.potentialAbility,
          morale: player.dynamicState.morale,
          confidence: player.dynamicState.confidence,
          happiness: player.dynamicState.happiness,
          fatigue: player.dynamicState.fatigue,
          matchSharpness: player.dynamicState.matchSharpness,
          lastProcessedOn: new Date(`${player.lastProcessedOn}T00:00:00.000Z`),
          version: player.version,
          attributes: { create: writeAttributes(player.attributes) },
        },
      });
      return;
    }

    // Concorrência otimista por agregado (R-175): o `updateMany` com a versão
    // esperada no WHERE é o que torna a checagem atômica. Ler-e-decidir teria a
    // janela que ela finge fechar.
    const updated = await this.client.player.updateMany({
      where: {
        gameWorldId: player.gameWorldId,
        id: player.id,
        version: expectedVersion,
      },
      data: {
        primaryPosition: player.primaryPosition,
        secondaryPosition: player.secondaryPosition ?? null,
        status: player.careerStatus,
        availability: player.availability,
        currentAbility: derivePlayerOverall(
          player.primaryPosition,
          player.attributes,
        ),
        potentialAbility: player.potentialAbility,
        // R-216: a virada reescreve a base; sem isto ela nunca persistia e a
        // margem da próxima temporada partiria do valor antigo. A prova por HTTP
        // pegou o que typecheck/build não pegam — base 33 contra habilidade 34.
        baselineAbility: player.baselineAbility,
        morale: player.dynamicState.morale,
        confidence: player.dynamicState.confidence,
        happiness: player.dynamicState.happiness,
        fatigue: player.dynamicState.fatigue,
        matchSharpness: player.dynamicState.matchSharpness,
        lastProcessedOn: new Date(`${player.lastProcessedOn}T00:00:00.000Z`),
        version: player.version,
      },
    });
    if (updated.count === 0) {
      throw new Error(
        `AGGREGATE_VERSION_CONFLICT: jogador ${player.id} mudou por baixo (esperava ${expectedVersion}).`,
      );
    }
    await this.client.playerAttributes.update({
      where: { playerId: player.id },
      data: writeAttributes(player.attributes),
    });
  }
}

// ─── auxiliares ──────────────────────────────────────────────────────────────

function readAttributes(row: Record<string, unknown>): PlayerAttributes {
  const grid: Record<string, number | null> = {};
  for (const code of LINE_ATTRIBUTES) grid[code] = row[code] as number;
  for (const code of GOALKEEPING_ATTRIBUTES) {
    grid[code] = (row[code] as number | null) ?? null;
  }
  return grid as PlayerAttributes;
}

/**
 * O grid do domínio VIRA o grid do banco por spread, e isso é de propósito.
 *
 * Montar o objeto num laço exigiria um `as` no fim — afirmar que os dois grids
 * batem. Assim o compilador PROVA: sobrou atributo, faltou atributo ou trocou o
 * tipo, e o build quebra. É a trava que impede o schema e o GDD §2 de divergirem
 * de novo (R-188), que foi exatamente o que aconteceu antes.
 */
function writeAttributes(
  attributes: PlayerAttributes,
): Prisma.PlayerAttributesCreateWithoutPlayerInput {
  return { ...attributes };
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/**
 * `Person.ageVirtual` é coluna, e o domínio não a tem — a idade é derivada da
 * data de nascimento contra a data do mundo. Gravamos por ser NOT NULL; quem
 * pergunta a idade deriva.
 */
function ageOn(birthDate: string, on: string): number {
  const [by, bm, bd] = birthDate.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const [ny, nm, nd] = on.split("-").map(Number) as [number, number, number];
  const passou = nm > bm || (nm === bm && nd >= bd);
  return ny - by - (passou ? 0 : 1);
}
