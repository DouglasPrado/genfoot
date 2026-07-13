import Link from "next/link";
import { getParts } from "@/lib/content";
import { AREAS, GUIDE } from "@/lib/guide.config";
import { Icon, type IconName } from "@/components/Icon";
import { HomeSearchButton } from "@/components/HomeSearchButton";

const FOUNDATIONS: { icon: IconName; title: string; body: string }[] = [
  { icon: "globe", title: "Mundo persistente", body: "O jogo nunca reinicia: as temporadas seguem mesmo com você offline, e o histórico dos clubes é preservado." },
  { icon: "shield", title: "Você não é demitido", body: "Nem rebaixamento, nem crise encerram seu vínculo. A reconstrução faz parte da experiência." },
  { icon: "flag", title: "Todos nascem pequenos", body: "Clubes começam pequenos e equilibrados. As diferenças criam identidade, não vantagem definitiva." },
  { icon: "pitch", title: "Partidas continuam offline", body: "A inteligência do clube assume as decisões essenciais, respeitando o seu planejamento." },
  { icon: "user", title: "Staff molda a informação", body: "Uma comissão técnica melhor detecta problemas antes e recomenda com mais precisão." },
  { icon: "swap", title: "Economia dinâmica", body: "Preços, salários e oferta de jogadores se ajustam ao mundo — sem mercado vazio nem inflação destrutiva." },
];

const CYCLE = ["Analisar", "Planejar", "Preparar", "Competir", "Reagir", "Avaliar", "Investir", "Evoluir"];

const FAQS = [
  "Posso ser demitido?",
  "O que acontece se eu não entrar?",
  "Minha partida continua offline?",
  "Posso mudar a tática durante o jogo?",
  "Como um atleta evolui?",
  "O mundo reinicia?",
];

export default function Home() {
  const parts = getParts();
  const firstChapter = parts[0].chapters[0].route;
  const faqRoute = "/guia/referencia/42-perguntas-frequentes/";

  return (
    <div className="home">
      <section className="hero">
        <div className="hero__bg" aria-hidden="true" />
        <img src="/brand/grinta-logo.svg" alt="Grinta" className="brand-logo brand-logo--dark hero__logo" />
        <img src="/brand/grinta-logo-light.svg" alt="Grinta" className="brand-logo brand-logo--light hero__logo" />
        <div className="hero__eyebrow">
          <span className="hero__badge">
            <Icon name="spark" size={13} /> {GUIDE.gameVersion} · atualizado {GUIDE.updatedLabel}
          </span>
        </div>
        <h1 className="hero__title">
          <span className="gradient-text">Guia Oficial</span>
          <br />
          do Jogador
        </h1>
        <p className="hero__sub">
          Tudo o que você pode fazer no <strong>Grinta</strong> — e a relação de causa e efeito de cada decisão.
          Você não controla uma escalação: constrói uma instituição de futebol ao longo do tempo.
        </p>
        <div className="hero__actions">
          <Link href={firstChapter} className="btn btn--primary">
            <Icon name="flag" size={18} /> Começar pelo básico
          </Link>
          <Link href="/guia/" className="btn">
            <Icon name="list" size={18} /> Explorar todas as regras
          </Link>
        </div>
        <HomeSearchButton />
      </section>

      <section>
        <div className="section-title">
          <h2>Fundamentos</h2>
          <span className="eyebrow">regras que valem sempre</span>
        </div>
        <div className="foundations">
          <div className="areas">
            {FOUNDATIONS.map((f) => (
              <div key={f.title} className="area-card">
                <span className="area-card__icon">
                  <Icon name={f.icon} size={22} />
                </span>
                <span className="area-card__label" style={{ fontSize: "1rem" }}>
                  {f.title}
                </span>
                <span className="area-card__blurb">{f.body}</span>
              </div>
            ))}
          </div>
          <div className="cycle" aria-label="Ciclo principal do gestor">
            {CYCLE.map((step, i) => (
              <span key={step} style={{ display: "inline-flex", alignItems: "center", gap: ".5rem" }}>
                <span className="cycle__step gradient-text">{step}</span>
                {i < CYCLE.length - 1 && <Icon name="arrow-right" size={15} className="cycle__arrow" />}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="section-title">
          <h2>Principais áreas</h2>
          <span className="eyebrow">por onde entrar</span>
        </div>
        <div className="areas">
          {AREAS.map((a) => {
            const accent = parts.find((p) => p.slug === a.partSlug)?.accent;
            return (
              <Link
                key={a.partSlug}
                href={`/guia/${a.partSlug}/`}
                className="area-card"
                style={{ ["--part-accent" as string]: accent }}
              >
                <span className="area-card__cover">
                  <img src={`/parts/${a.partSlug}.jpg`} alt="" loading="lazy" />
                </span>
                <span className="area-card__label">{a.label}</span>
                <span className="area-card__blurb">{a.blurb}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <div className="section-title">
          <h2>Explore por Parte</h2>
          <span className="eyebrow">10 partes · 42 capítulos</span>
        </div>
        <div className="parts-grid">
          {parts.map((p) => (
            <Link
              key={p.slug}
              href={`/guia/${p.slug}/`}
              className="part-card"
              style={{ ["--part-accent" as string]: p.accent }}
            >
              <span className="part-card__cover">
                <img src={`/parts/${p.slug}.jpg`} alt="" loading="lazy" />
                <span className="part-card__roman">{p.roman}</span>
              </span>
              <span className="part-card__body">
                <span className="part-card__kicker">Parte {p.roman}</span>
                <span className="part-card__title">{p.title}</span>
                <span className="part-card__sub">{p.subtitle}</span>
                <span className="part-card__count">
                  Cap. {p.chapters[0].number}–{p.chapters[p.chapters.length - 1].number}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="section-title">
          <h2>Dúvidas frequentes</h2>
          <Link href={faqRoute} className="eyebrow" style={{ textDecoration: "underline" }}>
            ver todas
          </Link>
        </div>
        <div className="faq-grid">
          {FAQS.map((q) => (
            <Link key={q} href={faqRoute} className="faq-chip">
              <Icon name="example" size={18} style={{ color: "var(--example-strong)" }} />
              <span className="q">{q}</span>
              <Icon name="chevron-right" size={16} style={{ color: "var(--faint)" }} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
