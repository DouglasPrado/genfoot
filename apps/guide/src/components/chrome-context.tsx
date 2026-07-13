"use client";

import { createContext, useContext } from "react";
import type { SearchDoc } from "@/lib/content";

export interface ChromeState {
  searchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  navOpen: boolean;
  toggleNav: () => void;
  closeNav: () => void;
  searchIndex: SearchDoc[];
}

export const ChromeContext = createContext<ChromeState | null>(null);

export function useChrome(): ChromeState {
  const ctx = useContext(ChromeContext);
  if (!ctx) throw new Error("useChrome deve ser usado dentro de <AppChrome>");
  return ctx;
}
