import type { Metadata } from "next";
import Link from "next/link";
import { getParts } from "@/lib/content";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = {
  title: "Todas as regras",
  description: "Índice completo do Guia Oficial do Grinta — 42 capítulos em 10 Partes.",
};

export default function GuideIndex() {
  const parts = getParts();
  return (
    <div className="content-inner content-inner--wide">
      <header className="chapter-head">
        <div className="chapter-head__crumb">
          <span className="chip">
            <Icon name="list" size={14} /> Índice completo
          </span>
        </div>
        <h1 className="chapter-title">Todas as regras</h1>
        <p className="chapter-lede">
          42 capítulos em 10 Partes. Navegue por área ou use a busca (⌘K) para chegar direto ao que precisa.
        </p>
      </header>

      {parts.map((part) => (
        <section key={part.slug} className="index-part" style={{ ["--part-accent" as string]: part.accent }}>
          <div className="index-part__head">
            <span className="index-part__thumb">
              <img src={`/parts/${part.slug}.jpg`} alt="" loading="lazy" />
            </span>
            <div>
              <Link href={`/guia/${part.slug}/`} className="index-part__title">
                {part.title}
              </Link>
            </div>
            <span className="mono" style={{ color: "var(--part-accent)", marginLeft: "auto", fontSize: ".72rem" }}>
              Parte {part.roman}
            </span>
          </div>
          <div className="index-list">
            {part.chapters.map((c) => (
              <Link key={c.route} href={c.route} className="index-row">
                <span className="index-row__n mono">{c.number}</span>
                <span>
                  <span className="index-row__t">{c.title}</span>
                  <span className="index-row__d">{c.description}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
