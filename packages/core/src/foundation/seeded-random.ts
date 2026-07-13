import { DomainError } from "@grinta/shared";

const UINT_64_MASK = (1n << 64n) - 1n;
const PCG_MULTIPLIER = 6_364_136_223_846_793_005n;
const FNV_OFFSET = 14_695_981_039_346_656_037n;
const FNV_PRIME = 1_099_511_628_211n;
const UINT_32_RANGE = 0x1_0000_0000;

function hash64(value: string, salt: bigint): bigint {
  let hash = (FNV_OFFSET ^ salt) & UINT_64_MASK;
  const bytes = new TextEncoder().encode(value);

  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = (hash * FNV_PRIME) & UINT_64_MASK;
  }

  return hash;
}

export class SeededRandom {
  readonly #increment: bigint;
  #state = 0n;

  public constructor(input: Readonly<{ worldSeed: string; context: string }>) {
    if (input.worldSeed.trim() === "" || input.context.trim() === "") {
      throw new DomainError(
        "INVALID_RANDOM_SEED",
        "worldSeed e context são obrigatórios para criar uma stream determinística.",
      );
    }

    const material = `${input.worldSeed}\u0000${input.context}`;
    const initialState = hash64(material, 0x9e37_79b9_7f4a_7c15n);
    const streamSelector = hash64(material, 0xd1b5_4a32_d192_ed03n);
    this.#increment = ((streamSelector << 1n) | 1n) & UINT_64_MASK;

    this.nextUint32();
    this.#state = (this.#state + initialState) & UINT_64_MASK;
    this.nextUint32();
  }

  public nextUint32(): number {
    const previousState = this.#state;
    this.#state =
      (previousState * PCG_MULTIPLIER + this.#increment) & UINT_64_MASK;

    const xorshifted = Number(
      (((previousState >> 18n) ^ previousState) >> 27n) & 0xffff_ffffn,
    );
    const rotation = Number(previousState >> 59n);

    return ((xorshifted >>> rotation) | (xorshifted << (-rotation & 31))) >>> 0;
  }

  public nextFloat(): number {
    return this.nextUint32() / UINT_32_RANGE;
  }

  public nextInt(minimum: number, maximumExclusive: number): number {
    if (
      !Number.isSafeInteger(minimum) ||
      !Number.isSafeInteger(maximumExclusive) ||
      maximumExclusive <= minimum
    ) {
      throw new DomainError(
        "INVALID_RANDOM_RANGE",
        "O intervalo deve conter inteiros seguros e maximumExclusive > minimum.",
        { minimum, maximumExclusive },
      );
    }

    const range = maximumExclusive - minimum;
    if (range > UINT_32_RANGE) {
      throw new DomainError(
        "INVALID_RANDOM_RANGE",
        "O intervalo do PCG32 não pode exceder 2^32 valores.",
        { minimum, maximumExclusive },
      );
    }

    const rejectionThreshold = (UINT_32_RANGE - range) % range;
    let sample = this.nextUint32();
    while (sample < rejectionThreshold) {
      sample = this.nextUint32();
    }

    return minimum + (sample % range);
  }
}
