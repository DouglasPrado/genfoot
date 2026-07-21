import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Pressable } from "react-native";
import { router } from "expo-router";

import { Card } from "@/components/card";
import { Icon, type IconName } from "@/components/icon";
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

interface InboxItem {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly message: string;
  readonly isRead: boolean;
  readonly createdOn: string;
}

interface InboxItemsProjection {
  readonly items: readonly InboxItem[];
}

/** Ícone por tipo de aviso — o treino tem o seu; o resto cai no sino. */
const ICON_BY_TYPE: Readonly<Record<string, IconName>> = {
  TRAINING_REPORT: "barbell",
  TRANSFER_OFFER: "cart",
  BOARD_MESSAGE: "business",
};

/** Avisos do clube (C12): a LISTA de notificações — treino completo, etc. */
export function Avisos() {
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
  const club = selectManagedClub(
    clubQuery.data,
    onboarding?.kind === "complete" ? onboarding.clubId : null,
  );
  const itemsQuery = useWorldQuery<InboxItemsProjection>(
    club === null ? null : "inbox-items",
    club === null ? undefined : { clubId: club.id },
  );

  const items = itemsQuery.data?.items ?? [];
  const screenState = deriveScreenState({
    session: status,
    hasCachedData: itemsQuery.isStale,
    query:
      clubQuery.state === "loading" || itemsQuery.state === "loading"
        ? "loading"
        : itemsQuery.state === "offline"
          ? "offline"
          : itemsQuery.state === "error"
            ? "error"
            : "ready",
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          accessibilityState={{}}
          hitSlop={8}
          style={styles.back}
        >
          <Icon name="arrow-back" size={22} color={color.text} />
        </Pressable>
        <Text style={styles.headerTitle}>AVISOS</Text>
        <View style={styles.back} />
      </View>

      {screenState !== "success" || club === null ? (
        <View style={styles.content}>
          <ScreenStatePanel
            state={screenState === "success" ? "empty" : screenState}
            onRetry={itemsQuery.refetch}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<Refresh onRefresh={itemsQuery.refetch} />}
        >
          {items.length === 0 ? (
            <Card>
              <Text style={styles.empty}>
                Nenhum aviso por enquanto. Quando um treino completar na virada do
                dia, o relatório aparece aqui.
              </Text>
            </Card>
          ) : (
            <Card>
              {items.map((item, i) => (
                <View
                  key={item.id}
                  style={[styles.row, i === 0 && styles.rowFirst]}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      !item.isRead && styles.iconWrapUnread,
                    ]}
                  >
                    <Icon
                      name={ICON_BY_TYPE[item.type] ?? "notifications"}
                      size={16}
                      color={!item.isRead ? color.primary : color.textMuted}
                    />
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.title} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.message} numberOfLines={2}>
                      {item.message}
                    </Text>
                  </View>
                  <Text style={styles.date}>{item.createdOn.slice(5)}</Text>
                </View>
              ))}
            </Card>
          )}
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
  empty: {
    color: color.textMuted,
    fontSize: fontSize.sm,
    paddingVertical: space.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.border,
  },
  rowFirst: { borderTopWidth: 0 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surface,
  },
  iconWrapUnread: { backgroundColor: color.surfaceRaised },
  info: { flex: 1, gap: 2 },
  title: {
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
  message: { color: color.textMuted, fontSize: fontSize.xs },
  date: { color: color.textFaint, fontSize: fontSize.xs },
});
