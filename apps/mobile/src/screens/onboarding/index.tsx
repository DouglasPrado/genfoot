import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CommandTrackingStatus } from "@grinta/core";

import { Icon } from "@/components/icon";
/**
 * O que a tela precisa de `club-detail`: o clube com nome PLANO.
 *
 * O read model de C3 resolve o período de identidade — o clube não tem nome, tem
 * HISTÓRIA de nomes (BC-003), e a tela não tem por que saber disso. Era
 * `club.name` quando a query devolvia o portfólio inteiro; o portfólio
 * morreu com o mega-agregado (R-175).
 */
interface OnboardingClub {
  readonly id: string;
  readonly name: string;
  readonly shortCode: string;
  readonly status: string;
  readonly stadiumName: string;
  readonly stadiumCapacity: number;
  /**
   * A identidade visual do período vigente (R-211). Anulável porque a coluna é:
   * mundo semeado antes da R-211 tem clube sem cara, e a lista cai no
   * placeholder em vez de renderizar escudo inventado no cliente.
   */
  readonly crestTemplateId: string | null;
  readonly primaryColor: string | null;
  readonly secondaryColor: string | null;
  /** `null` = IA. Clube com gestor não entra na lista (R-180). */
  readonly manager: { readonly accountId: string; readonly name: string } | null;
  /** Reservado por alguém que ainda decide (R-25). Aparece, mas bloqueado. */
  readonly reservedUntil: string | null;
}

interface OnboardingClubList {
  readonly clubs: readonly OnboardingClub[];
}
import {
  submitTrackedCommand,
  type TrackedCommandResult,
} from "@/lib/command-orchestrator";
import { ClubCrest } from "@/screens/club/customization/crest";
import { useSession } from "@/lib/session";
import { useWorldId, useWorldQuery, useWorldsList } from "@/lib/world";
import { useWorldSelection } from "@/lib/world-selection";
import { WorldList } from "./world-list";
import { color, fontSize, fontWeight, radius, space } from "@/theme";
import {
  addWorldDays,
  deriveOnboardingStep,
  projectionAdvancedPast,
  type MobileIdentityProjection,
  type OnboardingStep,
} from "./onboarding-model";

interface WorldProjection {
  readonly currentDate: string;
}

const COPY = {
  // `initialize` e `register-account` saíram: os commands não existem mais
  // (R-175 / R-172). O que entrou no lugar diz a verdade — ou a sessão não tem
  // conta, ou a projeção ainda não chegou.
  authenticate: ["ENTRAR", "Faça login para assumir um clube neste mundo."],
  loading: ["CARREGANDO", "Buscando sua situação neste mundo."],
  "join-world": [
    "ENTRAR NO MUNDO",
    "Registre sua participação antes de escolher um clube.",
  ],
  cooldown: [
    "TROCA EM ESPERA",
    "O período de espera protege a continuidade do clube. Avance a data do mundo antes de escolher outro.",
  ],
  "choose-club": [
    "ESCOLHER CLUBE",
    "Selecione o clube que deseja administrar.",
  ],
  "confirm-control": [
    "CONFIRMAR CONTROLE",
    "Revise a reserva e assuma oficialmente o clube.",
  ],
  complete: [
    "CLUBE ATIVADO",
    "Seu controle foi confirmado pela projeção oficial.",
  ],
} as const;
/**
 * As etapas do onboarding, na ordem — é o que a barra de progresso mede.
 *
 * `authenticate` e `loading` ficam FORA: não são etapas, são estados de "ainda
 * não dá para começar". Contá-las diria ao jogador que ele já andou dois passos
 * antes de fazer coisa alguma. `indexOf` devolve -1 para elas, e a barra trata.
 */
const STEP_ORDER = [
  "join-world",
  "cooldown",
  "choose-club",
  "confirm-control",
  "complete",
] as const;

