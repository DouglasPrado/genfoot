import { useLocalSearchParams } from "expo-router";

import { IndividualTraining } from "@/screens/training-indiv";

export default function TreinoIndivRoute() {
  const { playerId } = useLocalSearchParams<{ playerId: string }>();
  return <IndividualTraining playerId={playerId} />;
}
