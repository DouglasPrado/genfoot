import { useLocalSearchParams } from "expo-router";

import { PlayerDev } from "@/screens/player-dev";

export default function DesenvolvimentoRoute() {
  const { playerId } = useLocalSearchParams<{ playerId: string }>();
  return <PlayerDev playerId={playerId} />;
}
