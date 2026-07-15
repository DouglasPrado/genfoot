import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { color, space, fontSize, fontWeight } from "@/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

/** Tela ainda não construída — mantém o app navegável enquanto iteramos. */
export function Placeholder({
  title,
  icon,
  hint,
}: {
  title: string;
  icon: IoniconName;
  hint: string;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.center}>
        <Ionicons name={icon} size={48} color={color.primary} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xl2, gap: space.md },
  title: {
    color: color.text,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    letterSpacing: 0.5,
  },
  hint: { color: color.textMuted, fontSize: fontSize.sm, textAlign: "center" },
});
