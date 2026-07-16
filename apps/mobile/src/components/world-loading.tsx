import { ActivityIndicator, ImageBackground, StyleSheet, Text, View } from "react-native";

import { ProgressBar } from "@/components/progress-bar";
import { color, display, fontSize, fontWeight, space } from "@/theme";
import type { BootStep } from "@/screens/splash/boot-model";
import { bootProgress } from "@/screens/splash/boot-model";

const BACKGROUND = require("../../assets/loading-stadium.png") as number;

/**
 * Tela de carregamento do mundo. As etapas são as reais do boot e a barra é a
 * fração já concluída — nada de animação fingindo avanço (ver boot-model).
 */
export function WorldLoading({ steps }: { steps: readonly BootStep[] }) {
  const progress = bootProgress(steps);
  const current = steps.find(({ done }) => !done) ?? steps[steps.length - 1];

  return (
    <ImageBackground source={BACKGROUND} style={styles.root} resizeMode="cover">
      {/* Escurece o topo para o logo destacar sobre os holofotes. */}
      <View style={styles.scrim} />

      <View style={styles.content}>
        <Text style={styles.logo}>GRINTA</Text>

        <View style={styles.panel}>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel={`${current?.label ?? "Carregando"} — ${Math.round(progress * 100)}%`}
            accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
          >
            <ProgressBar value={progress} height={4} />
          </View>

          <View style={styles.currentRow}>
            {progress < 1 ? (
              <ActivityIndicator size="small" color={color.primary} />
            ) : null}
            <Text style={styles.current}>{current?.label ?? "Pronto"}</Text>
            <Text style={styles.percent}>{Math.round(progress * 100)}%</Text>
          </View>

          <View style={styles.steps}>
            {steps.map((step) => (
              <View key={step.key} style={styles.step}>
                <View
                  style={[styles.dot, step.done ? styles.dotDone : null]}
                />
                <Text
                  style={[styles.stepText, step.done ? styles.stepDone : null]}
                >
                  {step.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,11,13,0.55)" },
  content: {
    flex: 1,
    justifyContent: "flex-end",
    padding: space.lg,
    paddingBottom: space.xl * 2,
    gap: space.xl,
  },
  logo: {
    ...display,
    fontSize: 44,
    letterSpacing: 2,
    textAlign: "center",
  },
  panel: { gap: space.md },
  currentRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  current: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  percent: {
    color: color.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.black as "800",
    fontVariant: ["tabular-nums"],
  },
  steps: { gap: space.xs },
  step: { flexDirection: "row", alignItems: "center", gap: space.sm },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: color.textFaint,
  },
  dotDone: { backgroundColor: color.primary },
  stepText: { color: color.textFaint, fontSize: fontSize.xs },
  stepDone: { color: color.textMuted },
});
