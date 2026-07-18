import { useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { Card, SectionHeader } from "@/components/card";
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
import { color, fontSize, fontWeight, radius, space } from "@/theme";

interface MatchItem {
  readonly matchId: string;
  readonly roundNumber: number;
  readonly homeClubId: string;
  readonly awayClubId: string;
  readonly homeClubName: string;
  readonly awayClubName: string;
  readonly homeGoals: number | null;
  readonly awayGoals: number | null;
  readonly finished: boolean;
  readonly scheduledOn: string;
}

interface MatchesProjection {
  readonly results: readonly MatchItem[];
  readonly upcoming: readonly MatchItem[];
}

/** Calendário e resultados da liga — recortado pelo clube gerido. */
export function Matches() {
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
  const matchesQuery = useWorldQuery<MatchesProjection>(
    managedClub === null ? null : "matches",
    managedClub === null ? undefined : { clubId: managedClub.id },
  );

  const refresh = useCallback(() => {
    clubQuery.refetch();
    matchesQuery.refetch();
  }, [clubQuery.refetch, matchesQuery.refetch]);

  const screenState = deriveScreenState({
    session: status,
    query:
      clubQuery.state === "loading" || matchesQuery.state === "loading"
        ? "loading"
        : matchesQuery.state === "offline"
          ? "offline"
          : matchesQuery.state === "error"
            ? "error"
            : "ready",
    hasCachedData: matchesQuery.isStale,
  });

  if (screenState !== "success" || managedClub === null) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.content}>
          <ScreenStatePanel
            state={screenState === "success" ? "empty" : screenState}
            onRetry={refresh}
          />
        </View>
      </SafeAreaView>
    );
  }

  const data = matchesQuery.data;
  const myId = managedClub.id;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<Refresh onRefresh={refresh} />}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Voltar ao início"
            hitSlop={8}
            style={styles.back}
          >
            <Icon name="arrow-back" size={22} color={color.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>PARTIDAS</Text>
            <Text style={styles.subtitle}>{managedClub.name.toUpperCase()}</Text>
          </View>
        </View>

        <Card>
          <SectionHeader title="PRÓXIMAS" />
          {data && data.upcoming.length > 0 ? (
            data.upcoming
              .slice(0, 8)
              .map((m) => <Fixture key={m.matchId} match={m} myId={myId} />)
          ) : (
            <Text style={styles.empty}>
              Sem partidas agendadas — a temporada terminou.
            </Text>
          )}
        </Card>

        <Card>
          <SectionHeader title="RESULTADOS" />
          {data && data.results.length > 0 ? (
            data.results
              .slice(0, 12)
              .map((m) => <Result key={m.matchId} match={m} myId={myId} />)
          ) : (
            <Text style={styles.empty}>
              Nenhum jogo disputado ainda nesta temporada.
            </Text>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Fixture({ match, myId }: { match: MatchItem; myId: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.round}>R{match.roundNumber}</Text>
      <Text
        style={[styles.team, match.homeClubId === myId && styles.mine]}
        numberOfLines={1}
      >
        {match.homeClubName}
      </Text>
      <Text style={styles.vs}>×</Text>
      <Text
        style={[styles.teamRight, match.awayClubId === myId && styles.mine]}
        numberOfLines={1}
      >
        {match.awayClubName}
      </Text>
    </View>
  );
}

function Result({ match, myId }: { match: MatchItem; myId: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.round}>R{match.roundNumber}</Text>
      <Text
        style={[styles.team, match.homeClubId === myId && styles.mine]}
        numberOfLines={1}
      >
        {match.homeClubName}
      </Text>
      <Text style={styles.score}>
        {match.homeGoals}–{match.awayGoals}
      </Text>
      <Text
        style={[styles.teamRight, match.awayClubId === myId && styles.mine]}
        numberOfLines={1}
      >
        {match.awayClubName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  content: { padding: space.lg, gap: space.md },
  header: { flexDirection: "row", alignItems: "center", gap: space.sm },
  back: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, gap: space.xs },
  title: { color: color.text, fontSize: fontSize.xl, fontWeight: fontWeight.bold as "700" },
  subtitle: { color: color.textMuted, fontSize: fontSize.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  round: { width: 32, color: color.textMuted, fontSize: fontSize.xs },
  team: { flex: 1, color: color.text, fontSize: fontSize.sm, textAlign: "right" },
  teamRight: { flex: 1, color: color.text, fontSize: fontSize.sm },
  mine: { fontWeight: fontWeight.bold as "700", color: color.primary },
  vs: { color: color.textMuted, fontSize: fontSize.xs },
  score: {
    minWidth: 44,
    textAlign: "center",
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
    backgroundColor: color.surface,
    borderRadius: radius.sm,
    paddingVertical: 2,
  },
  empty: { color: color.textMuted, fontSize: fontSize.sm, paddingVertical: space.sm },
});
