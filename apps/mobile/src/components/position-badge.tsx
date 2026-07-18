import { View, Text, StyleSheet } from "react-native";
import { color, fontWeight } from "@/theme";
import type { PositionGroup } from "@/screens/squad/squad-data";

/** Cor por setor — a MESMA da escalação (tokens do campo tático). */
const GROUP_TINT: Record<PositionGroup, string> = {
  GOL: color.energy,
  DEF: color.info,
  MEI: color.primary,
  ATA: color.home,
};

export function positionGroupTint(group: PositionGroup): string {
  return GROUP_TINT[group];
}

/**
 * Badge de posição — o mesmo visual do badge da escalação: rótulo tingido com
 * contorno da cor do setor sobre fundo escuro. Usado no campo, no card e nas
 * listas para manter a identidade consistente.
 */
export function PositionBadge({
  label,
  tint,
}: {
  label: string;
  tint: string;
}) {
  return (
    <View style={[styles.badge, { borderColor: tint }]}>
      <Text style={[styles.text, { color: tint }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 5,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 1,
    backgroundColor: "rgba(10,11,13,0.92)",
  },
  text: {
    fontSize: 10,
    fontWeight: fontWeight.black as "800",
    letterSpacing: 0.3,
  },
});
