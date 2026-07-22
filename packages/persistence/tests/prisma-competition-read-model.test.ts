import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PrismaCompetitionReadModel } from "../src/prisma-competition-read-model.js";
import { CLUB_TABLES, WORLD_ID as RAW_WORLD_ID, seedClub, seedWorld } from "./fixtures.js";
import { connect, hasDatabase, skipReason, truncate } from "./postgres.harness.js";

/** As fixtures guardam o id como texto; a porta pede o id de mundo tipado. */
const WORLD_ID = RAW_WORLD_ID as never;

const SEASON_ID = "019b76da-a800-7de0-9462-49c009be0001";
const COMPETITION_ID = "019b76da-a800-7de0-9462-49c009be0002";
const EDITION_ID = "019b76da-a800-7de0-9462-49c009be0003";

const CLUB_A = "019b76da-a800-7787-9462-49c009bea001";
const CLUB_B = "019b76da-a800-7787-9462-49c009bea002";
const CLUB_C = "019b76da-a800-7787-9462-49c009bea003";
const CLUB_D = "019b76da-a800-7787-9462-49c009bea004";

const TABLES = [
  ...CLUB_TABLES,
  "Season",
  "Competition",
  "CompetitionSeason",
  "CompetitionClub",
  "Match",
];

describe.skipIf(!hasDatabase)(
  `PrismaCompetitionReadModel — M-COMPETITION ${hasDatabase ? "" : `— PULADO: ${skipReason}`}`,
  () => {
    let client: ReturnType<typeof connect>;
    let readModel: PrismaCompetitionReadModel;

    beforeAll(() => {
      client = connect();
      readModel = new PrismaCompetitionReadModel(client);
    });

    beforeEach(async () => {
      await truncate(client, TABLES);
      await seedWorld(client);
      for (const clubId of [CLUB_A, CLUB_B, CLUB_C, CLUB_D]) {
        await seedClub(client, clubId);
      }
      await client.season.create({
        data: {
          id: SEASON_ID,
          gameWorldId: RAW_WORLD_ID,
          number: 7,
          name: "Temporada 7",
          startsAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      });
    });

    afterAll(async () => {
      await client.$disconnect();
    });

    /** Cria a competição + a edição corrente. `groups` assinala os clubes. */
    async function seedCompetition(options: {
      format: "ROUND_ROBIN" | "KNOCKOUT" | "GROUPS_AND_KNOCKOUT";
      type?: "LEAGUE" | "CUP";
      clubs: readonly { clubId: string; group?: string | null }[];
      lifecycle?: "RUNNING" | "FINISHED";
      rulesJson?: unknown;
    }): Promise<void> {
      await client.competition.create({
        data: {
          id: COMPETITION_ID,
          gameWorldId: RAW_WORLD_ID,
          name: "Copa de Teste",
          type: options.type ?? "LEAGUE",
          format: options.format,
          tier: 1,
          reputation: 60,
        },
      });
      await client.competitionSeason.create({
        data: {
          id: EDITION_ID,
          competitionId: COMPETITION_ID,
          seasonId: SEASON_ID,
          name: "Edição 7",
          lifecycle: options.lifecycle ?? "RUNNING",
          startsAt: new Date("2026-02-01T00:00:00.000Z"),
          endsAt: new Date("2026-06-01T00:00:00.000Z"),
          rulesJson: (options.rulesJson ?? null) as never,
        },
      });
      await client.competitionClub.createMany({
        data: options.clubs.map((c, index) => ({
          id: `019b76da-a800-7dc0-9462-49c009be00${10 + index}`,
          competitionSeasonId: EDITION_ID,
          clubId: c.clubId,
          groupName: c.group ?? null,
        })),
      });
    }

    let matchSeq = 0;
    async function seedMatch(options: {
      home: string;
      away: string;
      round: number;
      homeGoals?: number;
      awayGoals?: number;
      played?: boolean;
      day?: string;
    }): Promise<string> {
      matchSeq += 1;
      const id = `019b76da-a800-7dd0-9462-49c009be${String(1000 + matchSeq)}`;
      const played = options.played ?? false;
      await client.match.create({
        data: {
          id,
          gameWorldId: RAW_WORLD_ID,
          competitionSeasonId: EDITION_ID,
          homeClubId: options.home,
          awayClubId: options.away,
          seasonNumber: 7,
          roundNumber: options.round,
          scheduledAt: new Date(`${options.day ?? "2026-02-10"}T18:00:00.000Z`),
          runtimeStatus: played ? "FINISHED" : "SCHEDULED",
          resultStatus: played ? "NORMAL" : "PENDING",
          homeGoals: options.homeGoals ?? 0,
          awayGoals: options.awayGoals ?? 0,
        },
      });
      return id;
    }

    describe("competitionDetail", () => {
      it("devolve cabeçalho, andamento e as vagas do regulamento", async () => {
        await seedCompetition({
          format: "ROUND_ROBIN",
          clubs: [{ clubId: CLUB_A }, { clubId: CLUB_B }],
          rulesJson: { rules: { promotionSlots: 2, relegationSlots: 3 } },
        });
        await seedMatch({ home: CLUB_A, away: CLUB_B, round: 1, homeGoals: 2, awayGoals: 1, played: true });
        await seedMatch({ home: CLUB_B, away: CLUB_A, round: 2 });

        const detail = await readModel.competitionDetail(WORLD_ID, COMPETITION_ID);

        expect(detail?.name).toBe("Copa de Teste");
        expect(detail?.seasonNumber).toBe(7);
        expect(detail?.totalMatches).toBe(2);
        expect(detail?.playedMatches).toBe(1);
        expect(detail?.currentRound).toBe(1);
        expect(detail?.totalRounds).toBe(2);
        expect(detail?.promotionSlots).toBe(2);
        expect(detail?.relegationSlots).toBe(3);
        expect(detail?.hasGroups).toBe(false);
        // Liga não tem mata-mata: a aba de chaveamento não deve aparecer.
        expect(detail?.hasKnockout).toBe(false);
      });

      it("edição sem jogo terminado não inventa rodada corrente", async () => {
        await seedCompetition({
          format: "ROUND_ROBIN",
          clubs: [{ clubId: CLUB_A }, { clubId: CLUB_B }],
        });
        await seedMatch({ home: CLUB_A, away: CLUB_B, round: 1 });

        const detail = await readModel.competitionDetail(WORLD_ID, COMPETITION_ID);
        expect(detail?.currentRound).toBeNull();
        expect(detail?.playedMatches).toBe(0);
      });

      it("competição de OUTRO mundo não vaza", async () => {
        await seedCompetition({
          format: "ROUND_ROBIN",
          clubs: [{ clubId: CLUB_A }],
        });
        const otherWorld = "019b76da-a800-7787-9462-49c009be5555" as never;
        expect(
          await readModel.competitionDetail(otherWorld, COMPETITION_ID),
        ).toBeNull();
      });
    });

    describe("competitionTable", () => {
      it("liga devolve UMA tabela sem grupo, ordenada por pontos", async () => {
        await seedCompetition({
          format: "ROUND_ROBIN",
          clubs: [{ clubId: CLUB_A }, { clubId: CLUB_B }],
        });
        await seedMatch({ home: CLUB_A, away: CLUB_B, round: 1, homeGoals: 0, awayGoals: 3, played: true });

        const view = await readModel.competitionTable(WORLD_ID, COMPETITION_ID);

        expect(view?.groups).toHaveLength(1);
        expect(view?.groups[0]?.group).toBeNull();
        expect(view?.groups[0]?.table[0]?.clubId).toBe(CLUB_B);
        expect(view?.groups[0]?.table[0]?.points).toBe(3);
        // A tela mostra escudo, não UUID: nome e sigla vêm resolvidos.
        expect(view?.groups[0]?.table[0]?.clubName).toContain("Clube");
        expect(view?.groups[0]?.table[0]?.shortCode).not.toBe("");
      });

      it("fase de grupos devolve UMA tabela por grupo", async () => {
        await seedCompetition({
          format: "GROUPS_AND_KNOCKOUT",
          type: "CUP",
          clubs: [
            { clubId: CLUB_A, group: "A" },
            { clubId: CLUB_B, group: "A" },
            { clubId: CLUB_C, group: "B" },
            { clubId: CLUB_D, group: "B" },
          ],
        });
        await seedMatch({ home: CLUB_A, away: CLUB_B, round: 1, homeGoals: 1, awayGoals: 0, played: true });
        await seedMatch({ home: CLUB_C, away: CLUB_D, round: 1, homeGoals: 2, awayGoals: 2, played: true });

        const view = await readModel.competitionTable(WORLD_ID, COMPETITION_ID);

        expect(view?.groups.map((g) => g.group)).toEqual(["A", "B"]);
        expect(view?.groups[0]?.table[0]?.clubId).toBe(CLUB_A);
        // O jogo do grupo B não pode contar no grupo A.
        expect(view?.groups[0]?.table.every((r) => r.played === 1)).toBe(true);
        expect(view?.groups[1]?.table.every((r) => r.points === 1)).toBe(true);
      });

      it("partida AGENDADA não vira empate 0×0 na tabela", async () => {
        await seedCompetition({
          format: "ROUND_ROBIN",
          clubs: [{ clubId: CLUB_A }, { clubId: CLUB_B }],
        });
        await seedMatch({ home: CLUB_A, away: CLUB_B, round: 1 });

        const view = await readModel.competitionTable(WORLD_ID, COMPETITION_ID);
        expect(view?.groups[0]?.table.every((r) => r.played === 0)).toBe(true);
        expect(view?.groups[0]?.table.every((r) => r.points === 0)).toBe(true);
      });
    });

    describe("competitionBracket", () => {
      it("liga devolve chaveamento VAZIO, não nulo", async () => {
        await seedCompetition({
          format: "ROUND_ROBIN",
          clubs: [{ clubId: CLUB_A }, { clubId: CLUB_B }],
        });
        const view = await readModel.competitionBracket(WORLD_ID, COMPETITION_ID);
        expect(view).not.toBeNull();
        expect(view?.rounds).toEqual([]);
      });

      it("mata-mata agrupa ida e volta e nomeia a fase", async () => {
        await seedCompetition({
          format: "KNOCKOUT",
          type: "CUP",
          clubs: [{ clubId: CLUB_A }, { clubId: CLUB_B }],
        });
        await seedMatch({ home: CLUB_A, away: CLUB_B, round: 1, homeGoals: 2, awayGoals: 0, played: true, day: "2026-02-10" });
        await seedMatch({ home: CLUB_B, away: CLUB_A, round: 1, homeGoals: 1, awayGoals: 0, played: true, day: "2026-02-17" });

        const view = await readModel.competitionBracket(WORLD_ID, COMPETITION_ID);

        expect(view?.rounds).toHaveLength(1);
        const round = view!.rounds[0]!;
        expect(round.name).toBe("Final");
        expect(round.ties).toHaveLength(1);
        const tie = round.ties[0]!;
        expect(tie.legs).toHaveLength(2);
        expect(tie.homeAggregate).toBe(2);
        expect(tie.awayAggregate).toBe(1);
        expect(tie.winnerClubId).toBe(CLUB_A);
        expect(tie.home.clubName).toContain("Clube");
      });

      it("confronto com perna por jogar não tem vencedor", async () => {
        await seedCompetition({
          format: "KNOCKOUT",
          type: "CUP",
          clubs: [{ clubId: CLUB_A }, { clubId: CLUB_B }],
        });
        await seedMatch({ home: CLUB_A, away: CLUB_B, round: 1, homeGoals: 3, awayGoals: 0, played: true, day: "2026-02-10" });
        await seedMatch({ home: CLUB_B, away: CLUB_A, round: 1, day: "2026-02-17" });

        const view = await readModel.competitionBracket(WORLD_ID, COMPETITION_ID);
        const tie = view!.rounds[0]!.ties[0]!;
        expect(tie.winnerClubId).toBeNull();
        expect(tie.undecidedReason).toBe("PENDING_LEG");
      });
    });

    describe("competitionMatches", () => {
      it("lista jogados e por jogar, com escudo dos dois lados", async () => {
        await seedCompetition({
          format: "ROUND_ROBIN",
          clubs: [{ clubId: CLUB_A }, { clubId: CLUB_B }],
        });
        await seedMatch({ home: CLUB_A, away: CLUB_B, round: 1, homeGoals: 1, awayGoals: 1, played: true, day: "2026-02-10" });
        await seedMatch({ home: CLUB_B, away: CLUB_A, round: 2, day: "2026-03-10" });

        const view = await readModel.competitionMatches(WORLD_ID, COMPETITION_ID);

        expect(view?.matches).toHaveLength(2);
        const [first, second] = view!.matches;
        expect(first!.finished).toBe(true);
        expect(first!.homeGoals).toBe(1);
        expect(first!.home.shortCode).not.toBe("");
        // O jogo futuro tem placar NULO, não 0×0.
        expect(second!.finished).toBe(false);
        expect(second!.homeGoals).toBeNull();
        expect(second!.awayGoals).toBeNull();
        expect(second!.scheduledOn).toBe("2026-03-10");
      });

      it("marca o grupo do jogo quando os dois clubes são do mesmo grupo", async () => {
        await seedCompetition({
          format: "GROUPS_AND_KNOCKOUT",
          type: "CUP",
          clubs: [
            { clubId: CLUB_A, group: "A" },
            { clubId: CLUB_B, group: "A" },
            { clubId: CLUB_C, group: "B" },
          ],
        });
        await seedMatch({ home: CLUB_A, away: CLUB_B, round: 1 });
        await seedMatch({ home: CLUB_A, away: CLUB_C, round: 9, day: "2026-05-10" });

        const view = await readModel.competitionMatches(WORLD_ID, COMPETITION_ID);
        expect(view?.matches[0]?.group).toBe("A");
        // Cruzamento entre grupos (mata-mata) não pertence a grupo nenhum.
        expect(view?.matches[1]?.group).toBeNull();
      });
    });

    describe("competitionStats", () => {
      it("declara que o motor JÁ registra assistência e cartão (catraca)", async () => {
        await seedCompetition({
          format: "ROUND_ROBIN",
          clubs: [{ clubId: CLUB_A }, { clubId: CLUB_B }],
        });
        const stats = await readModel.competitionStats(WORLD_ID, COMPETITION_ID);

        // Esta expectativa é uma CATRACA: quando o simulador passar a produzir
        // assistências/cartões, ela quebra e obriga a revisar a tela que hoje
        // mostra "indisponível".
        expect(stats?.coverage).toEqual({
          goals: true,
          assists: true,
          cards: true,
        });
        // Sem partida jogada nesta edição, a lista é vazia porque não houve
        // assistência — não porque o motor não a produza. A bandeira acima é
        // que distingue os dois casos, e é ela que a tela lê.
        expect(stats?.assists).toEqual([]);
      });

      it("edição sem gol devolve artilharia vazia, não erro", async () => {
        await seedCompetition({
          format: "ROUND_ROBIN",
          clubs: [{ clubId: CLUB_A }, { clubId: CLUB_B }],
        });
        const stats = await readModel.competitionStats(WORLD_ID, COMPETITION_ID);
        expect(stats?.scorers).toEqual([]);
      });
    });

    describe("listCompetitions", () => {
      it("sem clubId (admin) não afirma participação nem posição", async () => {
        await seedCompetition({
          format: "ROUND_ROBIN",
          clubs: [{ clubId: CLUB_A }, { clubId: CLUB_B }],
        });
        const [row] = await readModel.listCompetitions(WORLD_ID);
        expect(row?.clubParticipates).toBeNull();
        expect(row?.clubRank).toBeNull();
      });

      it("com clubId diz que o clube joga e em que posição está", async () => {
        await seedCompetition({
          format: "ROUND_ROBIN",
          clubs: [{ clubId: CLUB_A }, { clubId: CLUB_B }],
        });
        await seedMatch({ home: CLUB_A, away: CLUB_B, round: 1, homeGoals: 0, awayGoals: 2, played: true });

        const [row] = await readModel.listCompetitions(WORLD_ID, CLUB_A);
        expect(row?.clubParticipates).toBe(true);
        expect(row?.clubRank).toBe(2);
        expect(row?.currentRound).toBe(1);
      });

      it("clube de fora da competição aparece como não-participante", async () => {
        await seedCompetition({
          format: "ROUND_ROBIN",
          clubs: [{ clubId: CLUB_A }, { clubId: CLUB_B }],
        });
        const [row] = await readModel.listCompetitions(WORLD_ID, CLUB_C);
        expect(row?.clubParticipates).toBe(false);
        expect(row?.clubRank).toBeNull();
      });
    });

    describe("competitionOutcome", () => {
      it("aceita competitionId e só declara campeão com a edição homologada", async () => {
        await seedCompetition({
          format: "ROUND_ROBIN",
          clubs: [{ clubId: CLUB_A }, { clubId: CLUB_B }],
          lifecycle: "RUNNING",
        });
        await seedMatch({ home: CLUB_A, away: CLUB_B, round: 1, homeGoals: 4, awayGoals: 0, played: true });

        const running = await readModel.competitionOutcome(WORLD_ID, COMPETITION_ID);
        expect(running?.seasonNumber).toBe(7);
        expect(running?.finished).toBe(false);
        expect(running?.champion).toBeNull();

        await client.competitionSeason.update({
          where: { id: EDITION_ID },
          data: { lifecycle: "FINISHED" },
        });
        const finished = await readModel.competitionOutcome(WORLD_ID, COMPETITION_ID);
        expect(finished?.champion?.clubId).toBe(CLUB_A);
      });
    });
  },
);
