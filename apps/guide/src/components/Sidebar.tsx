"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useChrome } from "./chrome-context";
import { Icon } from "./Icon";

export interface NavChapter {
  number: number;
  title: string;
  route: string;
}
export interface NavPart {
  slug: string;
  roman: string;
  title: string;
  icon: string;
  accent: string;
  route: string;
  chapters: NavChapter[];
}

export function Sidebar({ nav }: { nav: NavPart[] }) {
  const pathname = usePathname();
  const { navOpen, closeNav } = useChrome();
  const activePart = nav.find((p) => pathname.startsWith(`/guia/${p.slug}`));
  const [open, setOpen] = useState<Set<string>>(new Set());

  // mantém a Parte atual expandida ao navegar
  useEffect(() => {
    if (activePart) setOpen((s) => new Set(s).add(activePart.slug));
  }, [activePart?.slug]);

  const toggle = (slug: string) =>
    setOpen((s) => {
      const n = new Set(s);
      n.has(slug) ? n.delete(slug) : n.add(slug);
      return n;
    });

  return (
    <nav className={`sidebar ${navOpen ? "is-open" : ""}`} aria-label="Capítulos do guia">
      <button className="icon-btn sidebar__close only-mobile" onClick={closeNav} aria-label="Fechar menu">
        <Icon name="close" size={20} />
      </button>

      <Link href="/" className="sidebar__home">
        <Icon name="home" size={18} />
        Início do guia
      </Link>

      {nav.map((part) => {
        const isActive = activePart?.slug === part.slug;
        const isOpen = open.has(part.slug) || isActive;
        return (
          <div
            key={part.slug}
            className={`sidebar__part ${isActive ? "is-active" : ""} ${isOpen ? "is-open" : ""}`}
            style={{ ["--part-accent" as string]: part.accent }}
          >
            <button
              className="sidebar__part-head"
              onClick={() => toggle(part.slug)}
              aria-expanded={isOpen}
            >
              <span className="sidebar__part-thumb">
                <img src={`/parts/${part.slug}.jpg`} alt="" loading="lazy" />
              </span>
              <span className="sidebar__part-title">{part.title}</span>
              <Icon name="chevron-right" size={16} className="sidebar__part-chev" />
            </button>
            {isOpen && (
              <ul className="sidebar__chapters">
                {part.chapters.map((c) => (
                  <li key={c.route}>
                    <Link
                      href={c.route}
                      className={`sidebar__chapter ${pathname === c.route ? "is-current" : ""}`}
                    >
                      <span className="n">{c.number}</span>
                      {c.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}
