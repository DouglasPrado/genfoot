import { View, Text, Pressable, StyleSheet } from "react-native";
import { Icon, type IconName } from "@/components/icon";
import { Card, SectionHeader } from "@/components/card";
import { color, space, radius, fontSize, fontWeight } from "@/theme";
import { QUICK_ACTIONS } from "./match-data";

/** Grade de ações rápidas do controle da partida. */
export function QuickActions({ onAction }: { onAction?: (id: string) => void }) {
  return (
    <Card>
      <SectionHeader title="AÇÕES RÁPIDAS" />
      <View style={styles.grid}>
        {QUICK_ACTIONS.map((a) => {
          const active = "active" in a && a.active;
          return (
            <Pressable
              key={a.id}
              style={[styles.action, active ? styles.actionActive : null]}
              onPress={() => onAction?.(a.id)}
              accessibilityRole="button"
            >
              <Icon name={a.icon} size={22} color={active ? color.primary : color.text} />
              <Text style={[styles.label, active ? styles.labelActive : null]} numberOfLines={1}>
                {a.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  action: {
    width: "22%",
    minWidth: 70,
    flexGrow: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: color.backgroundElevated,
    borderColor: color.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 4,
  },
  actionActive: { borderColor: color.primary, backgroundColor: "#151c0e" },
  label: { color: color.textMuted, fontSize: 9, fontWeight: fontWeight.bold as "700", letterSpacing: 0.3, textAlign: "center" },
  labelActive: { color: color.primary },
});
