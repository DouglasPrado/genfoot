import { useLocalSearchParams } from "expo-router";

import { Mentoring } from "@/screens/mentoring";

export default function MentoriaRoute() {
  const { playerId } = useLocalSearchParams<{ playerId: string }>();
  return <Mentoring playerId={playerId} />;
}
