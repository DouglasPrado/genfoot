import "reflect-metadata";

import { describe, expect, it } from "vitest";

import { RealtimeGateway } from "../src/realtime/realtime.gateway.js";

describe("RealtimeGateway sequence", () => {
  it("emite sequence monotônica por mundo e isolada entre mundos", () => {
    const gateway = new RealtimeGateway();

    const first = gateway.publish("w1", "corr", [
      { type: "WorldCreated" },
      { type: "WorldAdvanced" },
    ]);
    expect(first.map((event) => event.sequence)).toEqual([1, 2]);
    expect(first[0]?.streamId).toBe("world:w1");
    expect(first[0]?.eventType).toBe("WorldCreated");

    const more = gateway.publish("w1", "corr", [{ type: "WorldPaused" }]);
    expect(more[0]?.sequence).toBe(3); // continua no mesmo stream

    const other = gateway.publish("w2", "corr", [{ type: "WorldCreated" }]);
    expect(other[0]?.sequence).toBe(1); // isolado por mundo
  });
});
