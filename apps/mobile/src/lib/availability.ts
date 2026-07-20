/**
 * A FLAG de indisponibilidade que aparece ao lado do nome do jogador na
 * listagem padrão (elenco, treino). Diferente do `availabilityBadge` (rótulo
 * completo de status): esta é o selo compacto para o que TIRA o jogador de
 * campo por lesão ou suspensão — as duas coisas que o técnico precisa ver de
 * relance na lista.
 *
 * Lógica pura, testável, sem React: mapeia o enum `PlayerAvailability` do
 * domínio para rótulo/ícone/tom. `UNAVAILABLE` (em sessão de treino) e
 * `CONVENED` (convocado) NÃO são flag aqui — não são lesão nem suspensão, e o
 * usuário pediu só essas duas. `AVAILABLE` e qualquer valor desconhecido não
 * rendem selo (jogador apto não precisa de marca).
 */
export type AvailabilityFlagTone = "danger" | "warn";

export interface AvailabilityFlagInfo {
  readonly availability: "INJURED" | "SUSPENDED";
  /** Rótulo por extenso (acessibilidade / tooltip). */
  readonly label: string;
  /** Rótulo curto para o selo na linha. */
  readonly short: string;
  /** Nome de ícone (IconName do app). */
  readonly icon: "medkit" | "warning";
  readonly tone: AvailabilityFlagTone;
}

export function availabilityFlag(
  availability: string,
): AvailabilityFlagInfo | null {
  switch (availability) {
    case "INJURED":
      return {
        availability: "INJURED",
        label: "Lesionado",
        short: "LESÃO",
        icon: "medkit",
        tone: "danger",
      };
    case "SUSPENDED":
      return {
        availability: "SUSPENDED",
        label: "Suspenso",
        short: "SUSP.",
        icon: "warning",
        tone: "warn",
      };
    default:
      return null;
  }
}
