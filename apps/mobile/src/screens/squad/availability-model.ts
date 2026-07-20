/**
 * Por que um jogador do campo NÃO pode entrar em campo (M-LINEUP, "estados").
 *
 * Lê `PlayerAvailability` do domínio (`packages/core/src/players/
 * player-lifecycle-types.ts`) e devolve o que o token do campo mostra. Só isso —
 * a decisão de bloquear a escalação é do servidor; aqui é aviso visual.
 */
export type LineupBlockKind = "medical" | "suspended" | "convened" | "training";

export interface LineupBlock {
  readonly kind: LineupBlockKind;
  /** Rótulo curto pro selo no token (cabe em ~10 caracteres). */
  readonly label: string;
  /** Frase completa pro leitor de tela e pra folha de substituição. */
  readonly reason: string;
}

/**
 * O impedimento de um jogador, ou `null` quando ele pode jogar.
 *
 * **`UNAVAILABLE` não é médico.** No domínio ele é o jogador em sessão de
 * treino (`Player.beginTraining`, `player.ts:328`) — sai sozinho quando a
 * sessão fecha. Tratá-lo como lesão poria em recuperação quem só está treinando,
 * o mesmo cuidado que `training-plan-model.ts` já toma ao restringir carga.
 *
 * Lesão e recuperação médica compartilham `INJURED`: o domínio mantém essa
 * disponibilidade da abertura do caso médico até `PlayerCleared`, então
 * "lesionado" e "em recuperação" são o mesmo estado visto de fora.
 */
export function lineupBlock(availability: string): LineupBlock | null {
  switch (availability) {
    case "INJURED":
      return {
        kind: "medical",
        label: "LESÃO",
        reason: "Lesionado ou em recuperação médica — não pode jogar.",
      };
    case "SUSPENDED":
      return {
        kind: "suspended",
        label: "SUSP.",
        reason: "Suspenso — não pode jogar esta partida.",
      };
    case "CONVENED":
      return {
        kind: "convened",
        label: "CONV.",
        reason: "Convocado pela seleção — indisponível ao clube.",
      };
    case "UNAVAILABLE":
      return {
        kind: "training",
        label: "TREINO",
        reason: "Em sessão de treino — volta ao fim da sessão.",
      };
    case "AVAILABLE":
    default:
      return null;
  }
}

/** É impedimento do departamento médico (lesão/recuperação)? Pinta de amarelo. */
export function isMedicalBlock(block: LineupBlock | null): boolean {
  return block?.kind === "medical";
}
