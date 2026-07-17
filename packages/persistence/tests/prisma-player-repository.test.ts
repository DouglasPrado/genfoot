import {
  GOALKEEPING_ATTRIBUTES,
  Player,
  SQUAD_POSITION_TEMPLATE,
  derivePlayerOverall,
  generateSquadAttributes,
  type PlayerAggregateSnapshot,
} from "@grinta/core";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PrismaPlayerRepository } from "../src/prisma-player-repository.js";
import { WORLD_ID, WORLD_SEED, seedWorld } from "./fixtures.js";
import { connect, hasDatabase, skipReason, truncate } from "./postgres.harness.js";

const PERSON_ID = "019b76da-a800-7ccc-9462-49c009be0001";
const PLAYER_ID = "019b76da-a800-7ddd-9462-49c009be0001";

const PLAYER_TABLES = ["GameWorld", "Person", "Player", "PlayerAttributes"];

/** Um jogador de verdade, saído do gerador — não um grid inventado à mão. */
function aggregate(slot: number): PlayerAggregateSnapshot {
  const generated = generateSquadAttributes({
    worldSeed: WORLD_SEED,
    clubIndex: 0,
  })[slot]!;
  return {
    person: {
      id: PERSON_ID as PlayerAggregateSnapshot["person"]["id"],
      gameWorldId: WORLD_ID as never,
      firstName: "Douglas",
      lastName: "Prado",
      birthDate: "1994-03-11",
      nationality: "BR",
      version: 1,
    },
    player: {
      id: PLAYER_ID as never,
      gameWorldId: WORLD_ID as never,
      personId: PERSON_ID as never,
      primaryPosition: generated.position,
      dominantFoot: "RIGHT",
      careerStatus: "ACTIVE",
      availability: "AVAILABLE",
      generationSource: "INITIAL_WORLD",
      generatedAtSeasonNumber: 1,
      attributes: generated.attributes,
      currentAbility: derivePlayerOverall(
        generated.position,
        generated.attributes,
      ),
      potentialAbility: generated.potentialAbility,
      dynamicState: {
        morale: 50,
        confidence: 50,
        happiness: 50,
        fatigue: 0,
        matchSharpness: 50,
      },
      lastProcessedOn: "2026-01-02",
      version: 1,
    },
  };
}

/** O slot 0 do template é goleiro; o 22 é centroavante. */
const GK_SLOT = SQUAD_POSITION_TEMPLATE.indexOf("GK");
const OUTFIELD_SLOT = SQUAD_POSITION_TEMPLATE.indexOf("ST");

