import { describe, expect, it } from "vitest";

import { availabilityFlag } from "./availability";

describe("availabilityFlag — selo de lesão/suspensão ao lado do nome", () => {
  it("INJURED → flag de lesão (medkit, danger)", () => {
    expect(availabilityFlag("INJURED")).toEqual({
      availability: "INJURED",
      label: "Lesionado",
      short: "LESÃO",
      icon: "medkit",
      tone: "danger",
    });
  });

  it("SUSPENDED → flag de suspensão (warning, warn)", () => {
    expect(availabilityFlag("SUSPENDED")).toEqual({
      availability: "SUSPENDED",
      label: "Suspenso",
      short: "SUSP.",
      icon: "warning",
      tone: "warn",
    });
  });

  it("AVAILABLE → sem flag (jogador apto não precisa de marca)", () => {
    expect(availabilityFlag("AVAILABLE")).toBeNull();
  });

  it("UNAVAILABLE (em treino) não é lesão nem suspensão → sem flag", () => {
    expect(availabilityFlag("UNAVAILABLE")).toBeNull();
  });

  it("CONVENED (convocado) não é lesão nem suspensão → sem flag", () => {
    expect(availabilityFlag("CONVENED")).toBeNull();
  });

  it("valor desconhecido → sem flag (nunca inventa selo)", () => {
    expect(availabilityFlag("")).toBeNull();
    expect(availabilityFlag("WHATEVER")).toBeNull();
  });
});
