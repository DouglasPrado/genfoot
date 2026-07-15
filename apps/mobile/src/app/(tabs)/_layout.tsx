import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { color, fontSize, fontWeight } from "@/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function tabIcon(name: IoniconName) {
  return ({ color: c, size }: { color: string; size: number }) => (
    <Ionicons name={name} size={size} color={c} />
  );
}

export default function TabsLayout() {
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
      <Tabs.Screen name="index" options={{ title: "INÍCIO", tabBarIcon: tabIcon("home") }} />
      <Tabs.Screen name="elenco" options={{ title: "ELENCO", tabBarIcon: tabIcon("people") }} />
      <Tabs.Screen name="partidas" options={{ title: "PARTIDAS", tabBarIcon: tabIcon("football") }} />
      <Tabs.Screen name="mercado" options={{ title: "MERCADO", tabBarIcon: tabIcon("cart") }} />
      <Tabs.Screen name="clube" options={{ title: "CLUBE", tabBarIcon: tabIcon("shield") }} />
    </Tabs>
  );
}
