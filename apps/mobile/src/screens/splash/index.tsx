import { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { CONTRACT_VERSION } from "@grinta/api-client";
import { useAuth } from "@clerk/expo";

import { WorldLoading } from "@/components/world-loading";
import { useSession } from "@/lib/session";
import { useWorldQuery } from "@/lib/world";
import { color, display, fontSize, fontWeight, space } from "@/theme";
import type { MobileIdentityProjection } from "@/screens/onboarding/onboarding-model";
import { mobileAccountKey } from "@/screens/onboarding/onboarding-model";
import { bootSteps } from "./boot-model";
import { connectionLabel, deriveSplashDecision } from "./splash-model";

const CLIENT_VERSION: string = Constants.expoConfig?.version ?? "0.0.0";

/**
 * M-SPLASH (MF-00): abre a sessão, checa compatibilidade de contrato e roteia.
 * Não decide nada de domínio — só encaminha para onboarding ou home, e bloqueia
 * o app quando o contrato do servidor é incompatível (BREAKING).
 */
export function SplashScreen() {
  const router = useRouter();
  const { session, status, contractVersion, retry } = useSession();
  const { isLoaded: clerkLoaded, isSignedIn } = useAuth();
  const identityQuery = useWorldQuery<MobileIdentityProjection>(
    session === null ? null : "identity-detail",
  );

  const hasActiveControl = useMemo<boolean | null>(() => {
    if (session === null) return null;
    if (identityQuery.state === "loading") return null;
    // Contexto de identidade não inicializado: não há clube — vai ao onboarding.
    if (identityQuery.state === "empty") return false;
    if (identityQuery.data === null) return null;
    const account = (identityQuery.data.accounts ?? []).find(
      (candidate) =>
        candidate.idempotencyKey === mobileAccountKey(session.subject) &&
        candidate.status === "ACTIVE",
    );
    if (account === undefined) return false;
    return identityQuery.data.controls.some(
      (candidate) =>
        candidate.accountId === account.id && candidate.status === "ACTIVE",
    );
  }, [identityQuery.data, identityQuery.state, session]);

  const decision = deriveSplashDecision({
    status,
    serverContractVersion: contractVersion,
    clientContractVersion: CONTRACT_VERSION,
    hasActiveControl,
    // null enquanto o Clerk carrega: decidir agora mandaria ao login quem já
    // tem conta, num piscar.
    hasAccount: clerkLoaded ? isSignedIn : null,
    identityFailed:
      identityQuery.state === "error" || identityQuery.state === "offline",
  });

  const steps = bootSteps({
    status,
    serverContractVersion: contractVersion,
    clientContractVersion: CONTRACT_VERSION,
    accountLoaded: clerkLoaded,
    signedIn: isSignedIn === true,
    identityResolved: hasActiveControl !== null,
  });

  // Alvo estável: `decision` é um objeto novo a cada render, então depender dele
  // dispararia replace em loop. A string (ou null) só muda quando a rota muda.
  const target = decision.kind === "route" ? decision.to : null;
  useEffect(() => {
    if (target !== null) router.replace(target);
  }, [target, router]);

  if (decision.kind === "loading" || decision.kind === "route") {
    return <WorldLoading steps={steps} />;
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.center}>
        <Text style={styles.logo}>GRINTA</Text>

        {decision.kind === "network-error" ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>SEM CONEXÃO</Text>
            <Text style={styles.panelBody}>
              Não foi possível falar com o servidor do mundo. Verifique sua rede.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tentar de novo"
              style={styles.button}
              onPress={() => {
                retry();
                identityQuery.refetch();
              }}
            >
              <Text style={styles.buttonText}>TENTAR DE NOVO</Text>
            </Pressable>
          </View>
        ) : null}

        {decision.kind === "upgrade-required" ? (
          <View style={styles.panel}>
            <Text style={[styles.panelTitle, styles.blocked]}>
              ATUALIZE O APP
            </Text>
            <Text style={styles.panelBody}>
              Este app fala o contrato {decision.client} e o servidor está em{" "}
              {decision.server}. Atualize para continuar jogando.
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Text style={styles.meta}>VERSÃO {CLIENT_VERSION}</Text>
        <Text style={styles.meta}>{connectionLabel(status, decision)}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.background,
    paddingHorizontal: space.lg,
    paddingVertical: space.xl,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space.lg,
  },
  logo: {
    ...display,
    fontSize: 44,
    letterSpacing: 2,
  },
  panel: {
    alignItems: "center",
    gap: space.sm,
    maxWidth: 320,
  },
  panelTitle: {
    ...display,
    fontSize: fontSize.md,
    color: color.warning,
  },
  blocked: {
    color: color.danger,
  },
  panelBody: {
    color: color.textMuted,
    fontSize: fontSize.sm,
    textAlign: "center",
    lineHeight: 20,
  },
  button: {
    marginTop: space.sm,
    backgroundColor: color.primary,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: 4,
    minHeight: 44,
    justifyContent: "center",
  },
  buttonText: {
    color: color.primaryContrast,
    fontWeight: fontWeight.bold as "700",
    fontSize: fontSize.sm,
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  meta: {
    color: color.textFaint,
    fontSize: fontSize.xs,
    letterSpacing: 0.5,
  },
});
