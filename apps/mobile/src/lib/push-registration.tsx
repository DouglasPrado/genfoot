import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { submitTrackedCommand } from "@/lib/command-orchestrator";
import { useSession } from "@/lib/session";
import { useWorldId } from "@/lib/world";

/**
 * Registra o token de push (Expo) do device na conta logada, uma vez por sessão.
 * O servidor usa esse token para o push remoto (ex.: treino completo).
 *
 * Só roda em DEVICE físico (o simulador não recebe push remoto) e exige o
 * `projectId` do EAS na config. Falha é silenciosa e logada — nunca derruba o
 * app; sem push o jogo segue igual.
 */
function projectId(): string | null {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  return extra?.eas?.projectId ?? null;
}

async function registerToken(input: {
  readonly client: NonNullable<ReturnType<typeof useSession>["client"]>;
  readonly contractVersion: string;
  readonly worldId: string;
}): Promise<void> {
  if (!Device.isDevice) {
    console.log("[push] pulo: simulador não recebe push remoto.");
    return;
  }
  const id = projectId();
  if (id === null) {
    console.log("[push] pulo: sem projectId do EAS na config.");
    return;
  }

  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted;
  if (!granted && existing.canAskAgain) {
    const asked = await Notifications.requestPermissionsAsync();
    granted = asked.granted;
  }
  if (!granted) {
    console.log("[push] pulo: permissão de notificação negada.");
    return;
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId: id,
  });
  const platform = Platform.OS === "android" ? "android" : "ios";

  const result = await submitTrackedCommand(input.client, {
    clientContractVersion: "v1",
    serverContractVersion: input.contractVersion,
    commandType: "identity:register-push-token",
    worldId: input.worldId, // o handler ignora — o token é da conta, não do mundo
    payload: { expoPushToken: token, platform },
    idempotencyKey: `register-push-token:${token}`,
    correlationId: `mobile:push:${token}`,
  });
  console.log(`[push] registro do token: ${result.status}`);
}

/** Componente-gate: dispara o registro quando a sessão está pronta. Renderiza nada. */
export function PushRegistration(): null {
  const { session, client, contractVersion } = useSession();
  const worldId = useWorldId();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    if (
      session?.accountId == null ||
      client === null ||
      contractVersion === null ||
      worldId === null
    ) {
      return;
    }
    done.current = true;
    void registerToken({ client, contractVersion, worldId }).catch((err) => {
      done.current = false; // deixa tentar de novo numa próxima montagem
      console.log(`[push] falha ao registrar: ${String(err)}`);
    });
  }, [session?.accountId, client, contractVersion, worldId]);

  return null;
}
