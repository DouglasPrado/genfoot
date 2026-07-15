import { ScrollView, View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "@/lib/session";
import { color, space, fontSize, fontWeight } from "@/theme";
import { HOME_SEED } from "./home-data";
import { PlayerHeader } from "./player-header";
import { ChampionshipStrip } from "./championship-strip";
import { NextMatch } from "./next-match";
import { DailyMissions } from "./daily-missions";
import { PackBanner } from "./pack-banner";
import { SeasonRewards } from "./season-rewards";

/** Barra fina de status da conexão com a API oficial. */
function ConnectionBar() {
  const { status, contractVersion, retry } = useSession();
  if (status === "online") {
    return (
      <View style={[styles.conn, { borderColor: color.primaryDim }]}>
        <Ionicons name="ellipse" size={8} color={color.success} />
        <Text style={styles.connText}>
          API online{contractVersion ? ` · contrato ${contractVersion}` : ""}
        </Text>
      </View>
    );
  }
  const connecting = status === "connecting";
  return (
    <Pressable style={[styles.conn, { borderColor: color.borderStrong }]} onPress={retry}>
      <Ionicons name="ellipse" size={8} color={connecting ? color.warning : color.danger} />
      <Text style={styles.connText}>
        {connecting ? "Conectando à API…" : "API offline — toque para tentar de novo"}
      </Text>
    </Pressable>
  );
}

/** Tela inicial do jogador, fiel ao protótipo prototipo-home. */
export function Home() {
  const vm = HOME_SEED;
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ConnectionBar />
        <PlayerHeader club={vm.club} wallet={vm.wallet} />
        <ChampionshipStrip standing={vm.standing} />
        <NextMatch nextMatch={vm.nextMatch} />
        <DailyMissions missions={vm.missions} />
        <PackBanner />
        <SeasonRewards season={vm.season} rewardBox={vm.rewardBox} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xl4 },
  conn: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: space.md,
    paddingVertical: 4,
  },
  connText: { color: color.textMuted, fontSize: 11, fontWeight: fontWeight.semibold as "600" },
});
