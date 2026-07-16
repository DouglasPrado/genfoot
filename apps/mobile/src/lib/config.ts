import { Platform } from "react-native";

/**
 * Base URL da API oficial (`/api/v1`). Configurável via
 * EXPO_PUBLIC_API_URL. No emulador Android, `localhost` aponta para o próprio
 * device — usa-se 10.0.2.2 para alcançar o host. iOS/web usam localhost.
 */
export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === "android"
    ? "http://10.0.2.2:3000"
    : "http://localhost:3000");

/**
 * Sujeito/credencial de desenvolvimento. Em produção a sessão vem de um fluxo
 * de login real; aqui, para iterar visual, abre-se uma sessão de dev.
 */
export const DEV_SUBJECT = "mobile-dev-player";

/**
 * Mundo padrão consultado pelo app. Configurável via EXPO_PUBLIC_WORLD_ID.
 * O default aponta para o mundo demo semeado localmente (create → genesis →
 * activate; ver apps/api/scripts/seed-demo-world.mjs). Quando o mundo não
 * existe/está indisponível, as telas caem no estado apropriado (sem dado vivo).
 */
export const DEFAULT_WORLD_ID: string =
  process.env.EXPO_PUBLIC_WORLD_ID ?? "019f65eb-9ba4-707d-aa7c-426ceb5ea41b";

/** Clube controlado no mundo demo; a seleção persistida da conta terá precedência. */
export const MANAGED_CLUB_ID: string | null =
  process.env.EXPO_PUBLIC_CLUB_ID ?? null;
