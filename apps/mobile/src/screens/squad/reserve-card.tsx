import { View, Text, StyleSheet } from "react-native";
import { Icon, type IconName } from "@/components/icon";
import { PlayerAvatar } from "@/components/player-avatar";
import type { ClubCrestData } from "@/screens/club/customization/visual-identity";
import { color, space, radius, fontSize, fontWeight } from "@/theme";
import {
  compareStat,
  type PositionFit,
  type StatComparison,
} from "./substitution-model";
import type { SquadPlayer, PlayerForm } from "./squad-data";

const FORM: Record<PlayerForm, { icon: IconName; tint: string; label: string }> = {
  up: { icon: "trending-up", tint: color.success, label: "em alta" },
  steady: { icon: "remove", tint: color.textMuted, label: "estável" },
  down: { icon: "trending-down", tint: color.danger, label: "em baixa" },
};

const TREND_TINT: Record<StatComparison["trend"], string> = {
  up: color.success,
  steady: color.textMuted,
  down: color.danger,
};

const TREND_ICON: Record<StatComparison["trend"], IconName> = {
  up: "arrow-up",
  steady: "remove",
  down: "arrow-down",
};

/** Um atributo confrontado com o do titular: valor + delta (só quando elegível). */
function StatChip({
  label,
  cmp,
  showDelta,
}: {
  label: string;
  cmp: StatComparison;
  showDelta: boolean;
}) {
  const tint = TREND_TINT[cmp.trend];
  const signed = cmp.delta > 0 ? `+${cmp.delta}` : `${cmp.delta}`;
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{cmp.value}</Text>
      {showDelta && cmp.delta !== 0 ? (
        <View style={styles.deltaPill}>
          <Icon name={TREND_ICON[cmp.trend]} size={9} color={tint} />
          <Text style={[styles.deltaText, { color: tint }]}>{signed}</Text>
        </View>
      ) : showDelta ? (
        <Text style={styles.deltaEven}>=</Text>
      ) : null}
    </View>
  );
}

/**
 * Card de reserva na folha de substituição — orientado à DECISÃO: mostra o
 * atributo do reserva confrontado com o do titular que sai (delta OVR/fitness).
 * O delta só aparece quando a troca é elegível (mesma posição de origem); num
 * card bloqueado, comparar entre posições diferentes seria ruído.
 */
export function ReserveCard({
  p,
  outgoing,
  fit,
  crest,
}: {
  p: SquadPlayer;
  outgoing: SquadPlayer | undefined;
  fit: PositionFit;
  crest?: ClubCrestData | null;
}) {
  const eligible = fit !== "none";
  const form = FORM[p.form];
  const ovr = compareStat(p.ovr, outgoing?.ovr);
  const fitCmp = compareStat(p.fitness, outgoing?.fitness);
  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <View style={styles.number}>
          <Text style={styles.numberText}>{p.number}</Text>
        </View>
        <PlayerAvatar size={32} radius={16} crest={crest} style={styles.avatar} />
        <Text style={styles.name} numberOfLines={1}>
          {p.name}
        </Text>
        <View
          style={[
            styles.posBadge,
            fit === "adaptable" ? styles.posBadgeAdapt : null,
          ]}
        >
          <Text
            style={[
              styles.posText,
              fit === "adaptable" ? styles.posTextAdapt : null,
            ]}
          >
            {p.position}
          </Text>
        </View>
        {fit === "natural" ? (
          <View style={styles.enterBadge}>
            <Icon name="arrow-up" size={11} color={color.primaryContrast} />
            <Text style={styles.enterText}>ENTRA</Text>
          </View>
        ) : fit === "adaptable" ? (
          <View style={styles.adaptBadge}>
            <Icon name="swap-horizontal" size={10} color={color.warning} />
            <Text style={styles.adaptText}>ADAPTA</Text>
          </View>
        ) : (
          <View style={styles.blockedBadge}>
            <Icon name="warning" size={10} color={color.textMuted} />
            <Text style={styles.blockedText}>BLOQ.</Text>
          </View>
        )}
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.meta}>{p.age} anos</Text>
        <Text style={styles.dot}>•</Text>
        <Icon name={form.icon} size={11} color={form.tint} />
        <Text style={[styles.meta, { color: form.tint }]}>{form.label}</Text>
        <Text style={styles.dot}>•</Text>
        <Text style={styles.meta}>POT {p.pot}</Text>
      </View>

      <View style={styles.statsRow}>
        <StatChip label="OVR" cmp={ovr} showDelta={eligible} />
        <View style={styles.statDivider} />
        <StatChip label="FIT" cmp={fitCmp} showDelta={eligible} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: space.sm,
    backgroundColor: color.surface,
    borderColor: color.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  number: { width: 24, alignItems: "center" },
  numberText: {
    color: color.textMuted,
    fontSize: fontSize.md,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: color.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  posBadge: {
    borderWidth: 1,
    borderColor: color.primaryDim,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  posText: {
    color: color.primary,
    fontSize: 10,
    fontWeight: fontWeight.black as "800",
    letterSpacing: 0.5,
  },
  posBadgeAdapt: { borderColor: color.warning },
  posTextAdapt: { color: color.warning },
  adaptBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#2a2109",
    borderWidth: 1,
    borderColor: color.warning,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
  },
  adaptText: {
    color: color.warning,
    fontSize: 10,
    fontWeight: fontWeight.black as "800",
    letterSpacing: 0.5,
  },
  enterBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: color.primary,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
  },
  enterText: {
    color: color.primaryContrast,
    fontSize: 10,
    fontWeight: fontWeight.black as "800",
    letterSpacing: 0.5,
  },
  blockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: color.surfaceRaised,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
  },
  blockedText: {
    color: color.textMuted,
    fontSize: 10,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 0.5,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  meta: { color: color.textMuted, fontSize: 10 },
  dot: { color: color.textFaint, fontSize: 10 },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: color.background,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  stat: { flex: 1, flexDirection: "row", alignItems: "baseline", gap: 6 },
  statLabel: {
    color: color.textFaint,
    fontSize: 9,
    fontWeight: fontWeight.black as "800",
    letterSpacing: 0.5,
  },
  statValue: {
    color: color.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  deltaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  deltaText: { fontSize: 10, fontWeight: fontWeight.black as "800" },
  deltaEven: { color: color.textFaint, fontSize: 10, fontWeight: fontWeight.bold as "700" },
  statDivider: { width: 1, alignSelf: "stretch", backgroundColor: color.border },
});
