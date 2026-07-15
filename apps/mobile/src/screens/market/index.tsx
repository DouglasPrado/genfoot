import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { color, space } from "@/theme";
import { MARKET_SEED } from "./market-data";
import { MarketHeader } from "./market-header";
import { SearchFilters } from "./search-filters";
import { PlayerTable } from "./player-table";
import { MarketActions } from "./market-actions";

/** Tela de Mercado de Transferências, fiel ao protótipo mercado-v2. */
export function Market() {
  const vm = MARKET_SEED;
  const [activeTab, setActiveTab] = useState(vm.activeTab);
  const [activeLayer, setActiveLayer] = useState(vm.activeLayer);
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <MarketHeader temperature={vm.temperature} note={vm.temperatureNote} />
        <SearchFilters
          tabs={vm.tabs}
          activeTab={activeTab}
          onTab={setActiveTab}
          layers={vm.layers}
          activeLayer={activeLayer}
          onLayer={setActiveLayer}
        />
        <PlayerTable players={vm.players} />
        <MarketActions />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xl4 },
});
