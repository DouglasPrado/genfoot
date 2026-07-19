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

// `DEFAULT_WORLD_ID` morreu com a R-208.
//
// Era `process.env.EXPO_PUBLIC_WORLD_ID ?? "019f65eb-..."` — um mundo fixado no
// BUILD, com UUID hardcoded de fallback apontando para um mundo que havia muito
// não existia. Quando o mundo do env sumia do banco, o app consultava o fantasma
// em silêncio e a tela quebrava sem dizer por quê: o fallback silencioso que o
// §5 do CLAUDE.md proíbe.
//
// O mundo agora é ESCOLHA do jogador sobre a lista que a API serve, persistida
// em `lib/world-selection.tsx`. Sem escolha, `useWorldId()` devolve `null` e o
// app não consulta nada — a ausência leva à lista, não a um chute.

/** Clube controlado no mundo demo; a seleção persistida da conta terá precedência. */
export const MANAGED_CLUB_ID: string | null =
  process.env.EXPO_PUBLIC_CLUB_ID ?? null;
