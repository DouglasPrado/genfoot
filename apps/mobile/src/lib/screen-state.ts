import {
  CommandTrackingStatus,
  type CommandTrackingStatus as CommandTrackingStatusValue,
} from "@grinta/core";

export type CanonicalScreenState =
  | "initial-loading"
  | "empty"
  | "partial-stale"
  | "offline"
  | "processing"
  | "success"
  | "domain-error"
  | "technical-error"
  | "forbidden"
  | "conflict"
  | "expired"
  | "maintenance";

export interface ScreenStateInput {
  readonly session: "connecting" | "online" | "offline";
  readonly query: "loading" | "ready" | "empty" | "error" | "offline";
  readonly hasCachedData?: boolean;
  readonly command?: CommandTrackingStatusValue;
  readonly blocked?: boolean;
  readonly domainError?: boolean;
  readonly conflict?: boolean;
  readonly expired?: boolean;
  readonly maintenance?: boolean;
}

/** Precedência única dos 12 estados obrigatórios em qualquer tela mobile. */
export function deriveScreenState(
  input: ScreenStateInput,
): CanonicalScreenState {
  if (input.maintenance === true) return "maintenance";
  if (input.session === "connecting" || input.query === "loading") {
    return "initial-loading";
  }
  if (input.session === "offline") {
    return input.hasCachedData === true ? "partial-stale" : "offline";
  }
  if (input.blocked === true) return "forbidden";
  if (input.expired === true) return "expired";
  if (input.conflict === true) return "conflict";
  if (
    input.command === CommandTrackingStatus.SUBMITTING ||
    input.command === CommandTrackingStatus.ACCEPTED ||
    input.command === CommandTrackingStatus.UNKNOWN_RECOVERING
  ) {
    return "processing";
  }
  if (
    input.command === CommandTrackingStatus.REJECTED &&
    input.domainError === true
  ) {
    return "domain-error";
  }
  if (input.query === "offline") return "offline";
  if (input.query === "empty") return "empty";
  if (input.query === "error") return "technical-error";
  return "success";
}
