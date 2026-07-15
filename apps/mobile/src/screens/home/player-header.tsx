import { View, Text, StyleSheet } from "react-native";
import { CurrencyChip } from "@/components/currency-chip";
import { ProgressBar } from "@/components/progress-bar";
import { color, space, radius, fontSize, fontWeight, formatAmount } from "@/theme";
import type { HomeViewModel } from "./home-data";

/** Faixa superior: avatar com anel neon, clube/nível/XP e chips de saldo. */
export function PlayerHeader({ club, wallet }: Pick<HomeViewModel, "club" | "wallet">) {
  return (
    <View style={styles.root}>
      <View style={styles.identity}>
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{club.name.charAt(0)}</Text>
          </View>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {club.name}
          </Text>
          <Text style={styles.level}>NÍVEL {club.level}</Text>
          <View style={styles.xpRow}>
            <ProgressBar value={club.xp / club.xpMax} height={5} />
          </View>
          <Text style={styles.xpLabel}>
            XP {formatAmount(club.xp)} / {formatAmount(club.xpMax)}
          </Text>
        </View>
      </View>
      <View style={styles.wallet}>
        {wallet.map((w) => (
          <CurrencyChip
            key={w.currency}
            currency={w.currency}
            amount={w.amount}
            {...(w.max !== undefined ? { max: w.max } : {})}
          />
        ))}
      </View>
    </View>
  );
}

const RING = 64;
const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    gap: space.md,
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  identity: { flexDirection: "row", gap: space.md, flex: 1, alignItems: "center" },
  avatarRing: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 2.5,
    borderColor: color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: RING - 10,
    height: RING - 10,
    borderRadius: (RING - 10) / 2,
    backgroundColor: color.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: color.primary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
  },
  info: { flex: 1, minWidth: 0 },
  name: {
    color: color.text,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    letterSpacing: 0.5,
  },
  level: {
    color: color.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
    letterSpacing: 1,
    marginTop: 1,
  },
  xpRow: { marginTop: space.xs, borderRadius: radius.pill },
  xpLabel: { color: color.textFaint, fontSize: 10, marginTop: 3, fontWeight: fontWeight.semibold as "600" },
  wallet: { gap: space.xs, alignItems: "stretch" },
});
