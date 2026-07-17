import type { ConnectionStatus } from "@/lib/session";
import { isContractCompatible } from "./splash-model";

/**
 * Etapas reais do boot. Cada uma vira `done` quando o trabalho correspondente
 * de fato terminou — a barra mede progresso observado, não tempo decorrido.
 * Animar avanço sem saber de nada seria mentir para o jogador sobre o que o
 * app está fazendo.
 */
export interface BootInput {
  readonly status: ConnectionStatus;
  readonly serverContractVersion: string | null;
  readonly clientContractVersion: string;
  readonly accountLoaded: boolean;
  readonly signedIn: boolean;
  readonly identityResolved: boolean;
}

export interface BootStep {
  readonly key: "server" | "contract" | "account" | "world";
  readonly label: string;
  readonly done: boolean;
}

export function bootSteps(input: BootInput): readonly BootStep[] {
  const server = input.status === "online";
  const contract =
    server &&
    input.serverContractVersion !== null &&
    isContractCompatible(input.clientContractVersion, input.serverContractVersion);

  return [
    { key: "server", label: "Conectando ao servidor", done: server },
    { key: "contract", label: "Verificando versão do jogo", done: contract },
    {
      key: "account",
      label: "Identificando sua conta",
      done: input.accountLoaded && input.signedIn,
    },
    {
      key: "world",
      // Contrato incompatível trava aqui: sem ele não se lê o mundo.
      label: "Carregando o mundo",
      done: contract && input.identityResolved,
    },
  ];
}

/** Fração de etapas concluídas (0..1). */
export function bootProgress(steps: readonly BootStep[]): number {
  if (steps.length === 0) return 0;
  return steps.filter(({ done }) => done).length / steps.length;
}
