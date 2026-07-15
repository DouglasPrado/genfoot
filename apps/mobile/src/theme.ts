/**
 * Tema do app mobile. Reexporta os tokens framework-agnósticos do
 * @grinta/design-system (mesma fonte da verdade que o admin/web) e adiciona
 * apenas o que é específico de React Native (sombras, tipografia display).
 */
import { color, space, radius, fontSize, fontWeight } from "@grinta/design-system";

export { color, space, radius, fontSize, fontWeight };

/** Estilo do título "display" (bold itálico uppercase, estilo eFootball). */
export const display = {
  fontWeight: fontWeight.black as "800",
  fontStyle: "italic" as const,
  letterSpacing: 0.5,
  color: color.text,
};

/** Sombra elevada para cards sobre o fundo quase-preto. */
export const elevation = {
  shadowColor: "#000000",
  shadowOpacity: 0.4,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
};

/** Formata inteiros grandes com separador de milhar pt-BR (45680 → "45.680"). */
export function formatAmount(value: number): string {
  return value.toLocaleString("pt-BR");
}
