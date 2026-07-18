import { useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { Card } from "@/components/card";
import { Icon } from "@/components/icon";
import { Refresh } from "@/components/refresh";
import { ScreenStatePanel } from "@/components/screen-state-panel";
import {
  selectManagedClub,
  type ClubPortfolioProjection,
} from "@/lib/club-projection";
import { deriveScreenState } from "@/lib/screen-state";
import { useSession } from "@/lib/session";
import { useWorldQuery } from "@/lib/world";
import {
  deriveOnboardingStep,
  type MobileIdentityProjection,
} from "@/screens/onboarding/onboarding-model";
import { color, fontSize, fontWeight, space } from "@/theme";

interface StaffMember {
  readonly staffId: string;
  readonly name: string;
  readonly role: string;
  readonly qualityTier: string;
  readonly abilityScore: number;
}

interface StaffProjection {
  readonly members: readonly StaffMember[];
}

const ROLE_LABEL: Readonly<Record<string, string>> = {
  HEAD_COACH: "Técnico",
  ASSISTANT_COACH: "Auxiliar técnico",
  FITNESS_COACH: "Preparador físico",
  GOALKEEPER_COACH: "Treinador de goleiros",
  SCOUT: "Olheiro",
  DOCTOR: "Médico",
  PHYSIOTHERAPIST: "Fisioterapeuta",
  PSYCHOLOGIST: "Psicólogo",
  DIRECTOR: "Diretor",
  NEGOTIATOR: "Negociador",
  COMMUNICATION_MANAGER: "Comunicação",
  YOUTH_COORDINATOR: "Coordenador de base",
};

/** Escala 1–5 do clube (doc 04): Básico · Funcional · Competitivo · Avançado · Elite. */
const TIER_LABEL: Readonly<Record<string, string>> = {
  VERY_LOW: "Básico",
  LOW: "Funcional",
  MEDIUM: "Competitivo",
  HIGH: "Avançado",
  ELITE: "Elite",
};

/** Comissão técnica (C8) — o plantel de profissionais do clube gerido. */
export function Staff() {
  const { session, status } = useSession();
  const clubQuery = useWorldQuery<ClubPortfolioProjection>("club-detail");
  const identityQuery =
    useWorldQuery<MobileIdentityProjection>("identity-detail");
  const onboarding =
    session === null
      ? null
      : deriveOnboardingStep(
          identityQuery.state === "ready" ? identityQuery.data : null,
          session.accountId,
          clubQuery.asOf ?? "",
        );
  const managedClub = selectManagedClub(
    clubQuery.data,
    onboarding?.kind === "complete" ? onboarding.clubId : null,
  );
  const staffQuery = useWorldQuery<StaffProjection>(
    managedClub === null ? null : "staff",
    managedClub === null ? undefined : { clubId: managedClub.id },
  );

  const refresh = useCallback(() => {
    clubQuery.refetch();
    staffQuery.refetch();
  }, [clubQuery.refetch, staffQuery.refetch]);

  const members = staffQuery.data?.members ?? [];
  const screenState = deriveScreenState({
    session: status,
    query:
      clubQuery.state === "loading" || staffQuery.state === "loading"
        ? "loading"
        : staffQuery.state === "offline"
          ? "offline"
          : staffQuery.state === "error"
            ? "error"
            : "ready",
    hasCachedData: staffQuery.isStale,
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar ao elenco"
          accessibilityState={{}}
          hitSlop={8}
          style={styles.back}
        >
          <Icon name="arrow-back" size={22} color={color.text} />
        </Pressable>
        <Text style={styles.headerTitle}>COMISSÃO TÉCNICA</Text>
        <View style={styles.back} />
      </View>

      {screenState !== "success" || managedClub === null ? (
        <View style={styles.content}>
          <ScreenStatePanel
            state={screenState === "success" ? "empty" : screenState}
            onRetry={refresh}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<Refresh onRefresh={refresh} />}
        >
          <Card>
            {members.length === 0 ? (
              <Text style={styles.empty}>Sem comissão técnica.</Text>
            ) : (
              members.map((m) => (
                <View key={m.staffId} style={styles.row}>
                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>
                      {m.name}
                    </Text>
                    <Text style={styles.role} numberOfLines={1}>
                      {ROLE_LABEL[m.role] ?? m.role} ·{" "}
                      {TIER_LABEL[m.qualityTier] ?? m.qualityTier}
                    </Text>
                  </View>
                  <Text style={styles.ovr}>{m.abilityScore}</Text>
                </View>
              ))
            )}
          </Card>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  back: { width: 32, alignItems: "flex-start" },
  headerTitle: {
    color: color.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 0.5,
  },
  content: { padding: space.lg, gap: space.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  info: { flex: 1, gap: 2 },
  name: {
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  role: { color: color.textMuted, fontSize: fontSize.xs },
  ovr: {
    minWidth: 32,
    textAlign: "right",
    color: color.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold as "700",
  },
  empty: {
    color: color.textMuted,
    fontSize: fontSize.sm,
    paddingVertical: space.sm,
  },
});
