import { View, StyleSheet } from "react-native";
import { color, radius } from "@/theme";

/** Barra de progresso fina (XP, missões). `value` em 0..1. */
export function ProgressBar({
  value,
  tint = color.primary,
  track = color.surfaceRaised,
  height = 6,
}: {
  value: number;
  tint?: string;
  track?: string;
  height?: number;
}) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.track, { backgroundColor: track, height, borderRadius: height }]}>
      <View
        style={{
          width: `${pct * 100}%`,
          height,
          backgroundColor: tint,
          borderRadius: height,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: "100%", overflow: "hidden", borderRadius: radius.pill },
});
