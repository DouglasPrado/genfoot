import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  View,
  Text,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { CommandTrackingStatus } from "@grinta/core";
import { Icon, type IconName } from "@/components/icon";
import { SafeAreaView } from "react-native-safe-area-context";
import { Refresh } from "@/components/refresh";
import { ScreenStatePanel } from "@/components/screen-state-panel";
import {
  buildClubInfrastructure,
  selectManagedClub,
  type ClubPortfolioProjection,
} from "@/lib/club-projection";
import { ClubCrest } from "@/screens/club/customization/crest";
import { CustomizeClubModal, normalizeClubName } from "@/screens/club/customization/customize-modal";
import {
  defaultVisualIdentity,
  type VisualIdentity,
} from "@/screens/club/customization/visual-identity";
import { deriveScreenState } from "@/lib/screen-state";
import { useAuth, useUser } from "@clerk/expo";
import { useWorldQuery } from "@/lib/world";
import { useWorldId } from "@/lib/world";
import { useSession } from "@/lib/session";
import {
  submitTrackedCommand,
  type TrackedCommandResult,
} from "@/lib/command-orchestrator";
import {
  addWorldDays,
  deriveOnboardingStep,
  type MobileIdentityProjection,
} from "@/screens/onboarding/onboarding-model";
import { Card, SectionHeader } from "@/components/card";
import { ProgressBar } from "@/components/progress-bar";
import {
  color,
  space,
  radius,
  fontSize,
  fontWeight,
  formatAmount,
} from "@/theme";

type IoniconName = IconName;

interface FanbaseProjection {
  readonly clubId: string;
  readonly headcount: number;
  readonly boardPatience: number;
  readonly pressureLevel: number;
}

/** O feed de imprensa (C11): manchetes dos fatos reais do mundo. */
interface NarrativeFeedProjection {
  readonly items: readonly {
    readonly id: string;
    readonly clubId: string | null;
    readonly type: string;
    readonly title: string;
    readonly description: string;
    readonly intensity: number;
    readonly occurredOn: string;
  }[];
}

interface LedgerSummaryProjection {
  readonly accountCount: number;
  readonly transactionCount: number;
  readonly activeReservationCount: number;
  readonly activeDebtCount: number;
  readonly closedPeriodCount: number;
  readonly residualMinor: number;
  readonly clubBalances: readonly {
    readonly clubId: string;
    readonly balanceMinor: number;
  }[];
}

