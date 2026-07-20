import { describe, expect, it } from "vitest";

import {
  STANCE_OPTIONS,
  buildTalkToPlayerPayload,
  buildTalkToSquadPayload,
  talkIdempotencyKey,
} from "./talk-model.js";

describe("talk-model (R-221 2c mobile)", () => {
  it("oferece elogiar (up) e criticar (down)", () => {
    expect(STANCE_OPTIONS.map((o) => o.stance)).toEqual(["PRAISE", "CRITICIZE"]);
    expect(STANCE_OPTIONS[0].tone).toBe("up");
    expect(STANCE_OPTIONS[1].tone).toBe("down");
  });

  it("monta o payload de talk-to-player", () => {
    expect(buildTalkToPlayerPayload({ clubId: "c", playerId: "p", stance: "PRAISE" }))
      .toEqual({ clubId: "c", playerId: "p", stance: "PRAISE" });
  });

  it("monta o payload de talk-to-squad (sem playerId)", () => {
    expect(buildTalkToSquadPayload({ clubId: "c", stance: "CRITICIZE" }))
      .toEqual({ clubId: "c", stance: "CRITICIZE" });
  });

  it("idempotência estável por alvo+postura", () => {
    const k = talkIdempotencyKey({ commandType: "morale:talk-to-player", targetId: "p", stance: "PRAISE" });
    expect(k).toBe("morale:talk-to-player:p:PRAISE");
    expect(k).toBe(talkIdempotencyKey({ commandType: "morale:talk-to-player", targetId: "p", stance: "PRAISE" }));
  });
});