/** GP-001: entrada real no mundo e ativação do controle de clube. */
export function Onboarding() {
  const worldId = useWorldId();
  const worldSelection = useWorldSelection();
  const worldsList = useWorldsList();
  const { client, session, status, contractVersion } = useSession();
  const worldQuery = useWorldQuery<WorldProjection>("world");
  const identityQuery =
    useWorldQuery<MobileIdentityProjection>("identity-detail");
    // `club` devolve CONTADOR; a lista está em `club-detail` — a porta de leitura
  // é estreita de propósito (R-175), e a tela que quer lista pede a lista.
  const clubQuery = useWorldQuery<OnboardingClubList>("club-detail");
  /**
   * O `accountId` vem da SESSÃO: o `/auth/session` verifica o token do provedor
   * e resolve a conta do jogo (R-171/R-172). A tela não garimpa mais a conta na
   * projeção — o campo `accounts[]` que ela procurava nunca existiu no read
   * model, e o app ficava preso em "registrar conta" para sempre.
   */
  const accountId = session?.accountId ?? null;
  const identity = identityQuery.state === "empty" ? null : identityQuery.data;
  const step = deriveOnboardingStep(
    identity,
    accountId,
    worldQuery.data?.currentDate ?? "",
  );
  /**
   * O que o jogador pode escolher.
   *
   * **Clube com gestor SOME** — ele tem dono, e a API responderia
   * `CLUB_ALREADY_CONTROLLED`. Oferecer o que já é de alguém é convidar para uma
   * recusa. Sem gestor é a IA que toca (R-180: a IA é a AUSÊNCIA de controle).
   *
   * **Clube reservado FICA, bloqueado.** É retenção mole com prazo (R-25): quem
   * reservou pode desistir ou o prazo vencer, e o clube volta ao pool em
   * minutos. Sumir com ele diria que acabou, quando não acabou — e o jogador
   * nunca saberia que o clube que ele quer está a um prazo de distância. É
   * exatamente a distinção que os dois errorCodes fazem (R-186), agora visível
   * ANTES de tentar.
   */
  const clubs =
    clubQuery.data?.clubs.filter(
      (club) => club.status === "ACTIVE" && club.manager === null,
    ) ?? [];
  const disponiveis = clubs.filter((club) => club.reservedUntil === null);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const selectedClub = useMemo(
    // O default cai no primeiro DISPONÍVEL, não no primeiro da lista: abrir a
    // tela com um clube reservado pré-selecionado deixaria o botão de reservar
    // apontando para uma recusa certa.
    () =>
      clubs.find((club) => club.id === selectedClubId) ??
      disponiveis[0] ??
      null,
    [clubs, disponiveis, selectedClubId],
  );
  const [tracking, setTracking] = useState<TrackedCommandResult | null>(null);
  const [submittedStep, setSubmittedStep] = useState<
    OnboardingStep["kind"] | null
  >(null);
  const busy =
    tracking?.status === CommandTrackingStatus.SUBMITTING ||
    tracking?.status === CommandTrackingStatus.ACCEPTED ||
    tracking?.status === CommandTrackingStatus.UNKNOWN_RECOVERING;

  const refresh = useCallback(() => {
    worldQuery.refetch();
    identityQuery.refetch();
    clubQuery.refetch();
  }, [clubQuery.refetch, identityQuery.refetch, worldQuery.refetch]);

  const execute = useCallback(
    async (
      commandType: string,
      payload: Record<string, unknown>,
      idempotencyKey: string,
    ) => {
      // `worldId` nulo aqui é inalcançável: sem mundo escolhido a tela é a
      // LISTA, e nenhum destes commands tem botão. O guarda existe para o tipo
      // dizer a verdade em vez de um `!` que esconde a suposição.
      if (client === null || contractVersion === null || worldId === null)
        return;
      const correlationId = `mobile:${idempotencyKey}`;
      setSubmittedStep(step.kind);
      setTracking({
        status: CommandTrackingStatus.SUBMITTING,
        commandId: null,
        resource: null,
        correlationId,
        errorCode: null,
      });
      const result = await submitTrackedCommand(client, {
        clientContractVersion: "v1",
        serverContractVersion: contractVersion,
        commandType,
        worldId,
        payload,
        idempotencyKey,
        correlationId,
      });
      setTracking(result);
      if (
        result.status === CommandTrackingStatus.ACCEPTED ||
        result.status === CommandTrackingStatus.APPLIED
      )
        identityQuery.refetch();
    },
    [client, contractVersion, identityQuery.refetch, step.kind, worldId],
  );

  useEffect(() => {
    if (
      tracking !== null &&
      (tracking.status === CommandTrackingStatus.ACCEPTED ||
        tracking.status === CommandTrackingStatus.APPLIED) &&
      projectionAdvancedPast(submittedStep, step.kind)
    ) {
      setTracking(null);
      setSubmittedStep(null);
    }
  }, [step.kind, submittedStep, tracking]);

  const act = useCallback(() => {
    const worldDate = worldQuery.data?.currentDate ?? "2026-01-01";
    // `identity:initialize` e `identity:register-account` NÃO EXISTEM MAIS. O
    // primeiro era do mega-agregado de identidade (R-175): não há agregado do
    // mundo para inicializar — os roots nascem quando o jogador age. O segundo
    // morreu com a conta virando global (R-172): ela nasce no /auth/session, a
    // partir do token verificado do Clerk.
    if (step.kind === "join-world")
      return void execute(
        "identity:join-world",
        { accountId: step.accountId, gameWorldId: worldId },
        `join:${step.accountId}:${worldId}`,
      );
    if (step.kind === "cooldown") {
      refresh();
      return;
    }
    if (step.kind === "choose-club" && selectedClub !== null) {
      const expiresOn = addWorldDays(worldDate, 7);
      Alert.alert(
        "Reservar clube?",
        `${selectedClub.name} ficará reservado até ${expiresOn}.`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Reservar",
            onPress: () =>
              void execute(
                step.switchMode
                  ? "identity:request-switch"
                  : "identity:reserve-club",
                // `request-switch` É um `reserve-club` por dentro — mesmo
                // input. O `targetClubId` que estava aqui não existe em lado
                // nenhum: era um campo inventado que o barramento ignorava em
                // silêncio e o domínio recusava.
                {
                  accountId: step.accountId,
                  clubId: selectedClub.id,
                  expiresOn,
                },
                `${step.switchMode ? "switch" : "reserve"}:${step.accountId}:${selectedClub.id}`,
              ),
          },
        ],
      );
      return;
    }
    if (step.kind === "confirm-control") {
      /**
       * Risco ALTO no catálogo (`10-catalogo-de-commands.md:81`): assumir o
       * clube é assumir o ESTADO HERDADO — dívidas, contratos, promessas. O
       * `acceptInheritedState` é essa confirmação, e o barramento a exige como
       * `literal(true)`.
       *
       * Por isso o texto DIZ o que se herda. Mandar `true` com um alerta
       * genérico seria cumprir o tipo e furar a regra: o campo existe para o
       * jogador consentir com o que vem junto, não para o cliente marcar sozinho.
       */
      Alert.alert(
        "Assumir o clube?",
        "Você assume o clube COM TUDO que ele tem hoje: dívidas, contratos e " +
          "promessas da diretoria. Sair ou trocar depois aplica período de espera.",
        [
          { text: "Revisar", style: "cancel" },
          {
            text: "Aceito e assumo",
            onPress: () =>
              void execute(
                "identity:confirm-onboarding",
                {
                  reservationId: step.reservationId,
                  acceptInheritedState: true,
                },
                `confirm:${step.reservationId}`,
              ),
          },
        ],
      );
      return;
    }
    if (step.kind === "complete") router.replace("/inicio");
  }, [
    execute,
    refresh,
    selectedClub,
    step,
    worldId,
    worldQuery.data?.currentDate,
  ]);

  const [title, body] = COPY[step.kind];
  const loading =
    status === "connecting" ||
    worldQuery.state === "loading" ||
    clubQuery.state === "loading" ||
    identityQuery.state === "loading";
  const technicalError =
    worldQuery.state === "error" ||
    clubQuery.state === "error" ||
    identityQuery.state === "error";
  // `indexOf` devolve -1 em `authenticate`/`loading`, que não são etapas do
  // onboarding — a barra fica em zero em vez de fingir progresso.
  const stepIndex = STEP_ORDER.indexOf(step.kind as (typeof STEP_ORDER)[number]);

  /**
   * Sem mundo escolhido, a tela é a LISTA (R-208) — não há onboarding a fazer
   * antes de saber em que mundo. Vem antes de tudo: as demais queries são
   * escopadas num mundo, e sem ele todas ficariam presas em `loading`.
   */
  if (!worldSelection.loading && worldSelection.worldId === null) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.content}>
          <View style={styles.brand}>
            <View style={styles.brandIcon}>
              <Icon name="shield" size={28} color={color.primary} />
            </View>
            <View>
              <Text style={styles.eyebrow}>GRINTA · ESCOLHA O MUNDO</Text>
              <Text style={styles.heading}>ONDE VOCÊ VAI JOGAR</Text>
            </View>
          </View>
          <WorldList
            worlds={worldsList.worlds}
            state={worldsList.state}
            authenticated={accountId !== null}
            onSelect={worldSelection.selectWorld}
            onRetry={worldsList.refetch}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brand}>
          <View style={styles.brandIcon}>
            <Icon name="shield" size={28} color={color.primary} />
          </View>
          <View>
            <Text style={styles.eyebrow}>GRINTA · NOVO CONTROLE</Text>
            <Text style={styles.heading}>COMANDE UM CLUBE</Text>
          </View>
        </View>
        <View
          style={styles.progress}
          accessibilityLabel={`Etapa ${Math.min(5, stepIndex + 1)} de 5`}
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressBar,
                index <= stepIndex ? styles.progressActive : null,
              ]}
            />
          ))}
        </View>
        <View style={styles.card}>
          {loading ? (
            <ActivityIndicator color={color.primary} size="large" />
          ) : null}
          {!loading ? (
            <Text style={styles.title}>
              {technicalError ? "NÃO FOI POSSÍVEL CONTINUAR" : title}
            </Text>
          ) : null}
          {!loading ? (
            <Text style={styles.body}>
              {technicalError
                ? "A projeção oficial não respondeu. Seu progresso não foi alterado."
                : body}
            </Text>
          ) : null}
          {!loading && !technicalError && step.kind === "choose-club" ? (
            <View style={styles.clubList}>
              {clubs.map((club) => {
                const reservado = club.reservedUntil !== null;
                const selected = club.id === selectedClub?.id;
                return (
                  <Pressable
                    key={club.id}
                    style={[
                      styles.clubRow,
                      selected ? styles.clubSelected : null,
                      reservado ? styles.clubReserved : null,
                    ]}
                    // Reservado não é clicável: a API recusaria com
                    // CLUB_SLOT_UNAVAILABLE, e deixar clicar seria oferecer um
                    // erro. Ele fica visível porque volta ao pool no prazo.
                    disabled={reservado}
                    onPress={() => setSelectedClubId(club.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected, disabled: reservado }}
                    accessibilityLabel={
                      reservado
                        ? `${club.name}, reservado até ${club.reservedUntil}`
                        : `Selecionar ${club.name}`
                    }
                  >
                    {club.crestTemplateId !== null &&
                    club.primaryColor !== null &&
                    club.secondaryColor !== null ? (
                      <ClubCrest
                        templateId={club.crestTemplateId}
                        primary={club.primaryColor}
                        secondary={club.secondaryColor}
                        tertiary={null}
                        letter={club.name.slice(0, 1).toUpperCase()}
                        size={46}
                      />
                    ) : (
                      // Sem identidade no dado, o placeholder fica. Desenhar um
                      // escudo com cor sorteada aqui seria o cliente inventando
                      // fato do mundo (§6) — e ele mudaria quando a gênese
                      // atribuísse a identidade de verdade.
                      <View style={styles.clubCrest}>
                        <Text style={styles.clubInitial}>{club.shortCode}</Text>
                      </View>
                    )}
                    <View style={styles.clubInfo}>
                      <Text style={styles.clubName}>{club.name}</Text>
                      <Text style={styles.clubMeta}>
                        {reservado
                          ? `Reservado até ${club.reservedUntil} — pode voltar`
                          : `${club.stadiumName} · ${club.stadiumCapacity.toLocaleString("pt-BR")} lugares`}
                      </Text>
                    </View>
                    {reservado ? (
                      <Icon name="time-outline" size={20} color={color.textMuted} />
                    ) : selected ? (
                      <Icon
                        name="checkmark-circle"
                        size={20}
                        color={color.primary}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {tracking?.status === CommandTrackingStatus.REJECTED ? (
            <View style={styles.errorBox}>
              <Icon name="warning" size={17} color={color.danger} />
              <Text style={styles.errorText}>
                {tracking.errorCode ?? "COMMAND_REJECTED"}
              </Text>
            </View>
          ) : null}
          {!loading ? (
            <Pressable
              style={[styles.cta, busy ? styles.ctaDisabled : null]}
              onPress={technicalError ? refresh : act}
              disabled={
                busy || (step.kind === "choose-club" && selectedClub === null)
              }
              accessibilityRole="button"
              accessibilityLabel={technicalError ? "Tentar novamente" : title}
            >
              {busy ? (
                <ActivityIndicator color={color.primaryContrast} />
              ) : null}
              <Text style={styles.ctaText}>
                {technicalError
                  ? "TENTAR NOVAMENTE"
                  : step.kind === "complete"
                    ? "IR PARA A CENTRAL"
                    : title}
              </Text>
              {!busy ? (
                <Icon
                  name="chevron-forward"
                  size={17}
                  color={color.primaryContrast}
                />
              ) : null}
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.footnote}>
          Cada etapa só avança depois que o backend confirma o efeito na
          projeção oficial.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  content: { padding: space.lg, gap: space.lg, paddingBottom: space.xl2 },
  brand: { flexDirection: "row", alignItems: "center", gap: space.md },
  brandIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: color.primary,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    color: color.primary,
    fontSize: 10,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 1,
  },
  heading: {
    color: color.text,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  progress: { flexDirection: "row", gap: space.xs },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: color.surfaceRaised,
  },
  progressActive: { backgroundColor: color.primary },
  card: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.borderStrong,
    borderRadius: radius.lg,
    padding: space.xl,
    gap: space.md,
  },
  title: {
    color: color.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  body: { color: color.textMuted, fontSize: fontSize.sm, lineHeight: 20 },
  clubList: { gap: space.sm },
  clubRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    padding: space.sm,
    backgroundColor: color.backgroundElevated,
  },
  clubReserved: { opacity: 0.45 },
  clubSelected: { borderColor: color.primary, backgroundColor: "#151c0e" },
  clubCrest: {
    width: 42,
    height: 46,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.primaryDim,
    alignItems: "center",
    justifyContent: "center",
  },
  clubInitial: {
    color: color.primary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  clubInfo: { flex: 1 },
  clubName: {
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  clubMeta: { color: color.textMuted, fontSize: 9, marginTop: 2 },
  cta: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    borderRadius: radius.sm,
    backgroundColor: color.primary,
    paddingHorizontal: space.md,
  },
  ctaDisabled: { opacity: 0.55 },
  ctaText: {
    color: color.primaryContrast,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.sm,
    backgroundColor: color.backgroundElevated,
  },
  errorText: { color: color.danger, fontSize: fontSize.xs, flex: 1 },
  footnote: {
    color: color.textFaint,
    fontSize: fontSize.xs,
    lineHeight: 17,
    textAlign: "center",
  },
});
