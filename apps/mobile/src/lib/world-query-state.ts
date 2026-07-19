import type { QueryState } from "@/lib/world";

/** Converte falhas conhecidas da API em estados exibíveis pela consulta. */
export function queryStateForApiError(
  errorCode: string,
  hasCachedData: boolean,
): QueryState {
  // Um mundo inexistente nunca ficará disponível por aguardar/refazer a mesma
  // leitura. Tratá-lo como projeção vazia prende o onboarding em "Carregando".
  if (errorCode === "WORLD_NOT_FOUND") return "error";
  if (/NOT_FOUND/.test(errorCode)) return "empty";
  return hasCachedData ? "offline" : "error";
}
