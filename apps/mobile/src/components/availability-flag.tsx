import { StyleSheet, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/icon";
import { availabilityFlag } from "@/lib/availability";
import { color, fontWeight, radius } from "@/theme";

/**
 * Selo compacto de LESÃO/SUSPENSÃO ao lado do nome do jogador na listagem
 * padrão. Decisão (rótulo/ícone/tom) vem de `availabilityFlag` (puro, testado);
 * este componente só pinta. Jogador apto (ou em treino/convocado) → nada.
 */
export function AvailabilityFlag({ availability }: { availability: string }) {
  const flag = availabilityFlag(availability);
  if (flag === null) return null;
  const tint = flag.tone === "danger" ? color.danger : color.warning;
  return (
    <View
      style={[styles.flag, { borderColor: tint }]}
      accessibilityLabel={flag.label}
    >
      <Icon name={flag.icon as IconName} size={9} color={tint} />
      <Text style={[styles.text, { color: tint }]}>{flag.short}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  text: {
    fontSize: 9,
    fontWeight: fontWeight.black as "800",
    letterSpacing: 0.5,
  },
});
