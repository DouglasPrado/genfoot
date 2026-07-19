/**
 * Presença (X-001, pré-requisito do executor). O sinal "o usuário está aqui
 * agora" ganha um lar em código — a pendência da reescrita ("presença precisa de
 * lar próprio"). É estado de PLATAFORMA em tempo real, não simulação: o relógio
 * é o de parede, carimbado na borda (como `finishedAt`), nunca no domínio.
 *
 * A derivação de AUSÊNCIA é pura e testável, e é o que o executor (fatia 1) lê:
 * um usuário está presente se foi visto dentro da janela de TTL.
 */

/** Quanto tempo sem heartbeat até considerar o usuário ausente. */
export const PRESENCE_TTL_SECONDS = 90;

/**
 * O usuário está presente? `lastSeenAt`/`now` em ISO (UTC). Sem `Date.now()` —
 * o `now` chega de fora. `null`/ausente = ausente.
 */
export function isPresent(
  lastSeenAtIso: string | null,
  nowIso: string,
  ttlSeconds: number = PRESENCE_TTL_SECONDS,
): boolean {
  if (lastSeenAtIso === null) return false;
  const last = Date.parse(lastSeenAtIso);
  const now = Date.parse(nowIso);
  if (Number.isNaN(last) || Number.isNaN(now)) return false;
  if (now < last) return true; // relógio recuou: trata como recém-visto
  return now - last <= ttlSeconds * 1000;
}
