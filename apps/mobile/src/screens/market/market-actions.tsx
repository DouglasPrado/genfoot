import { View, Text, Pressable, StyleSheet } from "react-native";
import { Icon, type IconName } from "@/components/icon";
import { color, space, radius, fontSize, fontWeight } from "@/theme";

type IoniconName = IconName;

const ACTIONS: { id: string; icon: IoniconName; title: string; sub: string }[] = [
  { id: "relatorio", icon: "document-text", title: "RELATÓRIO DE MERCADO", sub: "Necessidades, oportunidades e contratos vencendo" },
  { id: "scouting", icon: "search-circle", title: "SCOUTING", sub: "Descobrir novos jogadores" },
  { id: "estrategia", icon: "git-network", title: "ESTRATÉGIA", sub: "Defina sua política de contratações" },
  { id: "filtros", icon: "bookmark", title: "FILTROS SALVOS", sub: "Gerencie seus filtros" },
];

/** Grade 2×2 de atalhos operacionais do mercado. */
export function MarketActions({ onAction }: { onAction?: (id: string) => void }) {
  return (
    <View style={styles.grid}>
      {ACTIONS.map((a) => (
        <Pressable key={a.id} style={styles.card} onPress={() => onAction?.(a.id)} accessibilityRole="button">
          <Icon name={a.icon} size={20} color={color.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{a.title}</Text>
            <Text style={styles.sub} numberOfLines={2}>{a.sub}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  card: {
    width: "48%",
    flexGrow: 1,
    flexDirection: "row",
    gap: space.sm,
    backgroundColor: color.surface,
    borderColor: color.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
  },
  title: { color: color.text, fontSize: 10, fontWeight: fontWeight.black as "800", fontStyle: "italic", letterSpacing: 0.3 },
  sub: { color: color.textMuted, fontSize: 9, lineHeight: 12, marginTop: 2 },
});
