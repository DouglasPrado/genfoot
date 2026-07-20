import { describe, expect, it } from "vitest";

import {
  buildClubInfrastructure,
  selectManagedClub,
  squadPlayersFromRoster,
} from "./club-projection";

/**
 * A forma que `club-detail` entrega: PLANA.
 *
 * Era `identity.name` / `stadium.capacity` — o `WorldClubPortfolioSnapshot` cru
 * vazando até a tela. O read model de C3 agora resolve o período de identidade e
 * o estádio (BC-003: o clube tem história de nomes, não um nome).
 *
 * `crestTemplateId: null` é o caso COMUM: clube gerado nasce sem identidade
 * visual, e o jogador a define ao personalizar.
 */
const activeClub = {
  id: "club-active",
  status: "ACTIVE",
  version: 1,
  name: "Jardim Atlético",
  shortCode: "JAT",
  reputationBand: 2,
  cohesion: 50,
  stadiumName: "Estádio do Jardim",
  stadiumCapacity: 18_500,
  primaryColor: null,
  secondaryColor: null,
  crestTemplateId: null,
  manager: null,
  departments: [
    { kind: "TRAINING", level: 3, capacity: 70, condition: 84 },
    { kind: "MEDICAL", level: 2, capacity: 55, condition: 91 },
  ],
} as const;

describe("projeção do clube gerenciado no mobile", () => {
  it("prioriza o clube configurado e não depende da ordem da projeção", () => {
    const portfolio = {
      clubs: [{ ...activeClub, id: "club-other" }, activeClub],
    };

    expect(selectManagedClub(portfolio, "club-active")).toBe(activeClub);
  });

  it("usa o primeiro clube ativo apenas no mundo demo sem seleção persistida", () => {
    const suspended = {
      ...activeClub,
      id: "club-suspended",
      status: "SUSPENDED",
    };
    const portfolio = { clubs: [suspended, activeClub] };

    expect(selectManagedClub(portfolio, null)).toBe(activeClub);
  });

  it("traduz departamentos oficiais em infraestrutura compreensível", () => {
    expect(buildClubInfrastructure(activeClub)).toEqual([
      {
        id: "TRAINING",
        name: "Centro de treino",
        icon: "barbell",
        level: 3,
        maxLevel: 5,
        note: "Condição 84% · capacidade 70",
      },
      {
        id: "MEDICAL",
        name: "Departamento médico",
        icon: "medkit",
        level: 2,
        maxLevel: 5,
        note: "Condição 91% · capacidade 55",
      },
    ]);
  });

  it("mapeia o elenco da query roster para a apresentação (R-190)", () => {
    const roster = {
      clubId: "club-active",
      squadName: "Elenco Jardim Atlético",
      seasonNumber: 1,
      players: [
        {
          playerId: "player-1",
          shirtNumber: 9,
          name: "Caio Silva",
          primaryPosition: "ST",
          overall: 73,
          potential: 81,
          age: 25,
          morale: 72,
          fitness: 88,
        },
      ],
    };

    expect(squadPlayersFromRoster(roster)).toEqual([
      expect.objectContaining({
        id: "player-1",
        number: 9,
        name: "Caio Silva",
        position: "ATA",
        group: "ATA",
        age: 25,
        ovr: 73,
        pot: 81,
        fitness: 88,
        morale: 72,
        starter: true,
      }),
    ]);
  });

  /** Sem contratos (C6) nem histórico de partidas (C5), estes campos degradam. */
  it("degrada honestamente o que ainda não existe: contrato e forma", () => {
    const [player] = squadPlayersFromRoster({
      clubId: "c",
      squadName: "e",
      seasonNumber: 1,
      players: [
        {
          playerId: "p",
          shirtNumber: 20,
          name: "Reserva",
          primaryPosition: "CB",
          overall: 58,
          potential: 60,
          age: 30,
          morale: 50,
          fitness: 100,
        },
      ],
    });
    expect(player?.contractYears).toBe(0);
    expect(player?.form).toBe("steady");
    expect(player?.starter).toBe(false); // camisa 20 não é titular por padrão
  });
});
