import type { ConnectionStatus } from "@/lib/session";

/**
 * Decisão do M-SPLASH (MF-00): checar contrato e rotear. O cliente é
 * não-autoritativo — o splash nunca simula sessão nem entra no app com
 * contrato incompatível.
 */
export type SplashDecision =
  | { readonly kind: "loading" }
  | {
      readonly kind: "upgrade-required";
      readonly client: string;
      readonly server: string;
    }
  | { readonly kind: "network-error" }
  | { readonly kind: "route"; readonly to: "/onboarding" | "/inicio" };

export interface SplashInput {
  readonly status: ConnectionStatus;
  /** `contractVersion` do `/health`; null enquanto não respondeu. */
  readonly serverContractVersion: string | null;
  readonly clientContractVersion: string;
  /** null enquanto a projeção de identidade não resolveu. */
  readonly hasActiveControl: boolean | null;
  /** A projeção de identidade falhou (erro/offline), mesmo com sessão aberta. */
  readonly identityFailed?: boolean;
}

const VERSION_PATTERN = /^v(\d+)$/;

/** Major de uma versão de contrato (`v1` → 1); null se irreconhecível. */
export function contractMajor(version: string): number | null {
  const match = VERSION_PATTERN.exec(version);
  if (match === null) return null;
  return Number.parseInt(match[1], 10);
}

/**
 * Major diferente é `BREAKING` (doc 08 §versionamento). Versão irreconhecível
 * falha fechado: sem prova de compatibilidade, não é compatível.
 */
export function isContractCompatible(client: string, server: string): boolean {
  const clientMajor = contractMajor(client);
  const serverMajor = contractMajor(server);
  if (clientMajor === null || serverMajor === null) return false;
  return clientMajor === serverMajor;
}

/**
 * Rótulo do indicador de conexão. Deriva da decisão, não do status cru da
 * sessão: se a sessão abriu e a rede caiu depois, o status continua "online" e
 * o rodapé se contradiria com o painel de erro.
 */
export function connectionLabel(
  status: ConnectionStatus,
  decision: SplashDecision,
): string {
  if (decision.kind === "network-error") return "SEM CONEXÃO";
  if (status === "connecting") return "CONECTANDO";
  if (status === "offline") return "SEM CONEXÃO";
  return "CONECTADO";
}

export function deriveSplashDecision(input: SplashInput): SplashDecision {
  const {
    status,
    serverContractVersion,
    clientContractVersion,
    hasActiveControl,
    identityFailed = false,
  } = input;

  if (status === "offline") return { kind: "network-error" };
  if (status === "connecting") return { kind: "loading" };
  if (serverContractVersion === null) return { kind: "loading" };

  // O contrato vem antes da identidade: se é BREAKING, a falha de identidade é
  // consequência provável e "atualize o app" é a mensagem correta.
  if (!isContractCompatible(clientContractVersion, serverContractVersion)) {
    return {
      kind: "upgrade-required",
      client: clientContractVersion,
      server: serverContractVersion,
    };
  }

  if (identityFailed) return { kind: "network-error" };
  if (hasActiveControl === null) return { kind: "loading" };
  return {
    kind: "route",
    to: hasActiveControl ? "/inicio" : "/onboarding",
  };
}
