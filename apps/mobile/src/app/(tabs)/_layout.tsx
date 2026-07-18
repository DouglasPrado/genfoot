import { useAuth } from "@clerk/expo";
import { Redirect, Tabs } from "expo-router";
import { Icon, type IconName } from "@/components/icon";
import { color, fontSize, fontWeight } from "@/theme";

type IoniconName = IconName;

function tabIcon(name: IoniconName) {
  return ({ color: c, size }: { color: string; size: number }) => (
    <Icon name={name} size={size} color={c} />
  );
}

export default function TabsLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  // Guard do app: sair da conta em qualquer aba cai aqui e leva ao login, sem
  // cada tela precisar navegar por conta própria. `isLoaded` antes de
  // `isSignedIn` — decidir enquanto o Clerk restaura a sessão do cache
  // expulsaria quem já está logado a cada abertura.
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/entrar" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.primary,
        tabBarInactiveTintColor: color.textMuted,
        tabBarStyle: {
          backgroundColor: color.backgroundElevated,
          borderTopColor: color.border,
          borderTopWidth: 1,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
          fontWeight: fontWeight.bold as "700",
          letterSpacing: 0.5,
        },
      }}
    >
      <Tabs.Screen name="inicio" options={{ title: "INÍCIO", tabBarIcon: tabIcon("home") }} />
      <Tabs.Screen name="partidas" options={{ title: "PARTIDAS", tabBarIcon: tabIcon("trophy") }} />
      <Tabs.Screen name="mercado" options={{ title: "MERCADO", tabBarIcon: tabIcon("transfer") }} />
      <Tabs.Screen name="clube" options={{ title: "CLUBE", tabBarIcon: tabIcon("shield") }} />
    </Tabs>
  );
}
