import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, SectionHeader } from "@/components/card";
import { ProgressBar } from "@/components/progress-bar";
import { color, space, radius, fontSize, fontWeight, formatAmount } from "@/theme";
import type { HomeViewModel } from "./home-data";

const MISSION_ICON: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  walk: "walk",
  star: "star",
  eye: "eye",
};

const REWARD_TINT = { coin: color.coin, gem: color.gem, energy: color.energy };
const REWARD_ICON = { coin: "logo-usd", gem: "diamond", energy: "flash" } as const;

/** Lista de missões diárias com progresso e recompensa. */
export function DailyMissions({ missions }: Pick<HomeViewModel, "missions">) {
  return (
    <Card>
      <SectionHeader
        title="MISSÕES DIÁRIAS"
        trailing={
          <Text style={styles.counter}>
            {missions.completed}/{missions.total} CONCLUÍDAS
          </Text>
        }
      />
      <View style={styles.list}>
        {missions.items.map((m) => (
          <View key={m.id} style={styles.row}>
            <View style={styles.iconWrap}>
              <Ionicons name={MISSION_ICON[m.icon] ?? "ellipse"} size={18} color={color.primary} />
            </View>
            <View style={styles.body}>
              <Text style={styles.label} numberOfLines={1}>
                {m.label}
              </Text>
              <View style={styles.progressRow}>
                <View style={styles.bar}>
                  <ProgressBar value={m.progress / m.goal} height={5} />
                </View>
                <Text style={styles.frac}>
                  {m.progress}/{m.goal}
                </Text>
              </View>
            </View>
            <View style={styles.reward}>
              <Ionicons name={REWARD_ICON[m.reward.currency]} size={12} color={REWARD_TINT[m.reward.currency]} />
              <Text style={styles.rewardAmount}>{formatAmount(m.reward.amount)}</Text>
              {m.done ? (
                <Ionicons name="checkmark-circle" size={18} color={color.success} />
              ) : (
                <Ionicons name="chevron-forward" size={16} color={color.textMuted} />
              )}
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  counter: { color: color.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.bold as "700" },
  list: { gap: space.md },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: color.primaryDim,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: space.xs },
  label: { color: color.text, fontSize: fontSize.sm, fontWeight: fontWeight.bold as "700" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  bar: { flex: 1 },
  frac: { color: color.textMuted, fontSize: 10, fontWeight: fontWeight.semibold as "600", minWidth: 26 },
  reward: { flexDirection: "row", alignItems: "center", gap: 4 },
  rewardAmount: { color: color.text, fontSize: fontSize.xs, fontWeight: fontWeight.bold as "700" },
});
