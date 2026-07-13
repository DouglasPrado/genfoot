"use client";

import Link from "next/link";
import { useChrome } from "./chrome-context";
import { Icon } from "./Icon";
import { ThemeToggle } from "./ThemeToggle";
import { GUIDE } from "@/lib/guide.config";

export function Header() {
  const { openSearch, toggleNav } = useChrome();
  return (
    <header className="site-header">
      <button className="icon-btn only-mobile" onClick={toggleNav} aria-label="Abrir menu de capítulos">
        <Icon name="menu" size={20} />
      </button>

      <Link href="/" className="site-header__brand" aria-label="Grinta — Guia Oficial do Jogador">
        {/* logo completa oficial (docs/00-produto/marca), com variante por tema */}
        <img src="/brand/grinta-logo.svg" alt="Grinta" className="brand-logo brand-logo--dark" />
        <img src="/brand/grinta-logo-light.svg" alt="Grinta" className="brand-logo brand-logo--light" />
        <span className="site-header__brand-sep desktop-only" aria-hidden="true" />
        <span className="sub desktop-only">Guia do Jogador</span>
      </Link>

      <div className="site-header__spacer" />

      <button className="site-header__search" onClick={openSearch} aria-label="Buscar no guia (atalho: barra ou Ctrl K)">
        <Icon name="search" size={18} />
        <span>Buscar regras…</span>
        <kbd className="desktop-only">⌘K</kbd>
      </button>

      <div className="site-header__ver desktop-only" title={`Guia atualizado em ${GUIDE.updatedLabel}`}>
        <span className="ver-dot" />
        {GUIDE.gameVersion}
      </div>

      <ThemeToggle />
    </header>
  );
}
