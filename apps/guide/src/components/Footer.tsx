import Link from "next/link";
import { GUIDE } from "@/lib/guide.config";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div>
          <img src="/brand/grinta-logo.svg" alt="Grinta" className="brand-logo brand-logo--dark" style={{ height: 30 }} />
          <img src="/brand/grinta-logo-light.svg" alt="Grinta" className="brand-logo brand-logo--light" style={{ height: 30 }} />
          <div className="site-footer__meta" style={{ marginTop: ".6rem" }}>
            Guia Oficial do Jogador · {GUIDE.gameVersion} · atualizado em {GUIDE.updatedLabel}
          </div>
        </div>
        <nav className="site-footer__links" aria-label="Rodapé">
          <Link href="/guia/">Todas as regras</Link>
          <Link href="/guia/referencia/41-glossario/">Glossário</Link>
          <Link href="/guia/referencia/42-perguntas-frequentes/">Perguntas frequentes</Link>
          <Link href="/guia/comecando-a-jogar/1-visao-geral-do-jogo/">Começar</Link>
        </nav>
      </div>
    </footer>
  );
}
