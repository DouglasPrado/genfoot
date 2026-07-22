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
  formatLabel,
  lifecycleLabel,
} from "@/screens/competition/competition-model";
import {
  deriveOnboardingStep,
  type MobileIdentityProjection,
} from "@/screens/onboarding/onboarding-model";
import { color, fontSize, fontWeight, radius, space } from "@/theme";

interface CompetitionSummary {
  readonly competitionId: string;
  readonly name: string;
  readonly type: string;
  readonly format: string;
  readonly tier: number | null;
  readonly lifecycle: string;
  readonly clubCount: number;
  readonly matchCount: number;
  readonly startsOn: string | null;
  readonly endsOn: string | null;
  readonly clubParticipates: boolean | null;
  readonly clubRank: number | null;
  readonly currentRound: number | null;
}

interface CompetitionsProjection {
  readonly competitions: readonly CompetitionSummary[];
}

/**
 * `M-COMPETITIONS` — as competições da temporada.
 *
 * Duas seções, como o doc pede: as do CLUBE (onde ele joga, com posição e
 * rodada) e as do MUNDO. Cada item abre `M-COMPETITION`.
 */
export function Competitions() {
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
  const listQuery = useWorldQuery<CompetitionsProjection>(
    managedClub === null ? null : "competitions-list",
    managedClub === null ? undefined : { clubId: managedClub.id },
  );

  const refresh = useCallback(() => {
    clubQuery.refetch();
    listQuery.refetch();
  }, [clubQuery.refetch, listQuery.refetch]);

  const screenState = deriveScreenState({
    session: status,
    query:
      clubQuery.state === "loading" || listQuery.state === "loading"
        ? "loading"
        : listQuery.state === "offline"
          ? "offline"
          : listQuery.state === "error"
            ? "error"
            : "ready",
    hasCachedData: listQuery.isStale,
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

  const all = listQuery.data?.competitions ?? [];
  const mine = all.filter((c) => c.clubParticipates === true);
  const others = all.filter((c) => c.clubParticipates !== true);

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
            accessibilityLabel="Voltar"
            hitSlop={8}
            style={styles.back}
          >
            <Icon name="arrow-back" size={22} color={color.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>COMPETIÇÕES</Text>
            <Text style={styles.subtitle}>{managedClub.name.toUpperCase()}</Text>
          </View>
        </View>

        <Card>
          <SectionHeader title="DO SEU CLUBE" />
          {mine.length > 0 ? (
            mine.map((c) => <CompetitionRow key={c.competitionId} item={c} />)
          ) : (
            <Text style={styles.empty}>
              Seu clube ainda não está inscrito em nenhuma competição desta
              temporada.
            </Text>
          )}
        </Card>

        <Card>
          <SectionHeader title="NO MUNDO" />
          {others.length > 0 ? (
            others.map((c) => <CompetitionRow key={c.competitionId} item={c} />)
          ) : (
            <Text style={styles.empty}>
              Nenhuma outra competição existe neste mundo.
            </Text>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function CompetitionRow({ item }: { item: CompetitionSummary }) {
  // A posição só aparece quando a competição JÁ RODOU: "1º" antes da bola
  // rolar é ordem alfabética disfarçada de liderança.
  const position =
    item.clubParticipates === true && item.clubRank !== null && item.currentRound !== null
      ? `${item.clubRank}º de ${item.clubCount}`
      : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir ${item.name}`}
      onPress={() => router.push(`/competicoes/${item.competitionId}`)}
      style={styles.row}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {formatLabel(item.format)} · {lifecycleLabel(item.lifecycle)}
          {item.currentRound !== null ? ` · rodada ${item.currentRound}` : ""}
        </Text>
      </View>
      {position !== null ? (
        <Text style={styles.position}>{position}</Text>
      ) : null}
      <Icon name="chevron-forward" size={18} color={color.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  content: { padding: space.lg, gap: space.md },
  header: { flexDirection: "row", alignItems: "center", gap: space.sm },
  back: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1, gap: space.xs },
  title: {
    color: color.text,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold as "700",
  },
  subtitle: { color: color.textMuted, fontSize: fontSize.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: color.text, fontSize: fontSize.md },
  rowMeta: { color: color.textMuted, fontSize: fontSize.xs },
  position: {
    color: color.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
    backgroundColor: color.background,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  empty: {
    color: color.textMuted,
    fontSize: fontSize.sm,
    paddingVertical: space.sm,
  },
});
