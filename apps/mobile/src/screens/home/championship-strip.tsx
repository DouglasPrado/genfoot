import { View, Text, StyleSheet } from "react-native";
import { color, space, radius, fontSize, fontWeight } from "@/theme";
import type { HomeViewModel } from "./home-data";

/** Faixa de campeonato: fase, divisão/temporada, escudo de divisão e rank. */
export function ChampionshipStrip({ standing }: Pick<HomeViewModel, "standing">) {
  return (
    <View style={styles.root}>
      <View style={styles.left}>
        <Text style={styles.phase}>{standing.phase}</Text>
        <Text style={styles.sub}>
          DIVISÃO {standing.division} • TEMPORADA {standing.season}
        </Text>
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{standing.divisionBadge}</Text>
      </View>
      <View style={styles.rank}>
        <Text style={styles.rankLabel}>RANK</Text>
        <Text style={styles.rankValue}>{standing.rank}º</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: color.surface,
    borderColor: color.borderStrong,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
  },
  left: { flex: 1 },
  phase: {
    color: color.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    letterSpacing: 0.5,
  },
  sub: { color: color.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold as "600", marginTop: 2 },
  badge: {
    width: 38,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: color.primary,
    backgroundColor: color.backgroundElevated,
  },
  badgeText: {
    color: color.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  rank: { alignItems: "flex-end" },
  rankLabel: { color: color.textMuted, fontSize: 10, fontWeight: fontWeight.bold as "700", letterSpacing: 1 },
  rankValue: {
    color: color.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
});
