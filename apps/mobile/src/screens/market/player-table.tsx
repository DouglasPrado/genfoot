import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Icon, type IconName } from "@/components/icon";
import { color, space, radius, fontSize, fontWeight } from "@/theme";
import type { MarketPlayer, Confidence, ExitRisk } from "./market-data";

const COL = { player: 150, pos: 64, ovr: 92, value: 84, wage: 78, contract: 68, interest: 66, risk: 78 };

const CONF_TINT: Record<Confidence, string> = { low: color.danger, medium: color.warning, high: color.success };
const CONF_FILLED: Record<Confidence, number> = { low: 1, medium: 2, high: 4 };
const CONF_LABEL: Record<Confidence, string> = { low: "Conf. baixa", medium: "Conf. média", high: "Conf. alta" };
const RISK_TINT: Record<ExitRisk, string> = { low: color.success, medium: color.warning, high: color.danger };
const RISK_LABEL: Record<ExitRisk, string> = { low: "BAIXO", medium: "MÉDIO", high: "ALTO" };

function ConfidenceBars({ confidence }: { confidence: Confidence }) {
  const filled = CONF_FILLED[confidence];
  return (
    <View style={styles.confBars}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={[styles.confBar, { backgroundColor: i < filled ? CONF_TINT[confidence] : color.surfaceRaised }]} />
      ))}
    </View>
  );
}

function HeaderCell({ label, width, align = "flex-start" }: { label: string; width: number; align?: "flex-start" | "center" | "flex-end" }) {
  return (
    <View style={[styles.headerCell, { width, alignItems: align }]}>
      <Text style={styles.headerText}>{label}</Text>
    </View>
  );
}

function Row({ p }: { p: MarketPlayer }) {
  return (
    <View style={styles.row}>
      <View style={[styles.cell, { width: COL.player, flexDirection: "row", alignItems: "center", gap: space.sm }]}>
        <Pressable hitSlop={4} accessibilityRole="button">
          <Icon name="star-outline" size={16} color={color.textMuted} />
        </Pressable>
        <View style={styles.avatar}>
          <Icon name="person" size={16} color={color.textMuted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
          <Text style={styles.club} numberOfLines={1}>{p.club}</Text>
        </View>
      </View>

      <View style={[styles.cell, { width: COL.pos, alignItems: "center" }]}>
        <Text style={styles.posText}>{p.position}</Text>
        <Text style={styles.ageText}>{p.age} anos</Text>
        {p.u21 ? <View style={styles.u21}><Text style={styles.u21Text}>Sub-21</Text></View> : null}
      </View>

      <View style={[styles.cell, { width: COL.ovr, alignItems: "center" }]}>
        <View style={styles.ovrBox}>
          <Text style={styles.ovrText}>{p.ovr} – {p.pot}</Text>
        </View>
        <Text style={styles.confLabel}>{CONF_LABEL[p.confidence]}</Text>
        <ConfidenceBars confidence={p.confidence} />
      </View>

      <View style={[styles.cell, { width: COL.value, alignItems: "center" }]}>
        <Text style={styles.value}>{p.valueLabel}</Text>
        <Text style={[styles.trend, { color: p.valueTrendPct >= 0 ? color.danger : color.success }]}>
          ({p.valueTrendPct >= 0 ? "+" : ""}{p.valueTrendPct}%)
        </Text>
      </View>

      <View style={[styles.cell, { width: COL.wage, alignItems: "center" }]}>
        <Text style={styles.plain}>{p.wageLabel}</Text>
      </View>
      <View style={[styles.cell, { width: COL.contract, alignItems: "center" }]}>
        <Text style={styles.plain}>{p.contractLabel}</Text>
      </View>
      <View style={[styles.cell, { width: COL.interest, alignItems: "center" }]}>
        <Text style={styles.interest}>+{p.clubInterest}</Text>
      </View>
      <View style={[styles.cell, { width: COL.risk, alignItems: "center" }]}>
        <Text style={[styles.riskLabel, { color: RISK_TINT[p.exitRisk] }]}>{RISK_LABEL[p.exitRisk]}</Text>
        <Text style={[styles.riskPct, { color: RISK_TINT[p.exitRisk] }]}>{p.exitRiskPct}%</Text>
      </View>
    </View>
  );
}

/** Tabela de jogadores do mercado (scroll horizontal). */
export function PlayerTable({ players }: { players: readonly MarketPlayer[] }) {
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.headerRow}>
            <HeaderCell label="JOGADOR" width={COL.player} />
            <HeaderCell label="POS / IDADE" width={COL.pos} align="center" />
            <HeaderCell label="OVR / POT" width={COL.ovr} align="center" />
            <HeaderCell label="VALOR" width={COL.value} align="center" />
            <HeaderCell label="SALÁRIO" width={COL.wage} align="center" />
            <HeaderCell label="CONTRATO" width={COL.contract} align="center" />
            <HeaderCell label="INTERESSE" width={COL.interest} align="center" />
            <HeaderCell label="RISCO" width={COL.risk} align="center" />
          </View>
          {players.map((p) => (
            <Row key={p.id} p={p} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: color.surface,
    borderColor: color.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  headerRow: { flexDirection: "row", backgroundColor: color.backgroundElevated, paddingVertical: space.sm, paddingHorizontal: space.sm },
  headerCell: { justifyContent: "center", paddingHorizontal: 4 },
  headerText: { color: color.textMuted, fontSize: 9, fontWeight: fontWeight.bold as "700", letterSpacing: 0.4 },
  row: { flexDirection: "row", borderTopWidth: 1, borderTopColor: color.border, paddingVertical: space.md, paddingHorizontal: space.sm },
  cell: { justifyContent: "center", paddingHorizontal: 4, gap: 2 },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: color.surfaceRaised, alignItems: "center", justifyContent: "center" },
  name: { color: color.text, fontSize: fontSize.xs, fontWeight: fontWeight.bold as "700" },
  club: { color: color.textMuted, fontSize: 9 },
  posText: { color: color.text, fontSize: fontSize.xs, fontWeight: fontWeight.bold as "700" },
  ageText: { color: color.textMuted, fontSize: 9 },
  u21: { backgroundColor: color.surfaceRaised, borderRadius: radius.sm, paddingHorizontal: 4, paddingVertical: 1, marginTop: 1 },
  u21Text: { color: color.info, fontSize: 8, fontWeight: fontWeight.bold as "700" },
  ovrBox: { borderWidth: 1, borderColor: color.borderStrong, borderRadius: radius.sm, paddingHorizontal: space.sm, paddingVertical: 2 },
  ovrText: { color: color.text, fontSize: fontSize.xs, fontWeight: fontWeight.black as "800", fontStyle: "italic" },
  confLabel: { color: color.textMuted, fontSize: 8, marginTop: 2 },
  confBars: { flexDirection: "row", gap: 2, marginTop: 1 },
  confBar: { width: 8, height: 3, borderRadius: 1 },
  value: { color: color.text, fontSize: fontSize.xs, fontWeight: fontWeight.bold as "700" },
  trend: { fontSize: 9, fontWeight: fontWeight.bold as "700" },
  plain: { color: color.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold as "600", textAlign: "center" },
  interest: { color: color.text, fontSize: fontSize.sm, fontWeight: fontWeight.black as "800", fontStyle: "italic" },
  riskLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.black as "800", fontStyle: "italic" },
  riskPct: { fontSize: 9, fontWeight: fontWeight.bold as "700" },
});
