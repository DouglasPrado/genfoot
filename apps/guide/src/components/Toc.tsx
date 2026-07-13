"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface Entry {
  id: string;
  text: string;
  layer: boolean;
}

/**
 * "Nesta página": deriva o índice a partir do DOM já renderizado
 * (títulos ## e ###/camadas do conteúdo), com scroll-spy.
 */
export function Toc() {
  const pathname = usePathname();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".content-col h2[id], .content-col h3[id], .content-col .layer-head[id]"
      )
    );
    setEntries(
      nodes.map((n) => ({
        id: n.id,
        text: (n.textContent || "").trim(),
        layer: n.classList.contains("layer-head"),
      }))
    );

    if (!nodes.length) return;
    const obs = new IntersectionObserver(
      (ies) => {
        const visible = ies
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId((visible[0].target as HTMLElement).id);
      },
      { rootMargin: "-72px 0px -70% 0px", threshold: 0 }
    );
    nodes.forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, [pathname]);

  if (entries.length < 2) return <aside className="toc" aria-hidden="true" />;

  return (
    <aside className="toc" aria-label="Nesta página">
      <div className="toc__title">Nesta página</div>
      <ul className="toc__list">
        {entries.map((e) => (
          <li key={e.id} className={`toc__item ${e.layer ? "toc__item--layer" : ""} ${activeId === e.id ? "is-active" : ""}`}>
            <a href={`#${e.id}`}>{e.text}</a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
