/**
 * Envio ao Expo Push API (https://exp.host/--/api/v2/push/send).
 *
 * Best-effort e à prova de falha: uma falha de rede/token NUNCA pode derrubar a
 * virada do dia — o push é acessório ao jogo. Erros são logados, não propagados.
 */
export interface ExpoPushMessage {
  readonly to: string;
  readonly title: string;
  readonly body: string;
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export async function sendExpoPush(
  messages: readonly ExpoPushMessage[],
): Promise<void> {
  if (messages.length === 0) return;
  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(messages),
    });
    if (!response.ok) {
      console.warn(
        `[push] Expo respondeu ${response.status} ao enviar ${messages.length} mensagem(ns).`,
      );
    }
  } catch (err) {
    console.warn(`[push] falha ao enviar ao Expo: ${String(err)}`);
  }
}
