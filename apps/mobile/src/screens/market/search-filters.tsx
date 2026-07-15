import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, space, radius, fontSize, fontWeight } from "@/theme";
import type { MarketViewModel } from "./market-data";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const FILTERS = [
  { label: "POSIÇÃO", value: "TODAS" },
  { label: "IDADE", value: "TODAS" },
  { label: "VALOR", value: "TODOS" },
  { label: "FAIXA", value: "TODAS" },
  { label: "ORDENAR POR", value: "RELEVÂNCIA" },
];

function SegTab({ label, icon, active, onPress }: { label: string; icon: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.tab, active ? styles.tabActive : null]} onPress={onPress} accessibilityRole="button">
      <Ionicons name={icon as IoniconName} size={14} color={active ? color.primary : color.textMuted} />
      <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

/** Busca, abas de listas, dropdowns de filtro e camadas do mercado. */
export function SearchFilters({
  tabs,
  activeTab,
  onTab,
  layers,
  activeLayer,
  onLayer,
}: {
  tabs: MarketViewModel["tabs"];
  activeTab: string;
  onTab: (id: string) => void;
  layers: MarketViewModel["layers"];
  activeLayer: string;
  onLayer: (id: string) => void;
}) {
  return (
    <View style={styles.root}>
      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Ionicons name="search" size={16} color={color.textMuted} />
          <TextInput
            placeholder="Buscar por jogador, posição ou clube…"
            placeholderTextColor={color.textFaint}
            style={styles.searchInput}
          />
        </View>
        <Pressable style={styles.filterBtn} accessibilityRole="button">
          <Ionicons name="options" size={18} color={color.text} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
        {tabs.map((t) => (
          <SegTab key={t.id} label={t.label} icon={t.icon} active={t.id === activeTab} onPress={() => onTab(t.id)} />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
        {FILTERS.map((f) => (
          <View key={f.label} style={styles.filterChip}>
            <View>
              <Text style={styles.filterLabel}>{f.label}</Text>
              <Text style={styles.filterValue}>{f.value}</Text>
            </View>
            <Ionicons name="chevron-down" size={14} color={color.textMuted} />
          </View>
        ))}
      </ScrollView>

      <Text style={styles.layersHeading}>CAMADAS DO MERCADO</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
        {layers.map((l) => (
          <SegTab key={l.id} label={l.label} icon={l.icon} active={l.id === activeLayer} onPress={() => onLayer(l.id)} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md },
  searchRow: { flexDirection: "row", gap: space.sm },
  search: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: color.surface,
    borderColor: color.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    height: 44,
  },
  searchInput: { flex: 1, color: color.text, fontSize: fontSize.sm, padding: 0 },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: color.surface,
    borderColor: color.border,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabsRow: { gap: space.sm, paddingRight: space.lg },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: color.surface,
  },
  tabActive: { borderColor: color.primary, backgroundColor: "#151c0e" },
  tabText: { color: color.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.bold as "700", letterSpacing: 0.3 },
  tabTextActive: { color: color.primary },
  filtersRow: { gap: space.sm, paddingRight: space.lg },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: color.backgroundElevated,
  },
  filterLabel: { color: color.textMuted, fontSize: 9, fontWeight: fontWeight.bold as "700", letterSpacing: 0.5 },
  filterValue: { color: color.text, fontSize: fontSize.xs, fontWeight: fontWeight.bold as "700" },
  layersHeading: { color: color.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.black as "800", letterSpacing: 0.5, fontStyle: "italic" },
});
