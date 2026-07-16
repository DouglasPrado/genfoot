import { describe, expect, it } from "vitest";

import { canonicalJson } from "../../src/foundation/canonical-json.js";

/**
 * A canonicalização é a base da cadeia de integridade (R-133): o hash é
 * `H(canonical(payload) ‖ prevEventHash)`. Se dois processos serializarem o
 * MESMO payload de formas diferentes, a cadeia quebra sem ninguém ter
 * adulterado nada — e o verificador periódico acusaria falso positivo.
 */
describe("canonicalJson", () => {
  it("ordena as chaves — a ordem de inserção não pode mudar o hash", () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }));
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("ordena chaves aninhadas, não só as do topo", () => {
    expect(canonicalJson({ x: { d: 1, c: 2 } })).toBe('{"x":{"c":2,"d":1}}');
  });

  // Array é sequência: a ordem É o dado. Ordenar aqui destruiria informação.
  it("preserva a ordem dos arrays", () => {
    expect(canonicalJson([3, 1, 2])).toBe("[3,1,2]");
  });

  it("serializa escalares como JSON", () => {
    expect(canonicalJson("a")).toBe('"a"');
    expect(canonicalJson(42)).toBe("42");
    expect(canonicalJson(true)).toBe("true");
    expect(canonicalJson(null)).toBe("null");
  });

  // Dinheiro é bigint (R-181) e JSON.stringify explode em bigint. Sem isto,
  // nenhum evento com valor monetário conseguiria ser hasheado.
  it("serializa bigint como string decimal, sem perder precisão", () => {
    expect(canonicalJson({ amountMinor: 9007199254740993n })).toBe(
      '{"amountMinor":"9007199254740993"}',
    );
  });

  // `undefined` some no JSON.stringify: {a:1,b:undefined} e {a:1} viram o mesmo
  // texto. Dois payloads diferentes com o mesmo hash é colisão por descuido.
  it("recusa undefined em vez de deixá-lo sumir em silêncio", () => {
    expect(() => canonicalJson({ a: 1, b: undefined })).toThrow();
    expect(() => canonicalJson(undefined)).toThrow();
  });

  it("recusa o que o JSON não representa de volta", () => {
    expect(() => canonicalJson(Number.NaN)).toThrow();
    expect(() => canonicalJson(Number.POSITIVE_INFINITY)).toThrow();
    expect(() => canonicalJson(() => 1)).toThrow();
  });

  // Um ciclo faria o serializador entrar em loop. Falhar alto é melhor que
  // travar o append de evento.
  it("recusa referência cíclica", () => {
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic.self = cyclic;
    expect(() => canonicalJson(cyclic)).toThrow();
  });

  it("escapa como JSON — aspas e unicode não podem forjar delimitador", () => {
    expect(canonicalJson({ a: '"' })).toBe('{"a":"\\""}');
    expect(canonicalJson({ a: "\n" })).toBe('{"a":"\\n"}');
  });
});
