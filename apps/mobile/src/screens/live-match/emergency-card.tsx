import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { color, space, radius, fontSize, fontWeight } from "@/theme";
import type { MatchViewModel } from "./match-data";

type Emergency = NonNullable<MatchViewModel["emergency"]>;

/** Alerta de emergência com janela de tempo e opções de resposta (risco alto). */
export function EmergencyCard({
  emergency,
  onChoose,
}: {
  emergency: Emergency;
  onChoose?: (optionId: string) => void;
}) {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.heading}>EMERGÊNCIA</Text>
        <Text style={styles.expires}>
          • EXPIRA EM <Text style={styles.expiresTime}>{emergency.expiresInLabel}</Text>
        </Text>
      </View>
      <View style={styles.alert}>
        <View style={styles.alertIcon}>
          <Ionicons name="shirt" size={20} color={color.danger} />
        </View>
        <View style={styles.alertBody}>
          <Text style={styles.alertTitle}>{emergency.title}</Text>
          <Text style={styles.alertDetail}>{emergency.detail}</Text>
        </View>
      </View>
      <View style={styles.options}>
        {emergency.options.map((o) => (
          <Pressable key={o.id} style={styles.option} onPress={() => onChoose?.(o.id)} accessibilityRole="button">
            <View style={styles.optionText}>
              <Text style={styles.optionLabel} numberOfLines={1}>
                {o.label}
              </Text>
              <Text style={styles.optionTag}>({o.tag})</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={color.textMuted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderWidth: 1,
    borderColor: color.danger,
    borderRadius: radius.lg,
    padding: space.lg,
    backgroundColor: "#1a0e0e",
    gap: space.md,
  },
  header: { flexDirection: "row", alignItems: "center", gap: space.sm },
  heading: { color: color.text, fontSize: fontSize.md, fontWeight: fontWeight.black as "800", fontStyle: "italic", letterSpacing: 0.5 },
  expires: { color: color.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.semibold as "600" },
  expiresTime: { color: color.danger, fontWeight: fontWeight.bold as "700" },
  alert: { flexDirection: "row", alignItems: "center", gap: space.md },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: "#2a1212",
    borderWidth: 1,
    borderColor: color.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  alertBody: { flex: 1 },
  alertTitle: { color: color.text, fontSize: fontSize.sm, fontWeight: fontWeight.bold as "700" },
  alertDetail: { color: color.textMuted, fontSize: fontSize.xs, marginTop: 2 },
  options: { gap: space.sm },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: color.backgroundElevated,
    borderColor: color.borderStrong,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  optionText: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  optionLabel: { color: color.text, fontSize: fontSize.xs, fontWeight: fontWeight.bold as "700", letterSpacing: 0.3 },
  optionTag: { color: color.textMuted, fontSize: 10, fontWeight: fontWeight.semibold as "600" },
});