/** Tela de Clube: identidade, finanças e infraestrutura. */
export function Club() {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const worldId = useWorldId();
  const { client, session, contractVersion, status } = useSession();
  const worldQuery = useWorldQuery<{ currentDate: string }>("world");
  const clubQuery = useWorldQuery<ClubPortfolioProjection>("club-detail");
  const ledgerQuery = useWorldQuery<LedgerSummaryProjection>("ledger");
  /**
   * `ledger` (C9) e `narrative` (C11) foram apagados no extermínio (R-175) e
   * respondem 404. As duas queries FICAM, e a tela já fazia a coisa certa:
   * degrada dizendo "Nenhum saldo estimado será exibido" e omite a torcida em
   * vez de inventar número.
   *
   * Não mockei dinheiro aqui, e a diferença para o admin é deliberada: lá o mock
   * leva selo e o operador sabe ler; aqui o jogador contrataria em cima de um
   * número inventado. Volta com C9 — e aí a tela liga sozinha.
   */
  const narrativeQuery = useWorldQuery<NarrativeFeedProjection>("narrative");
  const identityQuery =
    useWorldQuery<MobileIdentityProjection>("identity-detail");
  const identity = identityQuery.state === "empty" ? null : identityQuery.data;
  const controlStep = deriveOnboardingStep(
    identity,
    session?.accountId ?? null,
    worldQuery.data?.currentDate ?? "",
  );
  const managedClub = selectManagedClub(
    clubQuery.data,
    controlStep.kind === "complete" ? controlStep.clubId : null,
  );
  // A torcida (C10): headcount, paciência da diretoria e pressão, recortados pelo
  // clube gerido. Só dispara com o clubId em mãos.
  const fanbaseQuery = useWorldQuery<FanbaseProjection>(
    managedClub === null ? null : "fanbase",
    managedClub === null ? undefined : { clubId: managedClub.id },
  );
  const vm =
    managedClub === null
      ? null
      : {
          name: managedClub.name.toUpperCase(),
          reputation: Math.min(
            100,
            Math.max(0, managedClub.reputationBand * 20),
          ),
          stadiumName: managedClub.stadiumName,
          stadiumCapacity: managedClub.stadiumCapacity,
          infrastructure: buildClubInfrastructure(managedClub),
        };
  const [tracking, setTracking] = useState<TrackedCommandResult | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [customizeTracking, setCustomizeTracking] =
    useState<TrackedCommandResult | null>(null);

  /**
   * A identidade visual do clube, ou a derivada do nome.
   *
   * O read model entrega as cores planas (`primaryColor`…) porque elas moram no
   * PERÍODO de identidade, e quem resolve qual período vale hoje é ele (BC-003).
   * `crestTemplateId` nulo = clube nunca personalizado — e aí vale a mesma
   * identidade default determinística que o admin usa, derivada do nome.
   */
  const visualIdentity: VisualIdentity | null =
    managedClub === null
      ? null
      : managedClub.crestTemplateId !== null && managedClub.primaryColor !== null
        ? {
            primaryColor: managedClub.primaryColor,
            secondaryColor: managedClub.secondaryColor ?? "#F8FAFC",
            tertiaryColor: null,
            homeKitTemplateId: "kit-solid",
            awayKitTemplateId: "kit-solid",
            crestTemplateId: managedClub.crestTemplateId,
          }
        : defaultVisualIdentity(managedClub.name);
  // A torcida vem de C10 agora (query `fanbase`), não mais do projeção de
  // narrativa que devolvia 0. `headcount` é o tamanho; a paciência e a pressão
  // ganham o card próprio abaixo.
  const fanbase = fanbaseQuery.data;
  const fanbaseSize = fanbase?.headcount ?? null;
  const takenNames = (clubQuery.data?.clubs ?? [])
    .filter((club) => club.id !== managedClub?.id)
    .map((club) => normalizeClubName(club.name));

  const submitCustomize = useCallback(
    (input: {
      readonly name: string;
      readonly shortCode: string;
      readonly visualIdentity: VisualIdentity;
    }) => {
      if (
        managedClub === null ||
        client === null ||
        contractVersion === null
      ) {
        return;
      }
      const worldDate = worldQuery.data?.currentDate ?? "2026-01-01";
      const idempotencyKey = `rebrand:${managedClub.id}:${managedClub.version}`;
      setCustomizeTracking({
        status: CommandTrackingStatus.SUBMITTING,
        commandId: null,
        resource: null,
        correlationId: `mobile:${idempotencyKey}`,
        errorCode: null,
      });
      void submitTrackedCommand(client, {
        clientContractVersion: "v1",
        serverContractVersion: contractVersion,
        // `club:command` morreu com o `WorldClubPortfolio` (R-175). O command
        // agora é o do catálogo: `ApplyClubIdentity` (`:386`, MF-25).
        commandType: "club:apply-identity",
        worldId,
        payload: {
          clubId: managedClub.id,
          // Concorrência otimista por agregado (R-175): vai no PAYLOAD, que é
          // onde o command a lê.
          expectedVersion: managedClub.version,
          name: input.name,
          shortCode: input.shortCode,
          visualIdentity: input.visualIdentity,
        },
        idempotencyKey,
        correlationId: `mobile:${idempotencyKey}`,
      }).then((result) => {
        setCustomizeTracking(result);
        if (
          result.status === CommandTrackingStatus.ACCEPTED ||
          result.status === CommandTrackingStatus.APPLIED
        ) {
          clubQuery.refetch();
          narrativeQuery.refetch();
          setCustomizeOpen(false);
        }
      });
    },
    [
      client,
      clubQuery,
      contractVersion,
      managedClub,
      narrativeQuery,
      worldId,
      worldQuery.data?.currentDate,
    ],
  );

  const endControl = useCallback(
    (reason: "EXIT" | "SWITCH_REQUESTED") => {
      if (
        controlStep.kind !== "complete" ||
        client === null ||
        contractVersion === null
      ) {
        return;
      }
      const worldDate = worldQuery.data?.currentDate ?? "2026-01-01";
      // R-26. `cooldownDays` saiu da projeção de identidade: era config de mundo
      // lida do mega-agregado, e config de mundo é `GameRuleConfig` (R-182) —
      // que ainda não existe. Constante declarada, não número mágico escondido.
      const cooldownUntil = addWorldDays(worldDate, COOLDOWN_DAYS);
      Alert.alert(
        reason === "EXIT" ? "Deixar o clube?" : "Iniciar troca de clube?",
        `O controle será encerrado agora. Você só poderá assumir outro clube a partir de ${cooldownUntil}. O histórico do clube será preservado.`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Encerrar controle",
            style: "destructive",
            onPress: () => {
              const idempotencyKey = `end-control:${controlStep.controlId}:${reason}`;
              setTracking({
                status: CommandTrackingStatus.SUBMITTING,
                commandId: null,
                resource: null,
                correlationId: `mobile:${idempotencyKey}`,
                errorCode: null,
              });
              void submitTrackedCommand(client, {
                clientContractVersion: "v1",
                serverContractVersion: contractVersion,
                commandType: "identity:end-club-control",
                worldId,
                payload: {
                  controlId: controlStep.controlId,
                  reason,
                  endedOn: worldDate,
                },
                idempotencyKey,
                correlationId: `mobile:${idempotencyKey}`,
              }).then(async (result) => {
                setTracking(result);
                if (
                  result.status === CommandTrackingStatus.ACCEPTED ||
                  result.status === CommandTrackingStatus.APPLIED
                ) {
                  const official = await client.query<MobileIdentityProjection>(
                    worldId,
                    "identity-detail",
                  );
                  const applied = !official.data.controls.some(
                    (control) =>
                      control.id === controlStep.controlId &&
                      control.status === "ACTIVE",
                  );
                  if (!applied) return;
                  setTracking({
                    ...result,
                    status: CommandTrackingStatus.APPLIED,
                  });
                  identityQuery.refetch();
                  router.replace("/onboarding");
                }
              });
            },
          },
        ],
      );
    },
    [
      client,
      contractVersion,
      controlStep,
      identityQuery.refetch,
      worldId,
      worldQuery.data?.currentDate,
    ],
  );

  const refresh = useCallback(() => {
    clubQuery.refetch();
    identityQuery.refetch();
    worldQuery.refetch();
    // O financeiro é query própria (C9). Sem isto, puxar pra atualizar mexia em
    // tudo menos no caixa — o saldo ficava colado no valor da última montagem.
    ledgerQuery.refetch();
    narrativeQuery.refetch();
    fanbaseQuery.refetch();
  }, [
    clubQuery.refetch,
    identityQuery.refetch,
    worldQuery.refetch,
    ledgerQuery.refetch,
    narrativeQuery.refetch,
    fanbaseQuery.refetch,
  ]);
  const screenState = deriveScreenState({
    session: status,
    hasCachedData: clubQuery.isStale || identityQuery.isStale,
    query:
      clubQuery.state === "loading" || identityQuery.state === "loading"
        ? "loading"
        : clubQuery.state === "offline" || identityQuery.state === "offline"
          ? "offline"
          : clubQuery.state === "error" || identityQuery.state === "error"
            ? "error"
            : clubQuery.state === "empty" || identityQuery.state === "empty"
              ? "empty"
              : "ready",
  });

  if (screenState !== "success" || vm === null) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.content}>
          <ScreenStatePanel
            state={screenState === "success" ? "empty" : screenState}
            title={vm === null ? "CLUBE NÃO DISPONÍVEL" : undefined}
            body={
              vm === null
                ? "Conclua a escolha de clube para acessar a administração."
                : undefined
            }
            onRetry={refresh}
          />
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<Refresh onRefresh={refresh} />}
      >
        <Pressable
          style={styles.hero}
          onPress={() => setCustomizeOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Personalizar clube"
        >
          <View style={styles.crest}>
            <ClubCrest
              templateId={
                (visualIdentity ?? defaultVisualIdentity(vm.name))
                  .crestTemplateId
              }
              primary={(visualIdentity ?? defaultVisualIdentity(vm.name)).primaryColor}
              secondary={
                (visualIdentity ?? defaultVisualIdentity(vm.name)).secondaryColor
              }
              tertiary={
                (visualIdentity ?? defaultVisualIdentity(vm.name)).tertiaryColor
              }
              letter={vm.name.charAt(0)}
              size={60}
            />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{vm.name}</Text>
              <Icon name="shirt" size={16} color={color.primary} />
            </View>
            <Text style={styles.subtitle}>{vm.stadiumName}</Text>
            <View style={styles.repRow}>
              <Text style={styles.repLabel}>REPUTAÇÃO</Text>
              <View style={styles.repBar}>
                <ProgressBar value={vm.reputation / 100} height={5} />
              </View>
            </View>
            {fanbaseSize !== null ? (
              <Text style={styles.fanbase}>
                TORCIDA {formatAmount(fanbaseSize)} · toque para personalizar
              </Text>
            ) : (
              <Text style={styles.fanbase}>Toque para personalizar</Text>
            )}
          </View>
        </Pressable>

        <Pressable
          onPress={() => router.push("/financas")}
          accessibilityRole="button"
          accessibilityLabel="Abrir finanças"
        >
        <Card>
          <SectionHeader
            title="FINANÇAS"
            trailing={
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={styles.openHint}>ABRIR</Text>
                <Icon name="chevron-forward" size={16} color={color.textMuted} />
              </View>
            }
          />
          {ledgerQuery.state === "ready" && ledgerQuery.data !== null ? (
            <View style={styles.financeContent}>
              <View style={styles.finBalance}>
                <Text style={styles.finBoxLabel}>CAIXA DISPONÍVEL</Text>
                <Text style={styles.finBalanceValue}>
                  R${" "}
                  {formatAmount(
                    (ledgerQuery.data.clubBalances.find(
                      ({ clubId }) => clubId === managedClub?.id,
                    )?.balanceMinor ?? 0) / 100,
                  )}
                </Text>
              </View>
              <View style={styles.finGrid}>
                <View style={styles.finBox}>
                  <Text style={styles.finBoxLabel}>CONTAS CONTÁBEIS</Text>
                  <Text style={styles.finBoxValue}>
                    {ledgerQuery.data.accountCount}
                  </Text>
                </View>
                <View style={styles.finBox}>
                  <Text style={styles.finBoxLabel}>LANÇAMENTOS</Text>
                  <Text style={styles.finBoxValue}>
                    {ledgerQuery.data.transactionCount}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.financeUnavailable}>
              <Icon name="shield" size={18} color={color.warning} />
              <Text style={styles.financeUnavailableText}>
                {ledgerQuery.state === "loading"
                  ? "Sincronizando o livro financeiro…"
                  : "O financeiro ainda não existe neste mundo. Nenhum saldo estimado será exibido."}
              </Text>
            </View>
          )}
        </Card>
        </Pressable>

        <Card>
          <SectionHeader
            title="TORCIDA"
            trailing={<Icon name="people" size={16} color={color.textMuted} />}
          />
          {fanbaseQuery.state === "ready" && fanbase !== null ? (
            <View style={styles.financeContent}>
              <View style={styles.finBalance}>
                <Text style={styles.finBoxLabel}>TAMANHO DA TORCIDA</Text>
                <Text style={styles.finBalanceValue}>
                  {formatAmount(fanbase.headcount)}
                </Text>
              </View>
              <View style={styles.fanMeter}>
                <View style={styles.fanMeterHead}>
                  <Text style={styles.finBoxLabel}>PACIÊNCIA DA DIRETORIA</Text>
                  <Text style={styles.fanMeterValue}>
                    {fanbase.boardPatience}
                  </Text>
                </View>
                <ProgressBar value={fanbase.boardPatience / 100} height={6} />
              </View>
              <View style={styles.fanMeter}>
                <View style={styles.fanMeterHead}>
                  <Text style={styles.finBoxLabel}>PRESSÃO</Text>
                  <Text style={styles.fanMeterValue}>
                    {fanbase.pressureLevel}
                  </Text>
                </View>
                <ProgressBar value={fanbase.pressureLevel / 100} height={6} />
              </View>
            </View>
          ) : (
            <View style={styles.financeUnavailable}>
              <Icon name="people" size={18} color={color.textMuted} />
              <Text style={styles.financeUnavailableText}>
                {fanbaseQuery.state === "loading"
                  ? "Sincronizando a torcida…"
                  : "A torcida ainda não existe neste mundo."}
              </Text>
            </View>
          )}
        </Card>

        <Card>
          <SectionHeader
            title="IMPRENSA"
            trailing={
              <Icon
                name="notifications-outline"
                size={16}
                color={color.textMuted}
              />
            }
          />
          {(narrativeQuery.data?.items?.length ?? 0) === 0 ? (
            <Text style={styles.pressEmpty}>
              {narrativeQuery.state === "loading"
                ? "Buscando as manchetes…"
                : "Sem manchetes ainda. Contrate um reforço e a imprensa comenta."}
            </Text>
          ) : (
            (narrativeQuery.data?.items ?? []).slice(0, 6).map((item) => (
              <View key={item.id} style={styles.pressItem}>
                <View style={styles.pressDot} />
                <View style={styles.pressBody}>
                  <Text style={styles.pressTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.pressDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                </View>
              </View>
            ))
          )}
        </Card>

        {controlStep.kind === "complete" ? (
          <Card>
            <SectionHeader
              title="SEU CONTROLE"
              trailing={
                <Icon name="shield" size={16} color={color.textMuted} />
              }
            />
            <Text style={styles.controlNote}>
              Você administra {vm.name}. Sair preserva o clube e inicia o
              período obrigatório de espera.
            </Text>
            {tracking?.status === CommandTrackingStatus.REJECTED ? (
              <Text style={styles.controlError}>
                {tracking.errorCode ?? "COMMAND_REJECTED"}
              </Text>
            ) : null}
            {tracking?.status === CommandTrackingStatus.SUBMITTING ? (
              <ActivityIndicator color={color.primary} />
            ) : (
              <View style={styles.controlActions}>
                <Pressable
                  style={styles.switchButton}
                  onPress={() => endControl("SWITCH_REQUESTED")}
                  accessibilityRole="button"
                  accessibilityLabel="Iniciar troca de clube"
                >
                  <Text style={styles.switchText}>TROCAR DE CLUBE</Text>
                </Pressable>
                <Pressable
                  style={styles.exitButton}
                  onPress={() => endControl("EXIT")}
                  accessibilityRole="button"
                  accessibilityLabel="Deixar o clube"
                >
                  <Text style={styles.exitText}>DEIXAR CLUBE</Text>
                </Pressable>
              </View>
            )}
          </Card>
        ) : null}

        {/* Conta vive aqui provisoriamente; a casa canônica é o M-ACCOUNT
            ("Conta e sessão", L-M09), que ainda não existe. O card mostra o
            estado real em vez de sumir: hoje a sessão do jogo é independente
            do Clerk, então dá para estar "no clube" e fora da conta. */}
        {isLoaded ? (
          <Card>
            <SectionHeader
              title="CONTA"
              trailing={<Icon name="person" size={16} color={color.textMuted} />}
            />
            {isSignedIn ? (
              <>
                <Text style={styles.controlNote}>
                  {user?.primaryEmailAddress?.emailAddress ?? "Conta conectada"}
                  {"\n"}Sair encerra a sessão neste aparelho. Seu clube e seu
                  progresso continuam intactos.
                </Text>
                <Pressable
                  style={styles.signOutButton}
                  onPress={() => void signOut()}
                  accessibilityRole="button"
                  accessibilityLabel="Sair da conta"
                >
                  <Text style={styles.signOutText}>SAIR DA CONTA</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.controlNote}>
                  Nenhuma conta conectada neste aparelho. O jogo ainda usa a
                  sessão de desenvolvimento — por isso o clube aparece mesmo
                  sem conta.
                </Text>
                <Pressable
                  style={styles.signOutButton}
                  onPress={() => router.push("/cadastro")}
                  accessibilityRole="button"
                  accessibilityLabel="Criar conta"
                >
                  <Text style={styles.signOutText}>CRIAR CONTA</Text>
                </Pressable>
              </>
            )}
          </Card>
        ) : null}

        <Card>
          <SectionHeader
            title="INFRAESTRUTURA"
            trailing={
              <Icon name="construct" size={16} color={color.textMuted} />
            }
          />
          <View style={styles.infraList}>
            {vm.infrastructure.map((infra) => (
              <View key={infra.id} style={styles.infraRow}>
                <View style={styles.infraIcon}>
                  <Icon
                    name={infra.icon as IoniconName}
                    size={18}
                    color={color.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infraName}>{infra.name}</Text>
                  <Text style={styles.infraNote}>{infra.note}</Text>
                </View>
                <View style={styles.levels}>
                  {Array.from({ length: infra.maxLevel }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.pip,
                        {
                          backgroundColor:
                            i < infra.level
                              ? color.primary
                              : color.surfaceRaised,
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <SectionHeader
            title="ESTÁDIO"
            trailing={
              <Icon name="business" size={16} color={color.textMuted} />
            }
          />
          <View style={styles.stadiumRow}>
            <Text style={styles.stadiumName}>{vm.stadiumName}</Text>
            <Text style={styles.stadiumCap}>
              {formatAmount(vm.stadiumCapacity)} lugares
            </Text>
          </View>
        </Card>
      </ScrollView>

      {managedClub !== null ? (
        <CustomizeClubModal
          visible={customizeOpen}
          onClose={() => setCustomizeOpen(false)}
          clubId={managedClub.id}
          clubName={managedClub.name}
          clubShortCode={managedClub.shortCode}
          initial={visualIdentity}
          takenNames={takenNames}
          submitting={
            customizeTracking?.status === CommandTrackingStatus.SUBMITTING
          }
          errorCode={
            customizeTracking?.status === CommandTrackingStatus.REJECTED
              ? customizeTracking.errorCode
              : null
          }
          onConfirm={submitCustomize}
        />
      ) : null}
    </SafeAreaView>
  );
}

/** R-26: o cooldown de saída. Volta para `GameRuleConfig` com C2 (R-182). */
const COOLDOWN_DAYS = 30;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xl4 },
  hero: { flexDirection: "row", alignItems: "center", gap: space.md },
  crest: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  fanbase: {
    color: color.textMuted,
    fontSize: 10,
    fontWeight: fontWeight.semibold as "600",
    marginTop: space.sm,
    letterSpacing: 0.3,
  },
  title: {
    color: color.text,
    fontSize: fontSize.xl2,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    letterSpacing: 0.5,
  },
  subtitle: {
    color: color.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold as "600",
    marginTop: 1,
  },
  repRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    marginTop: space.sm,
  },
  repLabel: {
    color: color.textMuted,
    fontSize: 9,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 0.5,
  },
  repBar: { flex: 1 },
  openHint: {
    color: color.textMuted,
    fontSize: 9,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 0.5,
  },
  financeContent: { gap: space.sm },
  finGrid: { flexDirection: "row", gap: space.sm },
  fanMeter: {
    backgroundColor: color.backgroundElevated,
    borderRadius: radius.sm,
    padding: space.md,
    gap: space.xs,
  },
  fanMeterHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fanMeterValue: {
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  pressEmpty: {
    color: color.textMuted,
    fontSize: fontSize.sm,
    paddingVertical: space.sm,
  },
  pressItem: {
    flexDirection: "row",
    gap: space.sm,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  pressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    backgroundColor: color.primary,
  },
  pressBody: { flex: 1, gap: 2 },
  pressTitle: {
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  pressDesc: { color: color.textMuted, fontSize: fontSize.xs },
  finBalance: {
    backgroundColor: color.primaryDim,
    borderRadius: radius.sm,
    padding: space.md,
    gap: 2,
  },
  finBalanceValue: {
    color: color.primary,
    fontSize: fontSize.xl2,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  finBox: {
    flex: 1,
    backgroundColor: color.backgroundElevated,
    borderRadius: radius.sm,
    padding: space.md,
    gap: 2,
  },
  finBoxLabel: {
    color: color.textMuted,
    fontSize: 9,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 0.3,
  },
  finBoxValue: {
    color: color.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  financeUnavailable: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    padding: space.md,
    backgroundColor: color.backgroundElevated,
    borderRadius: radius.sm,
  },
  financeUnavailableText: {
    flex: 1,
    color: color.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  wageBlock: { marginTop: space.md, gap: 4 },
  finRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  finLabel: {
    color: color.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold as "600",
  },
  finValue: {
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  finStrong: { fontWeight: fontWeight.black as "800", fontStyle: "italic" },
  wageNote: {
    color: color.textMuted,
    fontSize: 9,
    fontWeight: fontWeight.semibold as "600",
  },
  flowRow: { flexDirection: "row", gap: space.sm, marginTop: space.md },
  flowItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: color.backgroundElevated,
    borderRadius: radius.sm,
    padding: space.sm,
  },
  flowLabel: { color: color.textMuted, fontSize: 10, flex: 1 },
  flowValue: {
    color: color.text,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
  },
  infraList: { gap: space.md },
  infraRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  infraIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: color.primaryDim,
    alignItems: "center",
    justifyContent: "center",
  },
  infraName: {
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  infraNote: { color: color.textMuted, fontSize: 10, marginTop: 1 },
  levels: { flexDirection: "row", gap: 3 },
  pip: { width: 8, height: 8, borderRadius: 2 },
  stadiumRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stadiumName: {
    color: color.text,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold as "700",
    fontStyle: "italic",
  },
  stadiumCap: {
    color: color.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as "600",
  },
  controlNote: {
    color: color.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
  controlError: { color: color.danger, fontSize: fontSize.xs },
  controlActions: { flexDirection: "row", gap: space.sm },
  switchButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    backgroundColor: color.primary,
    paddingHorizontal: space.sm,
  },
  switchText: {
    color: color.primaryContrast,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black as "800",
  },
  exitButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.danger,
    paddingHorizontal: space.sm,
  },
  exitText: {
    color: color.danger,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black as "800",
  },
  signOutButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.borderStrong,
    marginTop: space.sm,
  },
  signOutText: {
    color: color.text,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black as "800",
    letterSpacing: 0.5,
  },
});
