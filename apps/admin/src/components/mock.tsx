import { Badge } from "@/components/ui/badge";

/**
 * O selo de dado fictício.
 *
 * O CLAUDE.md §5 proíbe "dado fictício como fallback SILENCIOSO". A palavra é
 * silencioso: o problema nunca foi o mock, foi o mock que se passa por real —
 * é ele que faz alguém tomar decisão sobre número inventado, ou declarar pronta
 * uma tela que não tem fonte.
 *
 * Então a regra aqui é dura: **todo número que não vem da API leva este selo**,
 * e o selo diz QUAL contexto falta. Um mock rotulado é um placeholder honesto e
 * uma lista de trabalho; um mock silencioso é mentira com CSS.
 *
 * Quando o contexto voltar, o selo sai junto com o mock — e a ausência do selo
 * passa a ser a prova de que o dado é oficial.
 */
export function Mock({ contexto }: { contexto: string }) {
  return (
    <Badge tone="warn" title={`Dado fictício — ${contexto} ainda não existe`}>
      mock · {contexto}
    </Badge>
  );
}

/**
 * O aviso de topo. Sem ele, alguém abre o dashboard, vê doze números e supõe
 * que o jogo tem doze números.
 */
export function MockNotice({ reais, total }: { reais: number; total: number }) {
  return (
    <div className="rounded-sm border border-[color:var(--warn)]/40 bg-[color:var(--warn)]/10 px-3 py-2 text-xs text-foreground">
      <span className="font-semibold">
        {reais} de {total} painéis têm dado real.
      </span>{" "}
      <span className="text-muted-foreground">
        O resto está marcado{" "}
        <span className="mono text-[color:var(--warn)]">mock</span> — os
        contextos que os alimentam foram apagados com os mega-agregados (R-175) e
        voltam um a um. Nenhum número sem selo é inventado.
      </span>
    </div>
  );
}
