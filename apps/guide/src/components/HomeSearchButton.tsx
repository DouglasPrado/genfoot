"use client";

import { useChrome } from "./chrome-context";
import { Icon } from "./Icon";

export function HomeSearchButton() {
  const { openSearch } = useChrome();
  return (
    <button className="hero__search" onClick={openSearch} aria-label="Buscar no guia">
      <Icon name="search" size={20} style={{ color: "var(--faint)" }} />
      <span>Buscar: “jogador cansado”, “usuário offline”, “critério de desempate”…</span>
      <kbd className="desktop-only">⌘K</kbd>
    </button>
  );
}
