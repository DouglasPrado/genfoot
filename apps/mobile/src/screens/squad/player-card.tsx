import { View, Text, StyleSheet } from "react-native";
import { Icon, type IconName } from "@/components/icon";
import { ProgressBar } from "@/components/progress-bar";
import { color, space, radius, fontSize, fontWeight } from "@/theme";
import type { SquadPlayer, PlayerForm } from "./squad-data";

const FORM: Record<PlayerForm, { icon: IconName; tint: string }> = {
  up: { icon: "trending-up", tint: color.success },
  steady: { icon: "remove", tint: color.textMuted },
  down: { icon: "trending-down", tint: color.danger },
};

function fitnessTint(v: number): string {
  return v >= 85 ? color.success : v >= 65 ? color.warning : color.danger;
}

/** Linha de jogador do elenco: número, nome/posição, OVR, forma, fitness. */
export function PlayerCard({ p }: { p: SquadPlayer }) {
  const form = FORM[p.form];
  return (
    <View style={styles.root}>
      <View style={styles.number}>
        <Text style={styles.numberText}>{p.number}</Text>
      </View>
      <View style={styles.avatar}>
        <Icon name="person" size={18} color={color.textMuted} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.pos}>{p.position}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.meta}>{p.age} anos</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.meta}>{p.contractYears}a contrato</Text>
        </View>
        <View style={styles.fitnessRow}>
          <Icon name="pulse" size={11} color={fitnessTint(p.fitness)} />
          <View style={styles.fitnessBar}>
            <ProgressBar value={p.fitness / 100} tint={fitnessTint(p.fitness)} height={4} />
          </View>
          <Text style={styles.fitnessPct}>{p.fitness}%</Text>
        </View>
      </View>
      <View style={styles.right}>
        <View style={styles.ovrBox}>
          <Text style={styles.ovr}>{p.ovr}</Text>
          <Text style={styles.pot}>{p.pot}</Text>
        </View>
        <Icon name={form.icon} size={16} color={form.tint} />
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
    borderColor: color.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
  },
  number: {
    width: 28,
    alignItems: "center",
  },
  numberText: { color: color.textMuted, fontSize: fontSize.lg, fontWeight: fontWeight.black as "800", fontStyle: "italic" },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: color.surfaceRaised, alignItems: "center", justifyContent: "center" },
  info: { flex: 1, gap: 2 },
  name: { color: color.text, fontSize: fontSize.sm, fontWeight: fontWeight.bold as "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  pos: { color: color.primary, fontSize: fontSize.xs, fontWeight: fontWeight.bold as "700" },
  dot: { color: color.textFaint, fontSize: 10 },
  meta: { color: color.textMuted, fontSize: 10 },
  fitnessRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  fitnessBar: { flex: 1, maxWidth: 90 },
  fitnessPct: { color: color.textMuted, fontSize: 9, fontWeight: fontWeight.semibold as "600" },
  right: { alignItems: "center", gap: 3 },
  ovrBox: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
    borderWidth: 1,
    borderColor: color.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  ovr: { color: color.text, fontSize: fontSize.md, fontWeight: fontWeight.black as "800", fontStyle: "italic" },
  pot: { color: color.primaryDim, fontSize: 10, fontWeight: fontWeight.bold as "700" },
});
