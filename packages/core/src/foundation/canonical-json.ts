import { DomainError } from "@grinta/shared";

/**
 * Serialização canônica: o mesmo valor produz sempre o mesmo texto, em qualquer
 * processo. É a base da cadeia de integridade da auditoria (R-133), cujo hash é
 * `H(canonical(payload) ‖ prevEventHash)`.
 *
 * Por que não `JSON.stringify` puro:
 *
 * - a ordem das chaves segue a inserção, então o mesmo payload montado por dois
 *   caminhos daria hashes diferentes e a cadeia acusaria adulteração que não
 *   houve;
 * - `undefined` some em silêncio (`{a:1,b:undefined}` e `{a:1}` viram o mesmo
 *   texto) — dois payloads distintos com um hash só;
 * - `bigint` explode, e dinheiro é bigint (R-181).
 *
 * Recusar é melhor que aproximar: um evento que não se deixa canonicalizar não
 * pode entrar na cadeia.
 */
export function canonicalJson(value: unknown): string {
  return write(value, new Set());
}

function write(value: unknown, seen: Set<object>): string {
  if (value === null) return "null";

  switch (typeof value) {
    case "string":
      return JSON.stringify(value);
    case "boolean":
      return value ? "true" : "false";
    case "bigint":
      // String decimal: JSON não tem inteiro de precisão arbitrária, e number
      // perderia os dígitos acima de 2^53 — justamente o que bigint protege.
      return JSON.stringify(value.toString());
    case "number":
      if (!Number.isFinite(value)) {
        throw invalid("NaN e Infinity não têm representação em JSON.", value);
      }
      return JSON.stringify(value);
    case "undefined":
      throw invalid(
        "undefined não é representável: sumiria do texto e dois payloads diferentes teriam o mesmo hash.",
        value,
      );
    case "object":
      return writeObject(value, seen);
    default:
      throw invalid(`${typeof value} não é serializável.`, value);
  }
}

function writeObject(value: object, seen: Set<object>): string {
  if (seen.has(value)) {
    throw invalid("Referência cíclica não é serializável.", value);
  }
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      // Array é sequência: a ordem É o dado. Ordenar destruiria informação.
      return `[${value.map((item) => write(item, seen)).join(",")}]`;
    }
    const entries = Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => {
        const item = (value as Record<string, unknown>)[key];
        return `${JSON.stringify(key)}:${write(item, seen)}`;
      });
    return `{${entries.join(",")}}`;
  } finally {
    seen.delete(value);
  }
}

function invalid(message: string, value: unknown): DomainError {
  return new DomainError("PAYLOAD_NAO_CANONICALIZAVEL", message, {
    valueType: typeof value,
  });
}
