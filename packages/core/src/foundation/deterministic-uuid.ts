import { DomainError, type EntityId } from "@grinta/shared";

import { SeededRandom } from "./seeded-random.js";

const MAX_UUID_TIMESTAMP = (1n << 48n) - 1n;

export function deterministicUuidV7<TKind extends string>(
  input: Readonly<{
    worldSeed: string;
    context: string;
    timestampMilliseconds: number;
  }>,
): EntityId<TKind> {
  if (
    !Number.isSafeInteger(input.timestampMilliseconds) ||
    input.timestampMilliseconds < 0 ||
    BigInt(input.timestampMilliseconds) > MAX_UUID_TIMESTAMP
  ) {
    throw new DomainError(
      "INVALID_UUID_TIMESTAMP",
      "O timestamp do UUIDv7 deve caber em 48 bits.",
      { timestampMilliseconds: input.timestampMilliseconds },
    );
  }

  const bytes = new Uint8Array(16);
  let timestamp = BigInt(input.timestampMilliseconds);
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = Number(timestamp & 0xffn);
    timestamp >>= 8n;
  }

  const random = new SeededRandom({
    worldSeed: input.worldSeed,
    context: `uuid:${input.context}`,
  });
  for (let offset = 6; offset < bytes.length; offset += 4) {
    const value = random.nextUint32();
    for (let byte = 0; byte < 4 && offset + byte < bytes.length; byte += 1) {
      bytes[offset + byte] = (value >>> (byte * 8)) & 0xff;
    }
  }

  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hexadecimal = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  );
  return [
    hexadecimal.slice(0, 4).join(""),
    hexadecimal.slice(4, 6).join(""),
    hexadecimal.slice(6, 8).join(""),
    hexadecimal.slice(8, 10).join(""),
    hexadecimal.slice(10).join(""),
  ].join("-") as EntityId<TKind>;
}
