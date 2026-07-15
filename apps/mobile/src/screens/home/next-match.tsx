import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, SectionHeader } from "@/components/card";
import { color, space, radius, fontSize, fontWeight } from "@/theme";
import type { HomeViewModel } from "./home-data";

function TeamCrest({
  abbr,
  name,
  formation,
  tint,
}: {
  abbr: string;
  name: string;
  formation: string;
  tint: string;
}) {
  return (
    <View style={styles.team}>
      <View style={[styles.crest, { borderColor: tint }]}>
        <Text style={[styles.crestAbbr, { color: tint }]}>{abbr}</Text>
      </View>
      <Text style={styles.teamName} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.formation}>{formation}</Text>
    </View>
  );
}

/** Card "Próxima partida": dois escudos vs, formações e CTA Escalar time. */
export function NextMatch({
  nextMatch,
  onLineup,
}: Pick<HomeViewModel, "nextMatch"> & { onLineup?: () => void }) {
  return (
    <Card>
      <SectionHeader
        title="PRÓXIMA PARTIDA"
        trailing={
          <View style={styles.kickoff}>
            <Ionicons name="time-outline" size={13} color={color.textMuted} />
            <Text style={styles.kickoffText}>{nextMatch.kickoffLabel}</Text>
          </View>
        }
      />
      <View style={styles.matchup}>
        <TeamCrest {...nextMatch.home} tint={color.text} />
        <Text style={styles.vs}>VS</Text>
        <TeamCrest {...nextMatch.away} tint={color.away} />
      </View>
      <Pressable style={styles.cta} onPress={onLineup} accessibilityRole="button">
        <Text style={styles.ctaText}>ESCALAR TIME</Text>
        <Ionicons name="chevron-forward" size={16} color={color.primaryContrast} />
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  kickoff: { flexDirection: "row", alignItems: "center", gap: 4 },
  kickoffText: { color: color.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold as "600" },
  matchup: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  team: { flex: 1, alignItems: "center", gap: space.xs },
  crest: {
    width: 64,
    height: 72,
    borderRadius: radius.md,
    borderWidth: 2,
    backgroundColor: color.backgroundElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  crestAbbr: { fontSize: fontSize.xl, fontWeight: fontWeight.black as "800", fontStyle: "italic" },
  teamName: {
    color: color.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  formation: { color: color.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold as "600" },
  vs: {
    color: color.primary,
    fontSize: fontSize.xl2,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    paddingHorizontal: space.sm,
  },
  cta: {
    marginTop: space.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    backgroundColor: color.primary,
    borderRadius: radius.sm,
    paddingVertical: space.md,
  },
  ctaText: {
    color: color.primaryContrast,
    fontSize: fontSize.md,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    letterSpacing: 1,
  },
});
