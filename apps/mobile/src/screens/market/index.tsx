import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CommandTrackingStatus } from "@grinta/core";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { Refresh } from "@/components/refresh";
import { ScreenStatePanel } from "@/components/screen-state-panel";
import {
  selectManagedClub,
  type ClubPortfolioProjection,
} from "@/lib/club-projection";
import {
  submitTrackedCommand,
  type TrackedCommandResult,
} from "@/lib/command-orchestrator";
import { deriveScreenState } from "@/lib/screen-state";
import { useSession } from "@/lib/session";
import { useWorldId, useWorldQuery } from "@/lib/world";
import { addWorldDays } from "@/screens/onboarding/onboarding-model";
import { color, fontSize, fontWeight, formatAmount, radius, space } from "@/theme";
import {
  deriveListingAction,
  deriveMarketPresentation,
  matchesSearch,
  type MarketListingProjection,
  type MarketSummaryProjection,
} from "./market-state";

/** Mercado oficial: nunca inventa listagens nem permite negociar sem contexto. */
export function Market() {
  const worldId = useWorldId();
  const { client, contractVersion, status } = useSession();
  const query = useWorldQuery<MarketSummaryProjection>("market");
  const clubQuery = useWorldQuery<ClubPortfolioProjection>("club");
  const managedClub = selectManagedClub(clubQuery.data, null);
  const [tracking, setTracking] = useState<
    (TrackedCommandResult & { readonly playerId: string }) | null
  >(null);
  const [search, setSearch] = useState("");
  const [negotiating, setNegotiating] = useState<
    (TrackedCommandResult & { readonly listingId: string }) | null
  >(null);
  const presentation = deriveMarketPresentation(query.state, query.data);
  const negotiations = query.data?.negotiations ?? [];
  const listings = (query.data?.listings ?? []).filter(
    (listing) =>
      listing.status === "ACTIVE" &&
      matchesSearch(search, listing.playerName, listing.primaryPosition),
  );

  /**
   * Fluxo de negociação (GP-008): PROPOR abre a negociação e envia a 1ª oferta
   * (fatia comprável do saga); o aceite muda o estado oficial para ACCEPTED.
   * Cada passo é um command idempotente confirmado por re-query — nunca simula.
   */
  const negotiate = useCallback(
    (listing: MarketListingProjection) => {
      if (
        client === null ||
        contractVersion === null ||
        managedClub === null ||
        status !== "online"
      ) {
        return;
      }
      const worldDate = query.asOf ?? "2026-01-01";
      const feeMinor = listing.askingFeeMinor;
      const wageMinor = Math.max(100_000, Math.round(feeMinor / 200));
      const submit = async () => {
        const baseKey = `neg:${managedClub.id}:${listing.playerId}`;
        setNegotiating({
          listingId: listing.id,
          status: CommandTrackingStatus.SUBMITTING,
          commandId: null,
          resource: null,
          correlationId: `mobile:${baseKey}`,
          errorCode: null,
        });
        const opened = await submitTrackedCommand(client, {
          clientContractVersion: "v1",
          serverContractVersion: contractVersion,
          commandType: "market:open-negotiation",
          worldId,
          payload: {
            playerId: listing.playerId,
            buyerClubId: managedClub.id,
            sellerClubId: listing.sellerClubId,
          },
          idempotencyKey: `${baseKey}:open`,
          correlationId: `mobile:${baseKey}:open`,
        });
        if (
          opened.status !== CommandTrackingStatus.ACCEPTED &&
          opened.status !== CommandTrackingStatus.APPLIED
        ) {
          setNegotiating({ ...opened, listingId: listing.id });
          query.refetch();
          return;
        }
        // Confirma pelo estado oficial e recupera a negociação criada.
        const official = await client.query<MarketSummaryProjection>(
          worldId,
          "market",
        );
        const negotiation = (official.data.negotiations ?? []).find(
          (candidate) =>
            candidate.playerId === listing.playerId &&
            candidate.buyerClubId === managedClub.id &&
            candidate.status !== "CANCELLED" &&
            candidate.status !== "EXPIRED",
        );
        if (negotiation === undefined) {
          setNegotiating({
            ...opened,
            listingId: listing.id,
            status: CommandTrackingStatus.UNKNOWN_RECOVERING,
          });
          query.refetch();
          return;
        }
        const offered = await submitTrackedCommand(client, {
          clientContractVersion: "v1",
          serverContractVersion: contractVersion,
          commandType: "market:submit-offer",
          worldId,
          payload: {
            negotiationId: negotiation.id,
            createdByClubId: managedClub.id,
            feeMinor,
            wageMinor,
            contractYears: 3,
            expiresOn: addWorldDays(worldDate, 30),
            expectedVersion: negotiation.currentVersion,
          },
          idempotencyKey: `${baseKey}:offer:${negotiation.currentVersion}`,
          correlationId: `mobile:${baseKey}:offer`,
        });
        setNegotiating({ ...offered, listingId: listing.id });
        query.refetch();
      };
      Alert.alert(
        "Enviar proposta?",
        `${listing.playerName} — taxa R$ ${formatAmount(feeMinor / 100)}, salário R$ ${formatAmount(wageMinor / 100)}, 3 anos. A proposta é oficial e não pode ser desfeita.`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Propor", style: "destructive", onPress: () => void submit() },
        ],
      );
    },
    [client, contractVersion, managedClub, query, status, worldId],
  );

  /** Aceite do vendedor (atalho de demonstração — o mundo demo não tem IA). */
  const acceptAsSeller = useCallback(
    (listing: MarketListingProjection, negotiationId: string, version: number) => {
      if (client === null || contractVersion === null || status !== "online") {
        return;
      }
      const key = `neg-accept:${negotiationId}:${version}`;
      setNegotiating({
        listingId: listing.id,
        status: CommandTrackingStatus.SUBMITTING,
        commandId: null,
        resource: null,
        correlationId: `mobile:${key}`,
        errorCode: null,
      });
      void submitTrackedCommand(client, {
        clientContractVersion: "v1",
        serverContractVersion: contractVersion,
        commandType: "market:accept-offer",
        worldId,
        payload: { negotiationId, version },
        idempotencyKey: key,
        correlationId: `mobile:${key}`,
      }).then((result) => {
        setNegotiating({ ...result, listingId: listing.id });
        query.refetch();
      });
    },
    [client, contractVersion, query, status, worldId],
  );
  const screenState = deriveScreenState({
    session: status,
    query: query.state,
    hasCachedData: query.isStale,
  });
  const requestScouting = useCallback(
    (playerId: string) => {
      if (
        client === null ||
        contractVersion === null ||
        managedClub === null ||
        status !== "online"
      ) {
        return;
      }
      const idempotencyKey = `mobile:scout:${managedClub.id}:${playerId}`;
      setTracking({
        playerId,
        status: CommandTrackingStatus.SUBMITTING,
        commandId: null,
        resource: null,
        correlationId: idempotencyKey,
        errorCode: null,
      });
      void submitTrackedCommand(client, {
        clientContractVersion: "v1",
        serverContractVersion: contractVersion,
        commandType: "market:request-scouting",
        worldId,
        payload: {
          playerId,
          observerClubId: managedClub.id,
          scoutingCapacity: 80,
          observations: ["capacidade atual", "potencial", "encaixe tático"],
          validUntil: "2099-12-31",
        },
        idempotencyKey,
        correlationId: idempotencyKey,
      }).then(async (result) => {
        setTracking({ ...result, playerId });
        if (
          result.status === CommandTrackingStatus.ACCEPTED ||
          result.status === CommandTrackingStatus.APPLIED
        ) {
          const official = await client.query<MarketSummaryProjection>(
            worldId,
            "market",
          );
          const applied = official.data.scoutingReports.some(
            (report) =>
              report.playerId === playerId &&
              report.observerClubId === managedClub.id,
          );
          if (applied) {
            setTracking({
              ...result,
              playerId,
              status: CommandTrackingStatus.APPLIED,
            });
          }
          query.refetch();
        }
      });
    },
    [client, contractVersion, managedClub, query.refetch, status, worldId],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<Refresh onRefresh={query.refetch} />}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Icon name="transfer" size={24} color={color.primary} />
          </View>
          <View>
            <Text style={styles.title}>MERCADO</Text>
            <Text style={styles.subtitle}>TRANSFERÊNCIAS OFICIAIS</Text>
          </View>
        </View>

        {screenState !== "success" ? (
          <ScreenStatePanel
            state={screenState}
            title={
              screenState === "empty" ? "MERCADO AINDA NÃO ABERTO" : undefined
            }
            body={
              screenState === "empty"
                ? "A temporada deste mundo ainda não inicializou o mercado. Nenhuma negociação está disponível."
                : undefined
            }
            onRetry={query.refetch}
          />
        ) : (
          <View style={styles.stateCard}>
            <Icon name="checkmark-circle" size={30} color={color.success} />
            <Text style={styles.stateTitle}>{presentation.title}</Text>
            <Text style={styles.stateBody}>{presentation.body}</Text>

            <View style={styles.stats}>
              {presentation.stats.map((stat) => (
                <View key={stat.label} style={styles.stat}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.searchBox}>
              <Icon name="search" size={16} color={color.textMuted} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar por nome ou posição…"
                placeholderTextColor={color.textMuted}
                accessibilityLabel="Buscar jogador"
              />
            </View>

            {listings.length > 0 ? (
              <Text style={styles.sectionLabel}>LISTADOS PARA VENDA</Text>
            ) : null}
            {listings.map((listing) => {
              const action = deriveListingAction(
                listing,
                negotiations,
                managedClub?.id ?? "",
              );
              const busy =
                negotiating?.listingId === listing.id &&
                negotiating.status === CommandTrackingStatus.SUBMITTING;
              return (
                <View key={listing.id} style={styles.playerRow}>
                  <View style={styles.playerOverall}>
                    <Text style={styles.playerOverallValue}>
                      {listing.currentAbility}
                    </Text>
                  </View>
                  <View style={styles.playerIdentity}>
                    <Text style={styles.playerName}>{listing.playerName}</Text>
                    <Text style={styles.playerMeta}>
                      {listing.primaryPosition} · pedida R${" "}
                      {formatAmount(listing.askingFeeMinor / 100)}
                    </Text>
                  </View>
                  {busy ? (
                    <ActivityIndicator size="small" color={color.primary} />
                  ) : action.kind === "mine" ? (
                    <View style={styles.scoutedBadge}>
                      <Icon name="shield" size={14} color={color.textMuted} />
                      <Text style={styles.mineText}>SEU CLUBE</Text>
                    </View>
                  ) : action.kind === "accepted" ? (
                    <View style={styles.scoutedBadge}>
                      <Icon
                        name="checkmark-circle"
                        size={14}
                        color={color.success}
                      />
                      <Text style={styles.scoutedText}>ACEITA</Text>
                    </View>
                  ) : action.kind === "offered" ? (
                    <Pressable
                      style={styles.acceptButton}
                      onPress={() =>
                        acceptAsSeller(
                          listing,
                          action.negotiation.id,
                          action.negotiation.currentVersion,
                        )
                      }
                      disabled={status !== "online"}
                      accessibilityRole="button"
                      accessibilityLabel={`Aceite do vendedor para ${listing.playerName} (demonstração)`}
                    >
                      <Text style={styles.acceptText}>ACEITE·DEMO</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={styles.scoutButton}
                      onPress={() => negotiate(listing)}
                      disabled={status !== "online" || managedClub === null}
                      accessibilityRole="button"
                      accessibilityLabel={`Propor por ${listing.playerName}`}
                    >
                      <Text style={styles.scoutButtonText}>PROPOR</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
            {negotiating?.status === CommandTrackingStatus.REJECTED ? (
              <Text
                style={styles.commandError}
                accessibilityLiveRegion="assertive"
              >
                Negociação rejeitada:{" "}
                {negotiating.errorCode ?? "regra do mercado"}.
              </Text>
            ) : null}

            <Text style={styles.sectionLabel}>AGENTES LIVRES</Text>
            {query.data?.availablePlayers
              .filter((player) =>
                matchesSearch(search, player.name, player.primaryPosition),
              )
              .slice(0, 24)
              .map((player) => (
              <View key={player.id} style={styles.playerRow}>
                <View style={styles.playerOverall}>
                  <Text style={styles.playerOverallValue}>
                    {player.currentAbility}
                  </Text>
                </View>
                <View style={styles.playerIdentity}>
                  <Text style={styles.playerName}>{player.name}</Text>
                  <Text style={styles.playerMeta}>
                    {player.primaryPosition} · {player.nationality} · POT{" "}
                    {player.potentialAbility}
                  </Text>
                </View>
                {query.data?.scoutingReports.some(
                  (report) =>
                    report.playerId === player.id &&
                    report.observerClubId === managedClub?.id,
                ) ? (
                  <View style={styles.scoutedBadge}>
                    <Icon
                      name="checkmark-circle"
                      size={14}
                      color={color.success}
                    />
                    <Text style={styles.scoutedText}>OBSERVADO</Text>
                  </View>
                ) : (
                  <Pressable
                    style={styles.scoutButton}
                    onPress={() => requestScouting(player.id)}
                    disabled={
                      status !== "online" ||
                      managedClub === null ||
                      (tracking?.playerId === player.id &&
                        (tracking.status === CommandTrackingStatus.SUBMITTING ||
                          tracking.status === CommandTrackingStatus.ACCEPTED))
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Observar ${player.name}`}
                    accessibilityState={{
                      disabled: status !== "online" || managedClub === null,
                      busy:
                        tracking?.playerId === player.id &&
                        (tracking.status === CommandTrackingStatus.SUBMITTING ||
                          tracking.status === CommandTrackingStatus.ACCEPTED),
                    }}
                  >
                    {tracking?.playerId === player.id &&
                    tracking.status === CommandTrackingStatus.SUBMITTING ? (
                      <ActivityIndicator
                        size="small"
                        color={color.primaryContrast}
                      />
                    ) : (
                      <Text style={styles.scoutButtonText}>OBSERVAR</Text>
                    )}
                  </Pressable>
                )}
              </View>
            ))}

            {tracking?.status === CommandTrackingStatus.REJECTED ? (
              <Text
                style={styles.commandError}
                accessibilityLiveRegion="assertive"
              >
                Não foi possível observar:{" "}
                {tracking.errorCode ?? "regra do mercado"}.
              </Text>
            ) : null}

            <Pressable
              style={styles.retry}
              onPress={query.refetch}
              accessibilityRole="button"
              accessibilityLabel="Atualizar estado do mercado"
            >
              <Icon
                name="swap-horizontal"
                size={15}
                color={color.primaryContrast}
              />
              <Text style={styles.retryText}>ATUALIZAR</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.ruleCard}>
          <Icon name="shield" size={18} color={color.textMuted} />
          <Text style={styles.ruleText}>
            Propostas, contratos e transferências exigem conexão. O app nunca
            simula sucesso nem enfileira essas ações offline.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xl4 },
  header: { flexDirection: "row", alignItems: "center", gap: space.md },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.primaryDim,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: color.text,
    fontSize: fontSize.xl2,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  subtitle: {
    color: color.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 0.8,
  },
  stateCard: {
    minHeight: 300,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.borderStrong,
    borderRadius: radius.lg,
    padding: space.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: space.md,
  },
  stateTitle: {
    color: color.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    textAlign: "center",
  },
  stateBody: {
    color: color.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: "center",
  },
  stats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    alignSelf: "stretch",
  },
  stat: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: color.backgroundElevated,
    borderRadius: radius.sm,
    padding: space.md,
    alignItems: "center",
  },
  statValue: {
    color: color.primary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black as "800",
  },
  statLabel: {
    color: color.textMuted,
    fontSize: 9,
    fontWeight: fontWeight.bold as "700",
  },
  retry: {
    minHeight: 48,
    paddingHorizontal: space.xl,
    borderRadius: radius.sm,
    backgroundColor: color.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  retryText: {
    color: color.primaryContrast,
    fontWeight: fontWeight.black as "800",
    letterSpacing: 0.8,
  },
  playerRow: {
    alignSelf: "stretch",
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.sm,
    borderRadius: radius.sm,
    backgroundColor: color.backgroundElevated,
  },
  playerOverall: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.primaryDim,
  },
  playerOverallValue: {
    color: color.primary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black as "800",
  },
  playerIdentity: { flex: 1 },
  playerName: {
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  playerMeta: { color: color.textMuted, fontSize: fontSize.xs },
  scoutButton: {
    minHeight: 44,
    minWidth: 82,
    paddingHorizontal: space.sm,
    borderRadius: radius.sm,
    backgroundColor: color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  scoutButtonText: {
    color: color.primaryContrast,
    fontSize: 10,
    fontWeight: fontWeight.black as "800",
  },
  scoutedBadge: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  scoutedText: {
    color: color.success,
    fontSize: 9,
    fontWeight: fontWeight.bold as "700",
  },
  searchBox: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: color.backgroundElevated,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.border,
    paddingHorizontal: space.md,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    color: color.text,
    fontSize: fontSize.sm,
  },
  sectionLabel: {
    alignSelf: "stretch",
    color: color.primary,
    fontSize: 10,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    letterSpacing: 1,
    marginTop: space.sm,
  },
  mineText: {
    color: color.textMuted,
    fontSize: 9,
    fontWeight: fontWeight.bold as "700",
  },
  acceptButton: {
    minHeight: 44,
    minWidth: 82,
    paddingHorizontal: space.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.warning,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptText: {
    color: color.warning,
    fontSize: 9,
    fontWeight: fontWeight.black as "800",
  },
  commandError: {
    color: color.danger,
    fontSize: fontSize.xs,
    textAlign: "center",
  },
  ruleCard: {
    flexDirection: "row",
    gap: space.sm,
    backgroundColor: color.backgroundElevated,
    borderRadius: radius.md,
    padding: space.md,
  },
  ruleText: {
    flex: 1,
    color: color.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 17,
  },
});
