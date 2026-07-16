import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Icon, type IconName } from "@/components/icon";
import type { CanonicalScreenState } from "@/lib/screen-state";
import { color, fontSize, fontWeight, radius, space } from "@/theme";

const COPY: Readonly<
  Record<
    Exclude<CanonicalScreenState, "success">,
    { readonly title: string; readonly body: string; readonly icon: IconName }
  >
> = {
  "initial-loading": {
    title: "CARREGANDO DADOS OFICIAIS",
    body: "Estamos sincronizando o estado atual do seu clube.",
    icon: "time",
  },
  empty: {
    title: "AINDA NÃO HÁ DADOS",
    body: "Este contexto ainda não foi iniciado no mundo do jogo.",
    icon: "shield",
  },
  "partial-stale": {
    title: "DADOS SALVOS NO APARELHO",
    body: "Você está sem conexão. As informações podem estar desatualizadas.",
    icon: "warning",
  },
  offline: {
    title: "SEM CONEXÃO",
    body: "Conecte-se para consultar o estado oficial do clube.",
    icon: "warning",
  },
  processing: {
    title: "PROCESSANDO ALTERAÇÃO",
    body: "A ação foi enviada e ainda aguarda confirmação oficial.",
    icon: "time",
  },
  "domain-error": {
    title: "AÇÃO NÃO PERMITIDA",
    body: "A regra do jogo impediu esta alteração.",
    icon: "warning",
  },
  "technical-error": {
    title: "NÃO FOI POSSÍVEL ATUALIZAR",
    body: "O servidor não respondeu corretamente. Nenhum dado foi inventado.",
    icon: "warning",
  },
  forbidden: {
    title: "ACESSO BLOQUEADO",
    body: "Sua conta não tem permissão para esta operação.",
    icon: "shield",
  },
  conflict: {
    title: "O ESTADO MUDOU",
    body: "Atualize a tela antes de tentar novamente.",
    icon: "swap-horizontal",
  },
  expired: {
    title: "PRAZO ENCERRADO",
    body: "Esta ação não está mais disponível.",
    icon: "time",
  },
  maintenance: {
    title: "EM MANUTENÇÃO",
    body: "Este recurso está temporariamente indisponível.",
    icon: "construct",
  },
};

export function ScreenStatePanel({
  state,
  title,
  body,
  onRetry,
}: {
  readonly state: Exclude<CanonicalScreenState, "success">;
  readonly title?: string;
  readonly body?: string;
  readonly onRetry?: () => void;
}) {
  const copy = COPY[state];
  const loading = state === "initial-loading" || state === "processing";
  return (
    <View style={styles.root} accessibilityRole="summary">
      {loading ? (
        <ActivityIndicator color={color.primary} size="large" />
      ) : (
        <Icon name={copy.icon} size={30} color={color.warning} />
      )}
      <Text style={styles.title}>{title ?? copy.title}</Text>
      <Text style={styles.body}>{body ?? copy.body}</Text>
      {onRetry !== undefined && !loading ? (
        <Pressable
          style={styles.retry}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Atualizar dados"
        >
          <Icon
            name="swap-horizontal"
            size={15}
            color={color.primaryContrast}
          />
          <Text style={styles.retryText}>ATUALIZAR</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 260,
    padding: space.xl,
    gap: space.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.borderStrong,
    borderRadius: radius.lg,
  },
  title: {
    color: color.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black as "800",
    fontStyle: "italic",
    textAlign: "center",
  },
  body: {
    color: color.textMuted,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: "center",
  },
  retry: {
    minHeight: 48,
    paddingHorizontal: space.xl,
    borderRadius: radius.sm,
    backgroundColor: color.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  retryText: {
    color: color.primaryContrast,
    fontWeight: fontWeight.black as "800",
    letterSpacing: 0.8,
  },
});
