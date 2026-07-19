import { describe, expect, it } from "vitest";
import {
  deriveHomeNextMatch,
  deriveHomeWorldClockProgress,
  deriveHomeWorldStatus,
} from "./home-world-status-model";

describe("deriveHomeWorldStatus", () => {
  it("formata a data lógica sem deslocamento de fuso", () => {
    expect(
      deriveHomeWorldStatus({
        id: "019f7649-a2f6-728a-87a1-ba3d4435f853",
        currentDate: "2026-07-18",
      }),
    ).toEqual({
      dateLabel: "18 JUL 2026",
      weekdayLabel: "SÁBADO",
      worldReference: "019F7649",
    });
  });

  it("expõe uma referência curta e estável do mundo", () => {
    expect(
      deriveHomeWorldStatus({
        id: "abcdef12-a2f6-728a-87a1-ba3d4435f853",
        currentDate: "2026-01-01",
      }).worldReference,
    ).toBe("ABCDEF12");
  });

  it("usa a referência do id como último fallback", () => {
    expect(
      deriveHomeWorldStatus({
        id: "019f7649-a2f6-728a-87a1-ba3d4435f853",
        currentDate: "data-inválida",
      }),
    ).toEqual({
      dateLabel: "DATA INDISPONÍVEL",
      weekdayLabel: "TEMPO DO JOGO",
      worldReference: "019F7649",
    });
  });

  it("prepara o próximo compromisso oficial do clube", () => {
    expect(
      deriveHomeNextMatch(
        {
          matchId: "match-1",
          roundNumber: 4,
          homeClubId: "club-me",
          awayClubId: "club-rival",
          homeClubName: "Bandeirantes",
          awayClubName: "Rivais FC",
          homeClubPrimaryColor: "#C2F74A",
          homeClubSecondaryColor: "#0A0B0D",
          homeClubCrestTemplateId: "crest-shield",
          awayClubPrimaryColor: "#1D4ED8",
          awayClubSecondaryColor: "#F8FAFC",
          awayClubCrestTemplateId: "crest-round",
          scheduledOn: "2026-01-08",
        },
        "club-me",
        "Liga Principal",
      ),
    ).toEqual({
      matchId: "match-1",
      dateLabel: "08 JAN 2026",
      roundLabel: "RODADA 4",
      competitionLabel: "Liga Principal",
      homeClubName: "Bandeirantes",
      awayClubName: "Rivais FC",
      homeClubPrimaryColor: "#C2F74A",
      homeClubSecondaryColor: "#0A0B0D",
      homeClubCrestTemplateId: "crest-shield",
      awayClubPrimaryColor: "#1D4ED8",
      awayClubSecondaryColor: "#F8FAFC",
      awayClubCrestTemplateId: "crest-round",
      venueLabel: "EM CASA",
    });
  });

  it("não inventa compromisso quando não há jogo agendado", () => {
    expect(deriveHomeNextMatch(null, "club-me", "Liga Principal")).toBeNull();
  });

  it("esvazia o progresso conforme a virada do dia se aproxima", () => {
    expect(
      deriveHomeWorldClockProgress(
        {
          realSecondsPerDay: 600,
          clockRunning: true,
          nextTickAt: "2026-07-18T12:10:00.000Z",
        },
        Date.parse("2026-07-18T12:05:00.000Z"),
      ),
    ).toEqual({ remainingLabel: "5min", remainingFraction: 0.5 });
  });

  it("termina vazio quando chega a hora do próximo dia", () => {
    expect(
      deriveHomeWorldClockProgress(
        {
          realSecondsPerDay: 600,
          clockRunning: true,
          nextTickAt: "2026-07-18T12:10:00.000Z",
        },
        Date.parse("2026-07-18T12:10:01.000Z"),
      ),
    ).toEqual({ remainingLabel: "AGORA", remainingFraction: 0 });
  });

  it("não exibe progresso para relógio parado", () => {
    expect(
      deriveHomeWorldClockProgress(
        {
          realSecondsPerDay: 600,
          clockRunning: false,
          nextTickAt: null,
        },
        Date.parse("2026-07-18T12:05:00.000Z"),
      ),
    ).toBeNull();
  });
});
