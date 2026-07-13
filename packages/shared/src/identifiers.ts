import {
  v7 as uuidv7,
  validate as validateUuid,
  version as uuidVersion,
} from "uuid";

import { DomainError } from "./domain-error.js";
import { fail, succeed, type Result } from "./result.js";

declare const brand: unique symbol;

export type Brand<T, TBrand extends string> = T & {
  readonly [brand]: TBrand;
};

export type EntityId<TKind extends string> = Brand<string, `EntityId:${TKind}`>;
export type GameWorldId = EntityId<"GameWorld">;

export function newEntityId<TKind extends string>(): EntityId<TKind> {
  return uuidv7() as EntityId<TKind>;
}

export function newGameWorldId(): GameWorldId {
  return newEntityId<"GameWorld">();
}

export function parseGameWorldId(
  value: string,
): Result<GameWorldId, DomainError> {
  if (!validateUuid(value) || uuidVersion(value) !== 7) {
    return fail(
      new DomainError(
        "INVALID_GAME_WORLD_ID",
        "gameWorldId deve ser um UUIDv7 válido.",
        {
          value,
        },
      ),
    );
  }

  return succeed(value as GameWorldId);
}
