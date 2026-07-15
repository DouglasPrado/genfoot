import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, space, radius, fontSize, fontWeight, formatAmount } from "@/theme";

export type Currency = "coin" | "gem" | "energy";

const META: Record<Currency, { icon: React.ComponentProps<typeof Ionicons>["name"]; tint: string }> = {
  coin: { icon: "logo-usd", tint: color.coin },
  gem: { icon: "diamond", tint: color.gem },
  energy: { icon: "flash", tint: color.energy },
};

/** Chip de saldo (moeda/gema/energia) com botão "+" — topo da Home. */
export function CurrencyChip({
  currency,
  amount,
  max,
  onAdd,
}: {
  currency: Currency;
  amount: number;
  max?: number;
  onAdd?: () => void;
}) {
  const meta = META[currency];
  const label = max !== undefined ? `${formatAmount(amount)} / ${formatAmount(max)}` : formatAmount(amount);
  return (
    <View style={styles.chip}>
      <Ionicons name={meta.icon} size={14} color={meta.tint} />
      <Text style={styles.amount} numberOfLines={1}>
        {label}
      </Text>
      <Pressable style={styles.plus} onPress={onAdd} hitSlop={6} accessibilityRole="button">
        <Ionicons name="add" size={16} color={color.primaryContrast} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    backgroundColor: color.surface,
    borderColor: color.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingLeft: space.sm,
    paddingRight: space.xs,
    paddingVertical: 3,
  },
  amount: {
    color: color.text,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold as "700",
    minWidth: 42,
  },
  plus: {
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
