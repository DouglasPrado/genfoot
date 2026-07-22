import {
  InjuryCause,
  InjurySeverity,
  InjuryType,
  MedicalEpisodeState,
  TreatmentOption,
  advanceRehabStage,
  diagnoseInjury,
  dischargePlayer,
  generateSquadAttributes,
  openInjuryEpisode,
  orderMedicalExam,
  setMedicalPlan,
  type InjuryEpisodeSnapshot,
} from "@grinta/core";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PrismaInjuryEpisodeRepository } from "../src/prisma-injury-episode-repository.js";
import { CLUB_ID, WORLD_ID, WORLD_SEED, seedClub, seedWorld } from "./fixtures.js";
import { playerAggregate } from "./player-fixture.js";
import { connect, hasDatabase, skipReason, truncate } from "./postgres.harness.js";

import { PrismaPlayerRepository } from "../src/prisma-player-repository.js";

const PLAYER_ID = "019b76da-a800-7ddd-9462-49c009be0777";
const OTHER_PLAYER_ID = "019b76da-a800-7ddd-9462-49c009be0778";

const MEDICAL_TABLES = [
  "GameWorld",
  "Club",
  "Person",
  "Player",
  "PlayerAttributes",
  "PlayerInjury",
];

/** Um episódio aberto de verdade, saído da própria máquina do domínio. */
function opened(playerId = PLAYER_ID): InjuryEpisodeSnapshot {
  const result = openInjuryEpisode({
    gameWorldId: WORLD_ID,
    clubId: CLUB_ID,
    playerId,
    worldSeed: WORLD_SEED,
    occurredOn: "2026-07-22",
    injuryType: InjuryType.MUSCULAR,
    cause: InjuryCause.TRAINING,
    region: "coxa-direita",
  });
  if (!result.ok) throw new Error("abertura devia ter sucedido");
  return result.value.episode;
}

/** Leva o episódio até a reabilitação, pelo caminho oficial. */
function inRehab(episode: InjuryEpisodeSnapshot): InjuryEpisodeSnapshot {
  const exams = orderMedicalExam(episode, { occurredOn: "2026-07-22" });
  if (!exams.ok) throw new Error("MED-2");
  const diagnosis = diagnoseInjury(exams.value.episode, {
    occurredOn: "2026-07-24",
    severity: InjurySeverity.MODERATE,
    returnRiskScore: 40,
  });
  if (!diagnosis.ok) throw new Error("MED-3");
  const plan = setMedicalPlan(diagnosis.value.episode, {
    occurredOn: "2026-07-24",
    option: TreatmentOption.INTENSIVE,
  });
  if (!plan.ok) throw new Error("MED-4");
  return plan.value.episode;
}

describe.skipIf(!hasDatabase)(
  `PrismaInjuryEpisodeRepository ${hasDatabase ? "" : `— PULADO: ${skipReason}`}`,
  () => {
    let client: ReturnType<typeof connect>;
    let repository: PrismaInjuryEpisodeRepository;

    beforeAll(() => {
      client = connect();
      repository = new PrismaInjuryEpisodeRepository(client);
    });

    beforeEach(async () => {
      await truncate(client, MEDICAL_TABLES);
      await seedWorld(client);
      await seedClub(client);
      const players = new PrismaPlayerRepository(client);
      const generated = generateSquadAttributes({
        worldSeed: WORLD_SEED,
        clubIndex: 0,
      });
      await players.savePlayer(playerAggregate(PLAYER_ID, generated[10]!), null);
      await players.savePlayer(
        playerAggregate(OTHER_PLAYER_ID, generated[11]!),
        null,
      );
    });

    afterAll(async () => {
      await client.$disconnect();
    });

    it("o episódio recém-aberto volta do banco idêntico", async () => {
      const episode = opened();
      await repository.save(episode, null);

      const loaded = await repository.findOpenByPlayer(WORLD_ID, PLAYER_ID);

      expect(loaded).toEqual(episode);
    });

    it("diagnóstico e tratamento atravessam a ida-e-volta sem perder campo", async () => {
      const episode = inRehab(opened());
      await repository.save(opened(), null);
      await repository.save(episode, 1);

      const loaded = await repository.findById(WORLD_ID, episode.id);

      expect(loaded).toEqual(episode);
      expect(loaded?.diagnosis?.severity).toBe(InjurySeverity.MODERATE);
      expect(loaded?.treatment?.option).toBe(TreatmentOption.INTENSIVE);
      expect(loaded?.rehabStage).toBe(1);
    });

    it("o episódio com alta some da lista de abertos", async () => {
      let episode = inRehab(opened());
      await repository.save(opened(), null);
      let version = 1;
      await repository.save(episode, version);
      version = episode.version;

      // Sobe os 7 estágios e recebe alta, gravando cada transição.
      for (let step = 0; step < 7; step += 1) {
        const advanced = advanceRehabStage(episode, {
          occurredOn: "2026-08-01",
        });
        if (!advanced.ok) throw new Error("MED-5/7");
        episode = advanced.value.episode;
        await repository.save(episode, version);
        version = episode.version;
      }
      const discharged = dischargePlayer(episode, { occurredOn: "2026-08-20" });
      if (!discharged.ok) throw new Error("MED-8");
      await repository.save(discharged.value.episode, version);

      expect(await repository.findOpenByPlayer(WORLD_ID, PLAYER_ID)).toBeNull();
      const persisted = await repository.findById(WORLD_ID, episode.id);
      expect(persisted?.state).toBe(MedicalEpisodeState.DISCHARGE);
      expect(persisted?.dischargedOn).toBe("2026-08-20");
    });

    it("lista os casos abertos do clube, e só os do clube", async () => {
      await repository.save(opened(), null);
      await repository.save(opened(OTHER_PLAYER_ID), null);

      const cases = await repository.listOpenByClub(WORLD_ID, CLUB_ID);
      const otherClub = await repository.listOpenByClub(
        WORLD_ID,
        "019b76da-a800-7787-9462-49c009be9999",
      );

      expect(cases).toHaveLength(2);
      expect(otherClub).toHaveLength(0);
    });

    it("recusa gravação com versão desatualizada — concorrência otimista no banco", async () => {
      const episode = opened();
      await repository.save(episode, null);
      const exams = orderMedicalExam(episode, { occurredOn: "2026-07-22" });
      if (!exams.ok) throw new Error("MED-2");
      await repository.save(exams.value.episode, 1);

      // Segunda transição partindo da MESMA versão 1: já não existe.
      await expect(repository.save(exams.value.episode, 1)).rejects.toThrow(
        /AGGREGATE_VERSION_CONFLICT/,
      );
    });

    it("a data da lesão é data do mundo, não instante local", async () => {
      await repository.save(opened(), null);

      const loaded = await repository.findOpenByPlayer(WORLD_ID, PLAYER_ID);

      expect(loaded?.occurredOn).toBe("2026-07-22");
    });
  },
);
