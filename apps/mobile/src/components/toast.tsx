import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Feedback, FeedbackTone } from "@/lib/command-feedback";
import { color, fontSize, fontWeight, radius, space } from "@/theme";

/**
 * Toasts globais. Uma tela dispara `show({tone, text})` e o host os desenha no
 * topo, empilhados, com auto-dismiss. É a resposta ao "erros devem exibir como
 * toast e ser claros": a mensagem já vem traduzida de `command-feedback`.
 */
interface ToastItem extends Feedback {
  readonly id: number;
}

interface ToastApi {
  show: (feedback: Feedback) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Quanto tempo cada toast fica na tela. Erro fica mais para dar tempo de ler. */
const DURATION_MS: Readonly<Record<FeedbackTone, number>> = {
  success: 2500,
  info: 3000,
  error: 4500,
};

export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const [items, setItems] = useState<readonly ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (feedback: Feedback) => {
      const id = nextId.current;
      nextId.current += 1;
      setItems((current) => [...current, { ...feedback, id }]);
      // Auto-dismiss. setTimeout é efeito de UI (não é regra de domínio), então
      // é legítimo aqui — a lógica testável mora em command-feedback.
      setTimeout(() => dismiss(id), DURATION_MS[feedback.tone]);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <SafeAreaView pointerEvents="box-none" style={styles.host} edges={["top"]}>
        {items.map((t) => (
          <ToastCard key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </SafeAreaView>
    </ToastContext.Provider>
  );
}

/** Dispara toasts. Fora do provider, vira no-op — a tela não quebra por isso. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  return api ?? NOOP;
}

const NOOP: ToastApi = { show: () => undefined };

function ToastCard({
  item,
  onDismiss,
}: {
  readonly item: ToastItem;
  readonly onDismiss: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  // Fade-in ao montar. Sem Date.now/Math.random — só animação de UI.
  Animated.timing(opacity, {
    toValue: 1,
    duration: 180,
    useNativeDriver: true,
  }).start();

  return (
    <Animated.View style={{ opacity }}>
      <Pressable
        onPress={onDismiss}
        accessibilityRole="alert"
        accessibilityLabel={item.text}
        style={[
          styles.card,
          item.tone === "success" && styles.success,
          item.tone === "error" && styles.error,
          item.tone === "info" && styles.info,
        ]}
      >
        <View style={styles.dot} />
        <Text style={styles.text}>{item.text}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: space.lg,
    gap: space.sm,
    alignItems: "stretch",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: color.backgroundElevated,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    marginTop: space.sm,
    ...elevationShadow(),
  },
  success: { borderLeftColor: color.success },
  error: { borderLeftColor: color.danger },
  info: { borderLeftColor: color.info },
  dot: { display: "none" },
  text: {
    flex: 1,
    color: color.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold as "700",
  },
});

function elevationShadow() {
  return {
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  };
}
