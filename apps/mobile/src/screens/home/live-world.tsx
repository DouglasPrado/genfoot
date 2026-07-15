import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Icon } from "@/components/icon";
import { useSession } from "@/lib/session";
import { useWorldQuery, useWorldId } from "@/lib/world";
import { color, space, radius, fontSize, fontWeight, formatAmount } from "@/theme";

interface WorldSnapshot {
  readonly currentDate: string;
  readonly status: string;
  readonly rulesetVersion: string;
}
interface ClubData {
  readonly clubs: readonly unknown[];
}
interface PlayersData {
  readonly playerCount: number;
}

function Stat({ icon, label, value, tint }: { icon: React.ComponentProps<typeof Icon>["name"]; label: string; value: string; tint?: string }) {
  return (
    <View style={styles.stat}>
      <Icon name={icon} size={16} color={tint ?? color.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/**
 * Card "Mundo ao vivo": consulta o mundo real (snapshot + clubes + jogadores)
 * da API e mostra o estado vivo. É a prova de que o app opera sobre dados de
 * domínio reais — não sobre o seed de apresentação das demais seções.
 */
export function LiveWorld() {
  const { status: session, contractVersion, retry } = useSession();
  const worldId = useWorldId();
  const world = useWorldQuery<WorldSnapshot>("world");
  const club = useWorldQuery<ClubData>("club");
  const players = useWorldQuery<PlayersData>("players");

  const offline = session === "offline" || world.state === "offline";
  if (offline) {
    return (
      <Pressable style={[styles.card, styles.rowCenter]} onPress={retry} accessibilityRole="button">
        <Icon name="ellipse" size={8} color={color.danger} />
        <Text style={styles.muted}>API offline — toque para reconectar</Text>
      </Pressable>
    );
  }

  if (world.state === "loading" || session === "connecting") {
    return (
      <View style={[styles.card, styles.rowCenter]}>
        <ActivityIndicator size="small" color={color.primary} />
        <Text style={styles.muted}>Carregando mundo…</Text>
      </View>
    );
  }

  if (world.state === "error") {
    return (
      <Pressable style={[styles.card, styles.rowCenter]} onPress={world.refetch} accessibilityRole="button">
        <Icon name="warning" size={14} color={color.warning} />
        <Text style={styles.muted}>Mundo indisponível ({world.errorCode ?? "erro"}) — tocar p/ tentar</Text>
      </Pressable>
    );
  }

  const w = world.data;
  const clubCount = club.data?.clubs?.length ?? 0;
  const playerCount = players.data?.playerCount ?? 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.rowCenter}>
          <Icon name="ellipse" size={8} color={color.success} />
          <Text style={styles.title}>MUNDO AO VIVO</Text>
        </View>
        <Text style={styles.badge}>
          {w?.status ?? "—"}
          {contractVersion ? ` · ${contractVersion}` : ""}
        </Text>
      </View>
      <View style={styles.stats}>
        <Stat icon="time" label="DATA" value={w?.currentDate ?? "—"} />
        <View style={styles.divider} />
        <Stat icon="shield" label="CLUBES" value={club.state === "ready" ? String(clubCount) : "—"} />
        <View style={styles.divider} />
        <Stat icon="people" label="JOGADORES" value={players.state === "ready" ? formatAmount(playerCount) : "—"} />
      </View>
      <Text style={styles.worldId}>mundo {worldId.slice(0, 8)} · ruleset {w?.rulesetVersion ?? "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderColor: color.primaryDim,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: space.sm },
  muted: { color: color.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold as "600" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: color.primary, fontSize: fontSize.xs, fontWeight: fontWeight.black as "800", fontStyle: "italic", letterSpacing: 0.5 },
  badge: { color: color.textMuted, fontSize: 10, fontWeight: fontWeight.bold as "700", letterSpacing: 0.5 },
  stats: { flexDirection: "row", alignItems: "center" },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { color: color.text, fontSize: fontSize.md, fontWeight: fontWeight.black as "800", fontStyle: "italic" },
  statLabel: { color: color.textMuted, fontSize: 9, fontWeight: fontWeight.bold as "700", letterSpacing: 0.5 },
  divider: { width: 1, height: 30, backgroundColor: color.border },
  worldId: { color: color.textFaint, fontSize: 9, fontWeight: fontWeight.semibold as "600", textAlign: "center" },
});
