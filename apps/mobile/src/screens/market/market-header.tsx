import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CurrencyChip } from "@/components/currency-chip";
import { HOME_SEED } from "@/screens/home/home-data";
import { color, space, radius, fontSize, fontWeight } from "@/theme";
import type { Temperature } from "./market-data";

const TEMP: Record<Temperature, { label: string; tint: string; icon: React.ComponentProps<typeof Ionicons>["name"] }> = {
  cold: { label: "FRIO", tint: color.info, icon: "snow" },
  warm: { label: "MORNO", tint: color.warning, icon: "thermometer" },
  hot: { label: "QUENTE", tint: color.danger, icon: "flame" },
};

/** Strip de saldo + sino, título MERCADO e card de temperatura do mercado. */
export function MarketHeader({
  temperature,
  note,
  onReport,
}: {
  temperature: Temperature;
  note: string;
  onReport?: () => void;
}) {
  const t = TEMP[temperature];
  return (
    <View style={styles.root}>
      <View style={styles.topStrip}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>{HOME_SEED.club.name.charAt(0)}</Text>
        </View>
        <View style={styles.wallet}>
          {HOME_SEED.wallet.map((w) => (
            <CurrencyChip key={w.currency} currency={w.currency} amount={w.amount} {...(w.max !== undefined ? { max: w.max } : {})} />
          ))}
        </View>
        <Pressable hitSlop={8} accessibilityRole="button">
          <Ionicons name="notifications-outline" size={20} color={color.text} />
        </Pressable>
      </View>

      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>MERCADO</Text>
          <Text style={styles.subtitle}>TRANSFERÊNCIAS</Text>
        </View>
        <View style={styles.tempCard}>
          <View style={styles.tempMain}>
            <Text style={styles.tempLabel}>TEMPERATURA DO MERCADO</Text>
            <View style={styles.tempRow}>
              <Ionicons name={t.icon} size={18} color={t.tint} />
              <Text style={[styles.tempValue, { color: t.tint }]}>{t.label}</Text>
            </View>
          </View>
          <Text style={styles.tempNote}>{note}</Text>
          <Pressable style={styles.reportBtn} onPress={onReport} accessibilityRole="button">
            <Ionicons name="trending-up" size={13} color={color.primary} />
            <Text style={styles.reportText}>VER RELATÓRIO</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md },
  topStrip: { flexDirection: "row", alignItems: "center", gap: space.sm },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { color: color.primary, fontSize: fontSize.md, fontWeight: fontWeight.black as "800", fontStyle: "italic" },
  wallet: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: space.xs, justifyContent: "flex-end" },
  titleRow: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  titleBlock: { justifyContent: "center" },
  title: { color: color.text, fontSize: fontSize.xl2, fontWeight: fontWeight.black as "800", fontStyle: "italic", letterSpacing: 0.5 },
  subtitle: { color: color.primary, fontSize: fontSize.md, fontWeight: fontWeight.bold as "700", fontStyle: "italic", letterSpacing: 1, marginTop: -4 },
  tempCard: {
    flex: 1,
    backgroundColor: color.surface,
    borderColor: color.borderStrong,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    gap: 4,
  },
  tempMain: {},
  tempLabel: { color: color.textMuted, fontSize: 9, fontWeight: fontWeight.bold as "700", letterSpacing: 0.5 },
  tempRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  tempValue: { fontSize: fontSize.lg, fontWeight: fontWeight.black as "800", fontStyle: "italic" },
  tempNote: { color: color.textMuted, fontSize: 10, lineHeight: 14 },
  reportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: color.primaryDim,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    marginTop: 2,
  },
  reportText: { color: color.primary, fontSize: 10, fontWeight: fontWeight.black as "800", fontStyle: "italic", letterSpacing: 0.5 },
});
