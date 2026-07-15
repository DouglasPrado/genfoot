import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { color, space } from "@/theme";
import { HOME_SEED } from "./home-data";
import { LiveWorld } from "./live-world";
import { PlayerHeader } from "./player-header";
import { ChampionshipStrip } from "./championship-strip";
import { NextMatch } from "./next-match";
import { DailyMissions } from "./daily-missions";
import { PackBanner } from "./pack-banner";
import { SeasonRewards } from "./season-rewards";

/** Tela inicial do jogador, fiel ao protótipo prototipo-home. */
export function Home() {
  const vm = HOME_SEED;
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LiveWorld />
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
});
