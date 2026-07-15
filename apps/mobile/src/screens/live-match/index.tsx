import { useState } from "react";
import { ScrollView, View, Text, Pressable, StyleSheet } from "react-native";
import { Icon, type IconName } from "@/components/icon";
import { SafeAreaView } from "react-native-safe-area-context";
import { color, space, radius, fontSize, fontWeight } from "@/theme";
import { MATCH_SEED } from "./match-data";
import { Scoreboard } from "./scoreboard";
import { GameStateBand } from "./game-state-band";
import { EventFeed } from "./event-feed";
import { EmergencyCard } from "./emergency-card";
import { QuickActions } from "./quick-actions";

/** Botão alternador de modo (Compacto | Detalhado). */
function ModeToggle({ detailed, onToggle }: { detailed: boolean; onToggle: () => void }) {
  return (
    <Pressable style={styles.mode} onPress={onToggle} accessibilityRole="button">
      <View>
        <Text style={styles.modeTitle}>ALTERNADOR DE MODO</Text>
        <Text style={styles.modeSub}>
          <Text style={!detailed ? styles.modeOn : undefined}>Compacto</Text>
          {" | "}
          <Text style={detailed ? styles.modeOn : undefined}>Detalhado</Text>
        </Text>
      </View>
      <Icon name="chevron-forward" size={18} color={color.primaryContrast} />
    </Pressable>
  );
}

/** Tela de Partida ao vivo, fiel ao protótipo prototipo-simulador-partida. */
export function LiveMatch() {
  const match = MATCH_SEED;
  const [detailed, setDetailed] = useState(true);
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Scoreboard match={match} />
        <ModeToggle detailed={detailed} onToggle={() => setDetailed((d) => !d)} />
        {detailed ? (
          <>
            <GameStateBand state={match.state} />
            <EventFeed events={match.events} />
          </>
        ) : (
          <EventFeed events={match.events.slice(0, 2)} />
        )}
        {match.emergency ? <EmergencyCard emergency={match.emergency} /> : null}
        <QuickActions />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xl4 },
  mode: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: color.primary,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.xl,
    marginHorizontal: space.xl2,
  },
  modeTitle: { color: color.primaryContrast, fontSize: fontSize.md, fontWeight: fontWeight.black as "800", fontStyle: "italic", letterSpacing: 0.5 },
  modeSub: { color: color.primaryContrast, fontSize: fontSize.xs, fontWeight: fontWeight.semibold as "600", opacity: 0.8 },
  modeOn: { fontWeight: fontWeight.black as "800", opacity: 1 },
});
