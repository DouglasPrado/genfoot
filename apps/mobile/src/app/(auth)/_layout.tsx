import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";

/**
 * Telas públicas de conta (entrar/cadastro/recuperar). Quem já tem sessão não
 * tem o que fazer aqui — volta ao app.
 */
export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  // `isLoaded` antes de `isSignedIn`: o Clerk leva um instante para restaurar a
  // sessão do cache, e decidir antes disso pisca a tela errada a cada abertura.
  if (!isLoaded) return null;
  if (isSignedIn) return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
