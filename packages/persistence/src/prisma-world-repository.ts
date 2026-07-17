import type { GameWorldSnapshot, WorldRepository, WorldStatus } from "@grinta/core";
import { parseRulesetVersion, type GameWorldId } from "@grinta/shared";

import type { Prisma } from "./generated/prisma/client.js";

/**
 * Adapter do mundo (R-173/R-182).
 *
 * Este é o agregado que destrava C1: quase todo root de identidade pendura em
 * `GameWorld` por FK, e o Postgres impõe o que o JSON nunca impôs. Enquanto o
 * mundo só existia no blob, `identity:join-world` falhava com
 * `WorldParticipant_gameWorldId_fkey` — os testes não pegavam porque a fixture
 * criava o mundo à mão.
 *
 * `GameWorld` já era agregado próprio no domínio, com porta por id: aqui não há
 * reescrita, só o adapter. Quem é mega-agregado em C2 é o `WorldScheduler`, e
 * ele continua no JSON.
 *
 * `name` e `description` SÃO escritos: são identidade do mundo, não
 * configuração. O comentário anterior os agrupava com `maxClubs` e dizia que
 * R-182 os manda para `GameRuleConfig` — extrapolação. R-182 lista
 * `maxClubs`, `seasonDays` e `initialClubCashMinor`, que são dimensionamento, e
 * `GameRuleConfig` é "atalho chave-valor para parâmetros simples de
 * BALANCEAMENTO". Nome de exibição não balanceia nada.
 *
 * `maxClubs`, `seasonDays`, `initialClubCashMinor` e `currencyId` seguem sem
 * escritor: esses o domínio realmente não tem, e por R-182 são configuração.
 * Ficam nulos até a config existir — dívida declarada, não descuido.
 */
export class PrismaWorldRepository implements WorldRepository {
  public constructor(private readonly client: Prisma.TransactionClient) {}

  public async findById(id: GameWorldId): Promise<GameWorldSnapshot | null> {
    return toSnapshot(await this.client.gameWorld.findUnique({ where: { id } }));
  }

  public async save(
    snapshot: GameWorldSnapshot,
    expectedVersion: number | null,
  ): Promise<void> {
    const data = {
      status: snapshot.status,
      seed: snapshot.seed,
      name: snapshot.name,
      description: snapshot.description,
      bannerKey: snapshot.bannerKey,
      squarePhotoKey: snapshot.squarePhotoKey,
      rulesetVersion: snapshot.rulesetVersion,
      startDate: fromWorldDate(snapshot.startDate),
      currentDate: fromWorldDate(snapshot.currentDate),
      version: snapshot.version,
    };

    if (expectedVersion === null) {
      // `worldSequence` NÃO entra aqui: quem o move é o append de eventos, que
      // incrementa a linha sob lock (R-176). Se o save do mundo o escrevesse,
      // sobrescreveria a sequência com um valor velho e a ordem total do mundo
      // andaria para trás.
      await this.client.gameWorld.create({ data: { id: snapshot.id, ...data } });
      return;
    }

    const { count } = await this.client.gameWorld.updateMany({
      where: { id: snapshot.id, version: expectedVersion },
      data,
    });
    if (count === 0) {
      throw new WorldVersionConflict(snapshot.id, expectedVersion);
    }
  }

  /**
   * Apaga o mundo. As 14 FKs que apontam para `GameWorld` são `ON DELETE
   * CASCADE` (migration `mundo_cascata`), então clubes, participações, jogadores
   * e o resto morrem com ele — sem lista de tabelas para alguém esquecer de
   * atualizar quando um contexto voltar.
   *
   * `DomainEventLog` e `IdempotencyKey` são a exceção, e por isso este método
   * não é um `delete` de uma linha: os dois guardam `gameWorldId` SEM FK
   * declarada (campo solto no schema, sem `@relation`), então o CASCADE não os
   * alcança. Sem apagá-los aqui, o mundo sumiria e a cadeia de eventos dele
   * ficaria órfã no banco para sempre.
   *
   * Numa transação: mundo sem eventos e eventos sem mundo são estados que
   * ninguém deve conseguir observar.
   */
  public async delete(id: GameWorldId): Promise<void> {
    await this.client.domainEventLog.deleteMany({ where: { gameWorldId: id } });
    await this.client.idempotencyKey.deleteMany({ where: { gameWorldId: id } });
    await this.client.gameWorld.delete({ where: { id } });
  }
}

export class WorldVersionConflict extends Error {
  public readonly code = "WORLD_VERSION_CONFLICT";
  public constructor(id: string, expectedVersion: number) {
    super(`Mundo ${id} mudou: versão esperada ${expectedVersion} não confere.`);
  }
}

interface GameWorldRow {
  readonly id: string;
  readonly seed: string;
  readonly name: string | null;
  readonly description: string | null;
  readonly bannerKey: string | null;
  readonly squarePhotoKey: string | null;
  readonly rulesetVersion: string;
  readonly startDate: Date;
  readonly currentDate: Date;
  readonly status: string;
  readonly worldSequence: bigint;
  readonly version: number;
}

function toSnapshot(row: GameWorldRow | null): GameWorldSnapshot | null {
  if (row === null) return null;
  const ruleset = parseRulesetVersion(row.rulesetVersion);
  if (!ruleset.ok) {
    // Uma linha com ruleset ilegível é corrupção, não "valor inesperado":
    // devolvê-la deixaria o domínio decidir regra por uma versão inventada.
    throw new Error(`Mundo ${row.id} tem rulesetVersion inválido: ${row.rulesetVersion}`);
  }
  return {
    id: row.id as GameWorldId,
    seed: row.seed,
    name: row.name,
    description: row.description,
    bannerKey: row.bannerKey,
    squarePhotoKey: row.squarePhotoKey,
    startDate: toWorldDate(row.startDate),
    currentDate: toWorldDate(row.currentDate),
    rulesetVersion: ruleset.value,
    status: row.status as WorldStatus,
    // O contador é BigInt na coluna (mundo longevo) e number no domínio. O
    // teto seguro do double é 2^53: uma partida gera ~centenas de eventos, e
    // uma temporada milhares — não chega perto. Fica registrado porque a
    // conversão é uma escolha, não um acidente.
    worldSequence: Number(row.worldSequence),
    version: row.version,
  };
}

/** `YYYY-MM-DD` → meia-noite UTC, que é o que a coluna DATE guarda. */
function fromWorldDate(worldDate: string): Date {
  return new Date(`${worldDate}T00:00:00.000Z`);
}

/** Volta só a data: o domínio não conhece hora (R-177). */
function toWorldDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