describe.skipIf(!hasDatabase)(
  `PrismaPlayerRepository ${hasDatabase ? "" : `— PULADO: ${skipReason}`}`,
  () => {
    let client: ReturnType<typeof connect>;
    let repository: PrismaPlayerRepository;

    beforeAll(() => {
      client = connect();
      repository = new PrismaPlayerRepository(client);
    });

    beforeEach(async () => {
      await truncate(client, PLAYER_TABLES);
      await seedWorld(client);
    });

    afterAll(async () => {
      await client.$disconnect();
    });

    it("grava e reidrata os 39 atributos sem perder nenhum", async () => {
      const original = aggregate(OUTFIELD_SLOT);
      await repository.savePlayer(original, null);

      const loaded = await repository.findPlayerById(
        WORLD_ID as never,
        PLAYER_ID as never,
      );
      expect(loaded?.player.attributes).toEqual(original.player.attributes);
    });

    /**
     * A ida-e-volta tem de sobreviver ao agregado, não só ao `toEqual`: se o
     * grid voltar torto, é aqui que aparece.
     */
    it("o que volta do banco reidrata como agregado válido", async () => {
      await repository.savePlayer(aggregate(OUTFIELD_SLOT), null);
      const loaded = await repository.findPlayerById(
        WORLD_ID as never,
        PLAYER_ID as never,
      );
      const rebuilt = Player.fromSnapshot(loaded!.player);
      expect(rebuilt.ok).toBe(true);
    });

    /** `null` é "não se aplica", não zero — e o banco tem de preservar a diferença. */
    it("o grid de goleiro volta null em quem não é goleiro", async () => {
      await repository.savePlayer(aggregate(OUTFIELD_SLOT), null);
      const loaded = await repository.findPlayerById(
        WORLD_ID as never,
        PLAYER_ID as never,
      );
      for (const code of GOALKEEPING_ATTRIBUTES) {
        expect(loaded!.player.attributes[code]).toBeNull();
      }
    });

    it("o goleiro volta com o grid dele preenchido", async () => {
      await repository.savePlayer(aggregate(GK_SLOT), null);
      const loaded = await repository.findPlayerById(
        WORLD_ID as never,
        PLAYER_ID as never,
      );
      for (const code of GOALKEEPING_ATTRIBUTES) {
        expect(loaded!.player.attributes[code]).not.toBeNull();
      }
    });

    /**
     * O `overall` NÃO é lido da coluna: ele é derivado dos atributos (GDD §2,
     * `:120`). A coluna é projeção para o SQL ordenar — se ela mentir, os
     * atributos ganham.
     */
    it("o overall gravado é o derivado dos atributos", async () => {
      const original = aggregate(OUTFIELD_SLOT);
      await repository.savePlayer(original, null);
      const row = await client.player.findUnique({
        where: { gameWorldId_id: { gameWorldId: WORLD_ID, id: PLAYER_ID } },
      });
      expect(row?.currentAbility).toBe(
        derivePlayerOverall(
          original.player.primaryPosition,
          original.player.attributes,
        ),
      );
    });

    /** R-189: o dinheiro é NULO até C9 — não zero, que seria dizer que não vale nada. */
    it("o dinheiro do jogador fica nulo, não zerado", async () => {
      await repository.savePlayer(aggregate(OUTFIELD_SLOT), null);
      const row = await client.player.findUnique({
        where: { gameWorldId_id: { gameWorldId: WORLD_ID, id: PLAYER_ID } },
      });
      expect(row?.marketValueMinor).toBeNull();
      expect(row?.wageExpectationMinor).toBeNull();
      expect(row?.currencyId).toBeNull();
    });

    /** Concorrência otimista por agregado (R-175). */
    it("recusa a escrita quando a versão mudou por baixo", async () => {
      const original = aggregate(OUTFIELD_SLOT);
      await repository.savePlayer(original, null);

      const conflito = {
        ...original,
        player: { ...original.player, version: 99 },
      };
      await expect(repository.savePlayer(conflito, 42)).rejects.toThrow(
        /AGGREGATE_VERSION_CONFLICT/u,
      );
    });

    it("a evolução de um atributo sobrevive à ida e volta", async () => {
      const original = aggregate(OUTFIELD_SLOT);
      await repository.savePlayer(original, null);

      const loaded = await repository.findPlayerById(
        WORLD_ID as never,
        PLAYER_ID as never,
      );
      const player = Player.fromSnapshot(loaded!.player);
      if (!player.ok) throw player.error;

      const evolucao = player.value.applyAttributeChange({
        historyId: "019b76da-a800-7eee-9462-49c009be0001" as never,
        attributeCode: "composure",
        requestedValue: loaded!.player.attributes.composure + 3,
        cause: "treino mental",
        worldDate: "2026-01-03",
        rulesetVersion: "1.0.0" as never,
      });
      expect(evolucao.ok).toBe(true);

      await repository.savePlayer(
        { person: loaded!.person, player: player.value.snapshot() },
        loaded!.player.version,
      );

      const releitura = await repository.findPlayerById(
        WORLD_ID as never,
        PLAYER_ID as never,
      );
      expect(releitura!.player.attributes.composure).toBe(
        loaded!.player.attributes.composure + 3,
      );
    });

    /**
     * `lastProcessedOn` ganhou coluna neste commit — antes o agregado tinha o
     * estado e o físico não tinha onde guardá-lo. Sem ele o decaimento diário
     * reprocessaria desde sempre a cada carga.
     */
    it("lastProcessedOn sobrevive à ida e volta", async () => {
      await repository.savePlayer(aggregate(OUTFIELD_SLOT), null);
      const loaded = await repository.findPlayerById(
        WORLD_ID as never,
        PLAYER_ID as never,
      );
      expect(loaded?.player.lastProcessedOn).toBe("2026-01-02");
    });
  },
);
