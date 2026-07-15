import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, SectionHeader } from "@/components/card";
import { ProgressBar } from "@/components/progress-bar";
import { color, space, radius, fontSize, fontWeight } from "@/theme";
import type { MatchViewModel, Momentum } from "./match-data";

const MOMENTUM: Record<Momentum, { label: string; icon: React.ComponentProps<typeof Ionicons>["name"]; tint: string }> = {
  rising: { label: "SUBINDO", icon: "arrow-up", tint: color.success },
  falling: { label: "CAINDO", icon: "arrow-down", tint: color.danger },
  steady: { label: "ESTÁVEL", icon: "remove", tint: color.textMuted },
};

/** Gauge segmentado da pressão (0..10), verde→vermelho. */
function PressureGauge({ value }: { value: number }) {
  const segments = 10;
  return (
    <View style={styles.gauge}>
      {Array.from({ length: segments }).map((_, i) => {
        const on = i < value;
        const tint = i < 4 ? color.success : i < 7 ? color.warning : color.danger;
        return (
          <View
            key={i}
            style={[styles.segment, { backgroundColor: on ? tint : color.surfaceRaised, opacity: on ? 1 : 0.4 }]}
          />
        );
      })}
    </View>
  );
}

/** Faixa de estado do jogo: posse, momentum, pressão + leitura/aviso. */
export function GameStateBand({ state }: { state: MatchViewModel["state"] }) {
  const m = MOMENTUM[state.momentum];
  return (
    <Card>
      <SectionHeader title="FAIXA DE ESTADO DO JOGO" />
      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>POSSE DE BOLA</Text>
          <Text style={styles.metricValue}>{state.possession}%</Text>
          <ProgressBar value={state.possession / 100} height={6} />
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>MOMENTUM</Text>
          <View style={styles.momentumRow}>
            <Ionicons name={m.icon} size={16} color={m.tint} />
            <Text style={[styles.metricValue, { color: m.tint }]}>{m.label}</Text>
          </View>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>PRESSÃO</Text>
          <Text style={styles.metricValue}>{state.pressure >= 7 ? "ALTA" : state.pressure >= 4 ? "MÉDIA" : "BAIXA"}</Text>
          <PressureGauge value={state.pressure} />
        </View>
      </View>
      <View style={styles.reading}>
        <Text style={styles.readingText}>
          LEITURA DO JOGO: <Text style={styles.readingStrong}>{state.reading}</Text>
        </Text>
        {state.warning ? (
          <View style={styles.warnRow}>
            <Ionicons name="warning" size={13} color={color.warning} />
            <Text style={styles.warnText}>{state.warning}</Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row", gap: space.md },
  metric: { flex: 1, gap: space.xs },
  metricLabel: { color: color.textMuted, fontSize: 10, fontWeight: fontWeight.bold as "700", letterSpacing: 0.5 },
  metricValue: { color: color.text, fontSize: fontSize.lg, fontWeight: fontWeight.black as "800", fontStyle: "italic" },
  momentumRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  gauge: { flexDirection: "row", gap: 2, marginTop: 2 },
  segment: { flex: 1, height: 8, borderRadius: 2 },
  reading: {
    marginTop: space.md,
    backgroundColor: color.backgroundElevated,
    borderRadius: radius.sm,
    padding: space.md,
    alignItems: "center",
    gap: 4,
  },
  readingText: { color: color.textMuted, fontSize: fontSize.sm, fontWeight: fontWeight.semibold as "600", letterSpacing: 0.5 },
  readingStrong: { color: color.text, fontWeight: fontWeight.bold as "700" },
  warnRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  warnText: { color: color.warning, fontSize: fontSize.xs, fontWeight: fontWeight.bold as "700", letterSpacing: 0.5 },
});
