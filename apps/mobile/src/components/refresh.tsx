import { useCallback, useState } from "react";
import { RefreshControl } from "react-native";
import { color } from "@/theme";

/**
 * Pull-to-refresh padrão do app. Colocar em `refreshControl` de qualquer
 * ScrollView/FlatList: `<ScrollView refreshControl={<Refresh onRefresh={fn} />}>`.
 * `onRefresh` recarrega os dados da tela (opcional); o spinner sempre aparece.
 */
export function Refresh({ onRefresh }: { onRefresh?: () => void | Promise<void> }) {
  const [refreshing, setRefreshing] = useState(false);
  const handle = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh?.();
    } catch {
      // recarga não deve derrubar a tela
    }
    await new Promise((resolve) => setTimeout(resolve, 450));
    setRefreshing(false);
  }, [onRefresh]);

  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handle}
      tintColor={color.primary}
      colors={[color.primary]}
      progressBackgroundColor={color.surface}
    />
  );
}
