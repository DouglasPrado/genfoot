import { useMemo, useState } from "react";
import { ScrollView, View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { color, space, radius, fontSize, fontWeight } from "@/theme";
import { SQUAD_SEED, type PositionGroup } from "./squad-data";
import { PlayerCard } from "./player-card";

const GROUPS: (PositionGroup | "TODOS")[] = ["TODOS", "GOL", "DEF", "MEI", "ATA"];

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** Tela de Elenco: resumo do plantel, filtro por posição e titulares/reservas. */
export function Squad() {
  const vm = SQUAD_SEED;
  const [group, setGroup] = useState<PositionGroup | "TODOS">("TODOS");

  const filtered = useMemo(
    () => (group === "TODOS" ? vm.players : vm.players.filter((p) => p.group === group)),
    [group, vm.players],
  );
  const starters = filtered.filter((p) => p.starter);
  const bench = filtered.filter((p) => !p.starter);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>ELENCO</Text>
            <Text style={styles.subtitle}>{vm.club} · {vm.formation}</Text>
          </View>
        </View>

        <View style={styles.summary}>
          <SummaryStat label="MÉDIA OVR" value={String(vm.avgOvr)} />
          <View style={styles.divider} />
          <SummaryStat label="ELENCO" value={String(vm.players.length)} />
          <View style={styles.divider} />
          <SummaryStat label="VALOR" value={vm.squadValueLabel} />
          <View style={styles.divider} />
          <SummaryStat label="FOLHA" value={vm.wageBillLabel} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {GROUPS.map((g) => {
            const active = g === group;
            const count = g === "TODOS" ? vm.players.length : vm.players.filter((p) => p.group === g).length;
            return (
              <Pressable key={g} style={[styles.filter, active ? styles.filterActive : null]} onPress={() => setGroup(g)}>
                <Text style={[styles.filterText, active ? styles.filterTextActive : null]}>{g}</Text>
                <View style={[styles.badge, active ? styles.badgeActive : null]}>
                  <Text style={[styles.badgeText, active ? styles.badgeTextActive : null]}>{count}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {starters.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TITULARES</Text>
            <View style={styles.list}>
              {starters.map((p) => (
                <PlayerCard key={p.id} p={p} />
              ))}
            </View>
          </View>
        ) : null}

        {bench.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>RESERVAS</Text>
            <View style={styles.list}>
              {bench.map((p) => (
                <PlayerCard key={p.id} p={p} />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xl4 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: color.text, fontSize: fontSize.xl2, fontWeight: fontWeight.black as "800", fontStyle: "italic", letterSpacing: 0.5 },
  subtitle: { color: color.primary, fontSize: fontSize.xs, fontWeight: fontWeight.bold as "700", letterSpacing: 0.5, marginTop: -2 },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: color.surface,
    borderColor: color.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: space.md,
  },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { color: color.text, fontSize: fontSize.lg, fontWeight: fontWeight.black as "800", fontStyle: "italic" },
  statLabel: { color: color.textMuted, fontSize: 9, fontWeight: fontWeight.bold as "700", letterSpacing: 0.5 },
  divider: { width: 1, height: 28, backgroundColor: color.border },
  filters: { gap: space.sm, paddingRight: space.lg },
  filter: {
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
  filterActive: { borderColor: color.primary, backgroundColor: "#151c0e" },
  filterText: { color: color.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.bold as "700", letterSpacing: 0.5 },
  filterTextActive: { color: color.primary },
  badge: { backgroundColor: color.surfaceRaised, borderRadius: radius.pill, minWidth: 18, paddingHorizontal: 5, paddingVertical: 1, alignItems: "center" },
  badgeActive: { backgroundColor: color.primary },
  badgeText: { color: color.textMuted, fontSize: 9, fontWeight: fontWeight.bold as "700" },
  badgeTextActive: { color: color.primaryContrast },
  section: { gap: space.sm },
  sectionTitle: { color: color.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.black as "800", fontStyle: "italic", letterSpacing: 0.5 },
  list: { gap: space.sm },
});
