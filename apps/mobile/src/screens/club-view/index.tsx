import { useCallback, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { Card, SectionHeader } from "@/components/card";
import { Icon } from "@/components/icon";
import { Refresh } from "@/components/refresh";
import { ScreenStatePanel } from "@/components/screen-state-panel";
import type { ClubPortfolioProjection } from "@/lib/club-projection";
import { deriveScreenState } from "@/lib/screen-state";
import { useSession } from "@/lib/session";
import { useWorldQuery } from "@/lib/world";
import { ClubCrest } from "@/screens/club/customization/crest";
import { clubCrestData } from "@/screens/club/customization/visual-identity";
import { color, fontSize, fontWeight, radius, space } from "@/theme";

interface RosterPlayer {
  readonly playerId: string;
  readonly shirtNumber: number;
  readonly name: string;
  readonly primaryPosition: string;
  readonly age: number;
  readonly overall: number;
  readonly availability: string;
}

interface RosterProjection {
  readonly clubId: string;
  readonly players: readonly RosterPlayer[];
}

interface DisciplineRow {
  readonly playerId: string;
  readonly playerName: string;
  readonly position: string;
  readonly yellowCards: number;
  readonly redCards: number;
}

interface DisciplineProjection {
  readonly players: readonly DisciplineRow[];
  readonly cardsTracked: boolean;
  /** Sem regra ratificada, a tela conta cartão e NÃO afirma pendurado. */
  readonly suspensionRuleExists: boolean;
}

/**
 * `M-CLUB-VIEW` — o clube de OUTRO (o adversário que vem aí).
 *
 * Leitura pura: identidade, estádio, reputação e o elenco. Não há ação daqui —
 * mexer no elenco alheio não é decisão do usuário.
 */
export function ClubView() {
  const params = useLocalSearchParams<{ clubId?: string }>();
  const clubId = params.clubId ?? null;
  const { status } = useSession();

  const clubQuery = useWorldQuery<ClubPortfolioProjection>("club-detail");
  const rosterQuery = useWorldQuery<RosterProjection>(
    clubId === null ? null : "roster",
    clubId === null ? undefined : { clubId },
  );
  const disciplineQuery = useWorldQuery<DisciplineProjection>(
    clubId === null ? null : "club-discipline",
    clubId === null ? undefined : { clubId },
  );

  const club = useMemo(
    () => clubQuery.data?.clubs.find((c) => c.id === clubId) ?? null,
    [clubQuery.data, clubId],
  );

  const refresh = useCallback(() => {
    clubQuery.refetch();
    rosterQuery.refetch();
    disciplineQuery.refetch();
  }, [clubQuery.refetch, rosterQuery.refetch, disciplineQuery.refetch]);

  const screenState = deriveScreenState({
    session: status,
    query:
      clubQuery.state === "loading"
        ? "loading"
        : clubQuery.state === "offline"
          ? "offline"
          : clubQuery.state === "error"
            ? "error"
            : "ready",
    hasCachedData: clubQuery.isStale,
  });

  if (screenState !== "success" || club === null) {
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

  const players = rosterQuery.data?.players ?? [];
  const discipline = disciplineQuery.data?.players ?? [];
  const cardsTracked = disciplineQuery.data?.cardsTracked ?? false;
  const suspensionRuleExists =
    disciplineQuery.data?.suspensionRuleExists ?? false;

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
          {/* `null` cru: `clubCrestData` cai na identidade determinística pelo
              nome. Trocar por cinza do tema aqui apagaria o escudo. */}
          <View style={styles.crest}>
            <ClubCrest
              {...clubCrestData(
                club.name,
                club.primaryColor,
                club.secondaryColor,
                club.crestTemplateId,
              )}
              size={44}
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              {club.name.toUpperCase()}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {club.stadiumName} ·{" "}
              {club.stadiumCapacity.toLocaleString("pt-BR")} lugares
            </Text>
          </View>
        </View>

        <Card>
          <SectionHeader title="O CLUBE" />
          <Line label="Sigla" value={club.shortCode} />
          <Line label="Reputação" value={`faixa ${club.reputationBand}`} />
          <Line label="Entrosamento" value={`${club.cohesion}/100`} />
          <Line
            label="Comando"
            value={club.manager?.name ?? "sem gestor (IA)"}
          />
        </Card>

        <Card>
          <SectionHeader
            title="ELENCO"
            trailing={<Text style={styles.count}>{players.length}</Text>}
          />
          {rosterQuery.state === "loading" ? (
            <Text style={styles.empty}>Carregando o elenco…</Text>
          ) : players.length === 0 ? (
            <Text style={styles.empty}>
              Este clube ainda não tem elenco materializado neste mundo.
            </Text>
          ) : (
            players.map((p) => (
              <View key={p.playerId} style={styles.playerRow}>
                <Text style={styles.shirt}>{p.shirtNumber}</Text>
                <View style={styles.playerText}>
                  <Text style={styles.playerName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={styles.playerMeta} numberOfLines={1}>
                    {p.primaryPosition} · {p.age} anos
                    {p.availability !== "AVAILABLE"
                      ? ` · ${p.availability.toLowerCase()}`
                      : ""}
                  </Text>
                </View>
                <Text style={styles.overall}>{p.overall}</Text>
              </View>
            ))
          )}
        </Card>

        {/*
          Cartões: agora o motor os PRODUZ (R-206b) e a contagem é real. O que
          continua não existindo é a regra de SUSPENSÃO — quantos amarelos
          suspendem e quando a contagem zera é regra de campeonato sem decisão
          ratificada. A tela conta; não afirma pendurado.
        */}
        <Card>
          <SectionHeader
            title="CARTÕES"
            trailing={
              <Text style={styles.count}>
                {discipline.length > 0 ? `${discipline.length} jogadores` : ""}
              </Text>
            }
          />
          {disciplineQuery.state === "loading" ? (
            <Text style={styles.empty}>Carregando…</Text>
          ) : !cardsTracked ? (
            <>
              <Text style={styles.unavailableTitle}>
                Indisponível nesta versão
              </Text>
              <Text style={styles.empty}>
                O motor de partida ainda não registra cartões.
              </Text>
            </>
          ) : discipline.length === 0 ? (
            <Text style={styles.empty}>
              Nenhum jogador deste elenco levou cartão nas partidas já
              disputadas neste mundo.
            </Text>
          ) : (
            discipline.map((row) => (
              <View key={row.playerId} style={styles.playerRow}>
                <View style={styles.playerText}>
                  <Text style={styles.playerName} numberOfLines={1}>
                    {row.playerName}
                  </Text>
                  <Text style={styles.playerMeta}>{row.position}</Text>
                </View>
                {row.yellowCards > 0 ? (
                  <Text style={styles.yellow}>{row.yellowCards}A</Text>
                ) : null}
                {row.redCards > 0 ? (
                  <Text style={styles.red}>{row.redCards}V</Text>
                ) : null}
              </View>
            ))
          )}
          <Text style={styles.legend}>
            {suspensionRuleExists
              ? ""
              : "Suspensão não existe no domínio: nenhuma regra define quantos amarelos suspendem nem quando a contagem zera. Por isso a tela conta cartão e não diz quem está pendurado."}
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={styles.lineValue}>{value}</Text>
    </View>
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
  crest: { width: 44, height: 44 },
  headerText: { flex: 1, gap: space.xs },
  title: {
    color: color.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold as "700",
  },
  subtitle: { color: color.textMuted, fontSize: fontSize.xs },
  count: { color: color.textMuted, fontSize: fontSize.xs },
  line: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  lineLabel: { color: color.textMuted, fontSize: fontSize.xs },
  lineValue: { color: color.text, fontSize: fontSize.sm },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  shirt: {
    width: 26,
    textAlign: "center",
    color: color.textMuted,
    fontSize: fontSize.xs,
  },
  playerText: { flex: 1 },
  playerName: { color: color.text, fontSize: fontSize.sm },
  playerMeta: { color: color.textMuted, fontSize: fontSize.xs },
  overall: {
    minWidth: 30,
    textAlign: "center",
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
    backgroundColor: color.background,
    borderRadius: radius.sm,
    paddingVertical: 2,
  },
  yellow: {
    minWidth: 30,
    textAlign: "center",
    color: color.warning,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  red: {
    minWidth: 30,
    textAlign: "center",
    color: color.danger,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  legend: { color: color.textFaint, fontSize: fontSize.xs, marginTop: space.sm },
  unavailableTitle: {
    color: color.warning,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
    marginBottom: space.xs,
  },
  empty: {
    color: color.textMuted,
    fontSize: fontSize.sm,
    paddingVertical: space.sm,
  },
});
