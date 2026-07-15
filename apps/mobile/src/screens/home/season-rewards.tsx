import { View, Text, Pressable, StyleSheet } from "react-native";
import { Icon, type IconName } from "@/components/icon";
import { Card } from "@/components/card";
import { color, space, radius, fontSize, fontWeight, formatAmount } from "@/theme";
import type { HomeViewModel } from "./home-data";

function Sparkline({ points }: { points: readonly number[] }) {
  return (
    <View style={styles.spark}>
      {points.map((p, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: Math.max(3, p * 34),
            backgroundColor: color.primary,
            opacity: 0.35 + p * 0.65,
            borderRadius: 2,
          }}
        />
      ))}
    </View>
  );
}

/** Linha final: card de Temporada (sparkline) + Caixa de recompensas. */
export function SeasonRewards({
  season,
  rewardBox,
  onOpenBox,
}: Pick<HomeViewModel, "season" | "rewardBox"> & { onOpenBox?: () => void }) {
  return (
    <View style={styles.row}>
      <Card style={styles.half}>
        <Text style={styles.title}>TEMPORADA</Text>
        <View style={styles.divisionRow}>
          <Text style={styles.divisionLabel}>DIVISÃO {season.division}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{season.division}</Text>
          </View>
        </View>
        <Text style={styles.pointsLabel}>PONTOS</Text>
        <Text style={styles.points}>{formatAmount(season.points)}</Text>
        <Sparkline points={season.trend} />
        <View style={styles.rankingRow}>
          <Text style={styles.rankingLabel}>RANKING</Text>
          <Text style={styles.rankingValue}>{season.rank}º</Text>
        </View>
      </Card>

      <Card style={styles.half}>
        <Text style={styles.title}>CAIXA DE{"\n"}RECOMPENSAS</Text>
        <Text style={styles.pointsLabel}>PRÓXIMA EM</Text>
        <Text style={styles.timer}>{rewardBox.nextInLabel}</Text>
        <View style={styles.chestWrap}>
          <Icon name="cube" size={44} color={color.primary} />
        </View>
        <Pressable style={styles.openBtn} onPress={onOpenBox} accessibilityRole="button">
          <Text style={styles.openText}>ABRIR AGORA</Text>
          <Icon name="diamond" size={12} color={color.gem} />
          <Text style={styles.openCost}>{rewardBox.openCost.amount}</Text>
        </Pressable>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.md },
  half: { flex: 1, gap: space.xs },
  title: {
    color: color.primary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    letterSpacing: 0.5,
  },
  divisionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  divisionLabel: { color: color.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold as "600" },
  badge: {
    width: 28,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: color.primary,
  },
  badgeText: { color: color.primary, fontSize: fontSize.md, fontWeight: fontWeight.black as "800", fontStyle: "italic" },
  pointsLabel: { color: color.textMuted, fontSize: 10, fontWeight: fontWeight.bold as "700", letterSpacing: 1, marginTop: space.xs },
  points: { color: color.text, fontSize: fontSize.xl, fontWeight: fontWeight.black as "800", fontStyle: "italic" },
  spark: { flexDirection: "row", alignItems: "flex-end", gap: 2, height: 34, marginTop: space.xs },
  rankingRow: { flexDirection: "row", justifyContent: "space-between", marginTop: space.xs },
  rankingLabel: { color: color.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold as "600" },
  rankingValue: { color: color.text, fontSize: fontSize.sm, fontWeight: fontWeight.bold as "700" },
  timer: { color: color.text, fontSize: fontSize.lg, fontWeight: fontWeight.black as "800", fontStyle: "italic" },
  chestWrap: { alignItems: "center", justifyContent: "center", paddingVertical: space.sm },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1.5,
    borderColor: color.primary,
    borderRadius: radius.sm,
    paddingVertical: space.sm,
  },
  openText: { color: color.primary, fontSize: fontSize.xs, fontWeight: fontWeight.black as "800", fontStyle: "italic", letterSpacing: 0.5 },
  openCost: { color: color.text, fontSize: fontSize.xs, fontWeight: fontWeight.bold as "700" },
});
