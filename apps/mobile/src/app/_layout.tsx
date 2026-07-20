import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "@/components/toast";
import { SessionProvider } from "@/lib/session";
import { WorldSelectionProvider } from "@/lib/world-selection";
import { color } from "@/theme";

/**
 * Chave pública do Clerk (R-85: identidade externa OIDC). Vem do .env.local e
 * é embutida no bundle por ser `EXPO_PUBLIC_` — é pública por desenho. A secret
 * key NUNCA entra no cliente: a API verifica o token com a chave pública.
 */
function requirePublishableKey(): string {
  const key = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (key === undefined || key === "") {
    throw new Error(
      "Defina EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY em apps/mobile/.env.local.",
    );
  }
  return key;
}

const publishableKey = requirePublishableKey();

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <SafeAreaProvider>
        <SessionProvider>
          <WorldSelectionProvider>
            <ToastProvider>
              <StatusBar style="light" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: color.background },
                  animation: "fade",
                }}
              />
            </ToastProvider>
          </WorldSelectionProvider>
        </SessionProvider>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
