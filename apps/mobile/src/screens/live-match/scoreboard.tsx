import { View, Text, StyleSheet } from "react-native";
import { color, space, radius, fontSize, fontWeight } from "@/theme";
import type { MatchViewModel } from "./match-data";

function Crest({ tint }: { tint: string }) {
  return <View style={[styles.crest, { borderColor: tint }]} />;
}

/** Placar ao vivo: AO VIVO, competição/rodada, escudos e minuto. */
export function Scoreboard({ match }: { match: MatchViewModel }) {
  return (
    <View style={styles.root}>
      {match.live ? (
        <View style={styles.liveRow}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>AO VIVO</Text>
        </View>
      ) : null}
      <Text style={styles.competition}>
        {match.competition} • RODADA {match.round}
      </Text>
      <View style={styles.scoreRow}>
        <View style={styles.side}>
          <Text style={[styles.sideLabel, { color: color.home }]}>{match.home.name}</Text>
          <Crest tint={color.home} />
        </View>
        <View style={styles.center}>
          <Text style={styles.score}>
            {match.home.score} - {match.away.score}
          </Text>
          <Text style={styles.minute}>{match.minute}'</Text>
        </View>
        <View style={styles.side}>
          <Text style={[styles.sideLabel, { color: color.away }]}>{match.away.name}</Text>
          <Crest tint={color.away} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: color.surface,
    borderColor: color.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.lg,
    alignItems: "center",
    gap: space.xs,
  },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.primary },
  liveText: { color: color.primary, fontSize: fontSize.sm, fontWeight: fontWeight.black as "800", letterSpacing: 1 },
  competition: { color: color.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold as "600", letterSpacing: 0.5 },
  scoreRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", marginTop: space.xs },
  side: { flex: 1, alignItems: "center", gap: space.sm },
  sideLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold as "700", fontStyle: "italic", letterSpacing: 0.5 },
  crest: {
    width: 56,
    height: 64,
    borderRadius: radius.md,
    borderWidth: 2,
    backgroundColor: color.backgroundElevated,
  },
  center: { alignItems: "center", paddingHorizontal: space.sm },
  score: { color: color.text, fontSize: fontSize.display, fontWeight: fontWeight.black as "800", fontStyle: "italic", lineHeight: 52 },
  minute: { color: color.primary, fontSize: fontSize.md, fontWeight: fontWeight.bold as "700", fontStyle: "italic" },
});
