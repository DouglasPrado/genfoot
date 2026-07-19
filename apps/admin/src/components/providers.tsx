"use client";

import type { ReactNode } from "react";

import { ToastProvider } from "@/components/ui/toast";
import { SessionProvider } from "@/lib/session";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <SessionProvider>{children}</SessionProvider>
    </ToastProvider>
  );
}
