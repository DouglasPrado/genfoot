import { describe, expect, it } from "vitest";

import {
  buildClubInfrastructure,
  selectManagedClub,
  squadPlayersFromProjections,
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

  it("monta o elenco do clube juntando vínculos, jogadores e pessoas", () => {
    const portfolio = {
      clubs: [activeClub],
      squads: [
        {
          id: "squad-active",
          clubId: "club-active",
          version: 1,
          memberships: [
            { playerId: "player-1", slot: "S09", category: "SENIOR" },
          ],
        },
      ],
    };
    const roster = {
      persons: [
        {
          id: "person-1",
          firstName: "Caio",
          lastName: "Silva",
          birthDate: "2000-08-01",
        },
      ],
      players: [
        {
          id: "player-1",
          personId: "person-1",
          primaryPosition: "ST",
          currentAbility: 73,
          potentialAbility: 81,
          dynamicState: { morale: 72, confidence: 68, fatigue: 12 },
        },
      ],
    };

    expect(
      squadPlayersFromProjections(
        portfolio,
        roster,
        "club-active",
        "2026-01-01",
      ),
    ).toEqual([
      expect.objectContaining({
        id: "player-1",
        number: 9,
        name: "Caio Silva",
        position: "ATA",
        group: "ATA",
        age: 25,
        ovr: 73,
        fitness: 88,
        form: "up",
      }),
    ]);
  });
});
