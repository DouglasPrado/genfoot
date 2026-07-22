import { useLocalSearchParams } from "expo-router";

import { MedicalCaseScreen } from "@/screens/medical-case";

/** Rota do caso médico (M-MEDICAL-CASE), empilhada a partir de M-MEDICAL. */
export default function MedicalCaseRoute() {
  const { playerId } = useLocalSearchParams<{ playerId: string }>();
  return <MedicalCaseScreen playerId={playerId} />;
}
