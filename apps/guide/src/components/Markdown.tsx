import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ReactNode } from "react";
import { Children, isValidElement } from "react";
import { slugify } from "@/lib/util";

const LAYER_CLASS: Record<string, string> = {
  "Resumo": "layer--resumo",
  "Regras completas": "layer--regras-completas",
  "Estratégia": "layer--estrategia",
};

function toText(children: ReactNode): string {
  let out = "";
  Children.forEach(children, (c) => {
    if (typeof c === "string" || typeof c === "number") out += c;
    else if (isValidElement(c)) out += toText((c.props as { children?: ReactNode }).children);
  });
  return out;
}

/**
 * Renderiza markdown (GFM) com os componentes do design system.
 * `layers` liga o tratamento especial dos títulos ### de camada
 * (Resumo / Regras completas / Estratégia) — usado no corpo dos capítulos,
 * desligado dentro de callouts.
 */
export function Markdown({ children, layers = true }: { children: string; layers?: boolean }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h2({ children }) {
          const text = toText(children);
          return <h2 id={slugify(text)}>{children}</h2>;
        },
        h3({ children }) {
          const text = toText(children).trim();
          const id = slugify(text);
          if (layers && LAYER_CLASS[text]) {
            return (
              <div className={`layer-head ${LAYER_CLASS[text]}`} id={id}>
                <span className="layer-head__tag">{text}</span>
                <span className="layer-head__rule" />
              </div>
            );
          }
          return (
            <h3 id={id} className="section">
              {children}
            </h3>
          );
        },
        table({ children }) {
          return (
            <div className="table-wrap">
              <table>{children}</table>
            </div>
          );
        },
        a({ href, children }) {
          const url = href ?? "#";
          const external = /^https?:\/\//.test(url);
          return (
            <a href={url} {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}>
              {children}
            </a>
          );
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
