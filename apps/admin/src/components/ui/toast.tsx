"use client";

import { CircleAlert, X } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";

interface ToastItem {
  readonly id: number;
  readonly message: string;
}

interface ToastApi {
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
const TOAST_DURATION_MS = 6_000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<readonly ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) clearTimeout(timer);
    timers.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const error = useCallback(
    (message: string) => {
      nextId.current += 1;
      const id = nextId.current;
      setItems((current) => [...current, { id, message }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), TOAST_DURATION_MS),
      );
    },
    [dismiss],
  );

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) clearTimeout(timer);
      timers.current.clear();
    },
    [],
  );

  const api = useMemo(() => ({ error }), [error]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-label="Notificações"
        className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="alert"
            className="pointer-events-auto flex items-start gap-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-3 text-sm text-foreground shadow-xl backdrop-blur"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" />
            <div className="min-w-0 flex-1">
              <p className="font-heading text-xs uppercase tracking-wide text-danger">
                Erro
              </p>
              <p className="mono mt-0.5 break-words text-xs">{item.message}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="-mr-1 -mt-1 size-7 shrink-0"
              aria-label="Fechar notificação"
              onClick={() => dismiss(item.id)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (context === null) {
    throw new Error("useToast precisa do ToastProvider.");
  }
  return context;
}
