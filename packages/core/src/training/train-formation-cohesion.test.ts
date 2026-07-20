import { describe, expect, it } from "vitest";

import { COHESION_FORMATION_TRAINING_GAIN } from "../competitions/team-cohesion.js";

import {
  TrainFormationCohesion,
  type CohesionWriter,
  type LineupPresenceReader,
} from "./train-formation-cohesion.js";

const WORLD = "019b76da-a800-7451-8ea2-7b2378e42050";
const CLUB = "019b76da-a800-7451-8ea2-7b2378e42053";

class MemLineup implements LineupPresenceReader {
  public constructor(private readonly present: boolean) {}
  public hasLineup(): Promise<boolean> {
    return Promise.resolve(this.present);
  }
}

class MemCohesion implements CohesionWriter {
  public gain = 0;
  public calls = 0;
  public raiseByFormationTraining(): Promise<void> {
    this.calls += 1;
    this.gain += COHESION_FORMATION_TRAINING_GAIN;
    return Promise.resolve();
  }
}

describe("TrainFormationCohesion (R-220 Fase 3)", () => {
  it("treina a formação e SOBE a coesão do clube", async () => {
    const cohesion = new MemCohesion();
    const r = await new TrainFormationCohesion(
      new MemLineup(true),
      cohesion,
    ).execute({ gameWorldId: WORLD, clubId: CLUB });
    expect(r.ok).toBe(true);
    expect(cohesion.calls).toBe(1);
    expect(cohesion.gain).toBe(COHESION_FORMATION_TRAINING_GAIN);
  });

  it("RECUSA treinar sem escalação — não se treina uma formação que não existe", async () => {
    const cohesion = new MemCohesion();
    const r = await new TrainFormationCohesion(
      new MemLineup(false),
      cohesion,
    ).execute({ gameWorldId: WORLD, clubId: CLUB });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("NO_LINEUP_TO_TRAIN");
    // E não tocou na coesão: recusa é recusa, não meio-efeito.
    expect(cohesion.calls).toBe(0);
  });
});
