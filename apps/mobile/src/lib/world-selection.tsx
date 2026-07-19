import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * O mundo escolhido pelo jogador (R-208).
 *
 * Substitui `EXPO_PUBLIC_WORLD_ID`, que fixava o mundo no BUILD: o app inteiro
 * consultava um UUID compilado no bundle, e quando aquele mundo sumia do banco
 * a tela quebrava sem dizer por quê. Havia ainda um UUID hardcoded de fallback,
 * apontando para um mundo que não existia mais — o cliente consultava um
 * fantasma em silêncio, o anti-padrão do §5.
 *
 * Agora a escolha é do jogador, sobre a lista que a API serve, e sobrevive ao
 * fechamento do app. Sem escolha, `worldId` é `null` e o app não consulta nada:
 * a ausência leva à lista de mundos, não a um chute.
 */
const STORAGE_KEY = "grinta:selected-world";

interface WorldSelection {
  /** `null` = nenhum mundo escolhido ainda. Não é erro; é a lista pendente. */
  readonly worldId: string | null;
  /** `true` enquanto a escolha persistida ainda está sendo lida do disco. */
  readonly loading: boolean;
  readonly selectWorld: (worldId: string) => void;
  readonly clearWorld: () => void;
}

const WorldSelectionContext = createContext<WorldSelection | null>(null);

export function WorldSelectionProvider({
  children,
}: {
  readonly children: ReactNode;
}): React.JSX.Element {
  const [worldId, setWorldId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled) setWorldId(stored);
      } catch {
        // Disco indisponível não é motivo para travar o app: segue sem escolha,
        // e a lista de mundos aparece. Perder a seleção é recuperável — o
        // jogador reescolhe; fingir uma seleção não seria.
        if (!cancelled) setWorldId(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectWorld = useCallback((next: string) => {
    // Estado primeiro, disco depois: a tela avança sem esperar I/O, e uma
    // escrita que falha custa a persistência entre sessões, não a navegação.
    setWorldId(next);
    void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const clearWorld = useCallback(() => {
    setWorldId(null);
    void AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
  }, []);

  const value = useMemo<WorldSelection>(
    () => ({ worldId, loading, selectWorld, clearWorld }),
    [clearWorld, loading, selectWorld, worldId],
  );

  return (
    <WorldSelectionContext.Provider value={value}>
      {children}
    </WorldSelectionContext.Provider>
  );
}

export function useWorldSelection(): WorldSelection {
  const context = useContext(WorldSelectionContext);
  if (context === null) {
    throw new Error(
      "useWorldSelection exige WorldSelectionProvider acima na árvore.",
    );
  }
  return context;
}
