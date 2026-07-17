import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  CHAIN_GENESIS_HASH,
  computeEventHash,
  verifyEventChain,
  type ChainableEvent,
} from "../../src/foundation/event-chain.js";

/**
 * sha256 de verdade (R-133). O `src` não pode importar `node:crypto` — o core
 * também roda no React Native —, mas o teste roda em Node, então aqui dá para
 * exercitar o algoritmo real em vez de um dublê. A injeção continua provada:
 * é este `hash` que a regra usa.
 */
const sha256 = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

const event: ChainableEvent = {
  eventId: "019b76da-a800-7787-9462-49c009be3111",
  gameWorldId: "019b76da-a800-7787-9462-49c009be3222",
  aggregateType: "ClubControl",
  aggregateId: "019b76da-a800-7787-9462-49c009be3333",
  aggregateVersion: 1n,
  sequence: 1n,
  eventType: "ClubControlEnded",
  eventVersion: 1,
  payload: { reason: "SWITCH_REQUESTED" },
  actorType: "USER",
  actorId: "019b76da-a800-7787-9462-49c009be3444",
  correlationId: null,
  causationId: null,
  occurredOn: "2026-01-05",
};

function hashOf(over: Partial<ChainableEvent> = {}, prev = CHAIN_GENESIS_HASH) {
  return computeEventHash({
    event: { ...event, ...over },
    prevEventHash: prev,
    hash: sha256,
  });
}

describe("computeEventHash", () => {
  it("é determinístico — o mesmo evento dá sempre o mesmo hash", () => {
    expect(hashOf()).toBe(hashOf());
  });

  // Isto é o "encadeamento": sem depender do anterior, cada linha seria uma
  // ilha e reordenar/remover o meio não seria detectável.
  it("muda quando o hash anterior muda", () => {
    expect(hashOf({}, CHAIN_GENESIS_HASH)).not.toBe(hashOf({}, "1".repeat(64)));
  });

  /**
   * O ponto da R-133. A implementação antiga (`world-admin.ts:1048`) hasheava
   * `sequence|actor|action|target|prevHash` — quatro escalares. Trocar o
   * conteúdo do evento não quebrava a cadeia, que é a única coisa que uma
   * cadeia de integridade existe para impedir.
   *
   * Cada campo abaixo é um caminho de adulteração que TEM que quebrar o hash.
   */
  it.each([
    ["payload", { payload: { reason: "ADMIN_FORCED" } }],
    ["eventType", { eventType: "ClubControlStarted" }],
    ["aggregateType", { aggregateType: "WorldParticipant" }],
    ["aggregateId", { aggregateId: "019b76da-a800-7787-9462-49c009be9999" }],
    ["aggregateVersion", { aggregateVersion: 2n }],
    ["sequence", { sequence: 2n }],
    ["eventId", { eventId: "019b76da-a800-7787-9462-49c009be8888" }],
    ["gameWorldId", { gameWorldId: "019b76da-a800-7787-9462-49c009be7777" }],
    ["eventVersion", { eventVersion: 2 }],
    ["actorType", { actorType: "ADMIN" }],
    ["actorId", { actorId: "019b76da-a800-7787-9462-49c009be6666" }],
    ["correlationId", { correlationId: "019b76da-a800-7787-9462-49c009be5555" }],
    ["causationId", { causationId: "019b76da-a800-7787-9462-49c009be4444" }],
    ["occurredOn", { occurredOn: "2026-01-06" }],
  ] as const)("muda quando %s muda — senão o campo é adulterável", (_, over) => {
    expect(hashOf(over)).not.toBe(hashOf());
  });

  // A ordem das chaves do payload não é dado. Se mudasse o hash, o verificador
  // acusaria adulteração que não houve.
  it("não muda quando só a ordem das chaves do payload muda", () => {
    const a = hashOf({ payload: { x: 1, y: 2 } });
    const b = hashOf({ payload: { y: 2, x: 1 } });
    expect(a).toBe(b);
  });

  it("o primeiro evento do mundo encadeia no gênese, não no vazio", () => {
    expect(CHAIN_GENESIS_HASH).toMatch(/^0{64}$/);
  });

  // Concatenação ambígua = colisão de graça: dois pares (evento, prev)
  // diferentes gerando o mesmo texto. O prev tem largura fixa justamente para
  // que (evento, prev) → texto seja injetivo.
  it("recusa hash anterior com largura diferente da do gênese", () => {
    expect(() =>
      computeEventHash({ event, prevEventHash: "abc", hash: sha256 }),
    ).toThrow();
  });
});

describe("verifyEventChain", () => {
  function chain(count: number): readonly ChainableEvent[] {
    const links: ChainableEvent[] = [];
    let prev = CHAIN_GENESIS_HASH;
    for (let index = 0; index < count; index += 1) {
      const link: ChainableEvent = {
        ...event,
        eventId: `019b76da-a800-7787-9462-49c009be${String(index).padStart(4, "0")}`,
        sequence: BigInt(index + 1),
        prevEventHash: prev,
        eventHash: "",
      };
      const eventHash = computeEventHash({
        event: link,
        prevEventHash: prev,
        hash: sha256,
      });
      links.push({ ...link, eventHash });
      prev = eventHash;
    }
    return links;
  }

  it("aceita uma cadeia íntegra", () => {
    expect(verifyEventChain(chain(3), sha256).ok).toBe(true);
  });

  it("aceita cadeia vazia — mundo sem evento é íntegro", () => {
    expect(verifyEventChain([], sha256).ok).toBe(true);
  });

  // Os três ataques que a cadeia existe para pegar.
  it("acusa payload adulterado no meio", () => {
    const links = [...chain(3)];
    links[1] = { ...links[1]!, payload: { reason: "ADMIN_FORCED" } };
    const result = verifyEventChain(links, sha256);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("CADEIA_ADULTERADA");
  });

  it("acusa elo removido do meio", () => {
    const links = chain(4);
    const result = verifyEventChain([links[0]!, links[2]!, links[3]!], sha256);
    expect(result.ok).toBe(false);
  });

  it("acusa elo reordenado", () => {
    const links = chain(3);
    const result = verifyEventChain([links[0]!, links[2]!, links[1]!], sha256);
    expect(result.ok).toBe(false);
  });

  // Sem gap nem duplicata é critério de aceite explícito (CA-REG-01).
  it("acusa buraco na sequência mesmo com hashes coerentes", () => {
    const links = [...chain(2)];
    links[1] = { ...links[1]!, sequence: 5n };
    expect(verifyEventChain(links, sha256).ok).toBe(false);
  });

  it("acusa cadeia que não começa no gênese", () => {
    const links = [...chain(2)];
    links[0] = { ...links[0]!, prevEventHash: "f".repeat(64) };
    expect(verifyEventChain(links, sha256).ok).toBe(false);
  });
});
