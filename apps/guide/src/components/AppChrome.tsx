"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ChromeContext } from "./chrome-context";
import type { SearchDoc } from "@/lib/content";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { Search } from "./Search";

export function AppChrome({
  searchIndex,
  children,
}: {
  searchIndex: SearchDoc[];
  children: React.ReactNode;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const toggleNav = useCallback(() => setNavOpen((v) => !v), []);
  const closeNav = useCallback(() => setNavOpen(false), []);

  // fecha a gaveta ao trocar de rota
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  // trava o scroll do body quando a gaveta mobile está aberta
  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  // atalho global de busca (Cmd/Ctrl-K e "/")
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      } else if (
        e.key === "/" &&
        !/(input|textarea)/i.test((e.target as HTMLElement)?.tagName ?? "") &&
        !searchOpen
      ) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  const value = useMemo(
    () => ({ searchOpen, openSearch, closeSearch, navOpen, toggleNav, closeNav, searchIndex }),
    [searchOpen, openSearch, closeSearch, navOpen, toggleNav, closeNav, searchIndex]
  );

  return (
    <ChromeContext.Provider value={value}>
      <div className="app">
        <Header />
        {children}
        <Footer />
      </div>
      <div className={`scrim ${navOpen ? "is-open" : ""}`} onClick={closeNav} aria-hidden="true" />
      {searchOpen && <Search />}
    </ChromeContext.Provider>
  );
}
