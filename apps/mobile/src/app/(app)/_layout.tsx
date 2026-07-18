import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";
import { color } from "@/theme";

/**
 * Área logada do app. Antes tinha barra inferior de abas (Início · Partidas ·
 * Clube); agora é um `Stack` sem menu — a navegação sai da Home, que virou o
 * lançador com cards destacáveis (Partidas e Clube). A guarda de sessão é a
 * mesma: sem conta Clerk, cai no login.
 */
export default function AppLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  // `isLoaded` antes de `isSignedIn` — decidir enquanto o Clerk restaura a
  // sessão do cache expulsaria quem já está logado a cada abertura.
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/entrar" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: color.background },
        animation: "fade",
      }}
    />
  );
}
