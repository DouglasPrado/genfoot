import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { Onboarding } from "@/screens/onboarding";

export default function OnboardingRoute() {
  const { isLoaded, isSignedIn } = useAuth();

  // Entrar num clube exige conta: o onboarding é tão protegido quanto as abas.
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/entrar" />;

  return <Onboarding />;
}
