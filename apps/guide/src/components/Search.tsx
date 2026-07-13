"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChrome } from "./chrome-context";
import { Icon } from "./Icon";
import type { SearchDoc } from "@/lib/content";

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

interface Hit {
  doc: SearchDoc;
  score: number;
  snippet: { before: string; match: string; after: string } | null;
}

function score(doc: SearchDoc, terms: string[]): Hit | null {
  const title = norm(doc.title);
  const part = norm(doc.part);
  const text = norm(doc.text + " " + doc.description);
  let total = 0;
  for (const t of terms) {
    let s = 0;
    if (title.includes(t)) s += title.startsWith(t) ? 60 : 40;
    if (part.includes(t)) s += 12;
    if (text.includes(t)) s += 8;
    if (s === 0) return null; // todos os termos precisam aparecer
    total += s;
  }
  // snippet a partir do primeiro termo encontrado no texto
  let snippet: Hit["snippet"] = null;
  const first = terms.find((t) => text.includes(t));
  if (first) {
    const raw = doc.text + " " + doc.description;
    const idx = norm(raw).indexOf(first);
    if (idx >= 0) {
      const start = Math.max(0, idx - 40);
      snippet = {
        before: (start > 0 ? "…" : "") + raw.slice(start, idx),
        match: raw.slice(idx, idx + first.length),
        after: raw.slice(idx + first.length, idx + first.length + 90) + "…",
      };
    }
  }
  return { doc, score: total, snippet };
}

export function Search() {
  const { closeSearch, searchIndex } = useChrome();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const hits = useMemo<Hit[]>(() => {
    const terms = norm(q.trim()).split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return searchIndex
      .map((d) => score(d, terms))
      .filter((h): h is Hit => h !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [q, searchIndex]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  const go = (route: string) => {
    closeSearch();
    router.push(route);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") closeSearch();
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && hits[active]) {
      e.preventDefault();
      go(hits[active].doc.route);
    }
  };

  return (
    <div className="search-overlay" onClick={closeSearch} role="dialog" aria-modal="true" aria-label="Buscar no guia">
      <div className="search-panel" onClick={(e) => e.stopPropagation()} onKeyDown={onKey}>
        <div className="search-input-row">
          <Icon name="search" size={20} style={{ color: "var(--faint)" }} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Buscar: "jogador cansado", "contrato acabando", "usuário offline"…'
            aria-label="Termo de busca"
          />
          <button className="esc" onClick={closeSearch}>
            Esc
          </button>
        </div>

        <div className="search-results">
          {q.trim() === "" ? (
            <p className="search-empty">
              Pesquise por termos e frases naturais — o guia é grande, a busca ajuda a chegar direto na regra.
            </p>
          ) : hits.length === 0 ? (
            <p className="search-empty">Nenhuma regra encontrada para “{q}”.</p>
          ) : (
            hits.map((h, i) => (
              <a
                key={h.doc.route}
                href={h.doc.route}
                className={`search-result ${i === active ? "is-active" : ""}`}
                onMouseEnter={() => setActive(i)}
                onClick={(e) => {
                  e.preventDefault();
                  go(h.doc.route);
                }}
              >
                <div className="search-result__top">
                  <span className="search-result__kicker">
                    {h.doc.part} · Cap. {h.doc.number}
                  </span>
                </div>
                <div className="search-result__title">{h.doc.title}</div>
                {h.snippet && (
                  <div className="search-result__snippet">
                    {h.snippet.before}
                    <mark>{h.snippet.match}</mark>
                    {h.snippet.after}
                  </div>
                )}
              </a>
            ))
          )}
        </div>

        <div className="search-hint">
          <span>↑ ↓ navegar</span>
          <span>↵ abrir</span>
          <span>esc fechar</span>
        </div>
      </div>
    </div>
  );
}
