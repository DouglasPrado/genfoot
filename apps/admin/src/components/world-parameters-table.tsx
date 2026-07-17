import { Lock, Terminal, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  buildWorldParameters,
  mutableParameters,
  type Mutability,
  type ParameterOrigin,
  type ParameterRow,
  type WorldSnapshotLike,
} from "@/lib/world-parameters-model";

/**
 * A ficha técnica do mundo — e o inventário honesto do que trava a edição dela.
 *
 * O pedido era "todos os parâmetros do mundo que será possível alterar". Hoje o
 * único parâmetro com command é o `status`. Esta tabela existe para dizer isso
 * com precisão, em vez de oferecer campos que não gravam nada. A coluna
 * "alterável" é o conteúdo: `travado` ≠ `imutável`, e a diferença é a dívida.
 */

const ORIGIN_LABEL: Record<ParameterOrigin, string> = {
  snapshot: "API · snapshot",
  query: "API · observado",
  code: "constante do core",
};

function MutabilityCell({ mutability }: { mutability: Mutability }) {
  if (mutability.kind === "command") {
    return (
      <div className="flex flex-col items-start gap-1">
        <Badge tone="ok">
          <Terminal className="size-3" />
          alterável
        </Badge>
        <div className="flex flex-wrap gap-1">
          {mutability.commandTypes.map((c) => (
            <span key={c} className="mono text-[11px] text-primary">
              {c}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (mutability.kind === "immutable") {
    return (
      <div className="flex flex-col items-start gap-1">
        <Badge tone="neutral">
          <Lock className="size-3" />
          imutável
        </Badge>
        <p className="max-w-[38ch] text-[11px] leading-snug text-muted-foreground">
          {mutability.reason}
        </p>
      </div>
    );
  }

  // Travado: o parâmetro DEVERIA mudar, o canon diz como, e o caminho não existe.
  // É o estado que o pedido original assumia resolvido — por isso ele é `warn` e
  // carrega a decisão que o rege, não um "não" seco.
  return (
    <div className="flex flex-col items-start gap-1">
      <Badge tone="warn">
        <TriangleAlert className="size-3" />
        travado
      </Badge>
      <p className="max-w-[38ch] text-[11px] leading-snug text-muted-foreground">
        {mutability.reason}
      </p>
      {mutability.decision ? (
        <span className="mono text-[11px] text-[color:var(--warn)]">
          {mutability.decision}
        </span>
      ) : null}
    </div>
  );
}

function ValueCell({ row }: { row: ParameterRow }) {
  // Valor desconhecido é "—" com o motivo no title, nunca um zero ou um default.
  // A tabela não afirma o que não observou.
  if (row.value === null) {
    return (
      <span
        className="mono text-muted-foreground"
        title="Desconhecido: a API ainda não respondeu."
      >
        —
      </span>
    );
  }
  return (
    <span
      className={
        row.origin === "code"
          ? "mono text-muted-foreground"
          : "mono text-foreground"
      }
    >
      {row.value}
    </span>
  );
}

export function WorldParametersTable({
  snapshot,
  observedClubCount,
}: {
  snapshot: WorldSnapshotLike | null;
  observedClubCount: number | null;
}) {
  const rows = buildWorldParameters({ snapshot, observedClubCount });
  const mutable = mutableParameters(rows);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        O mundo não tem configuração: dos {rows.length} parâmetros abaixo,{" "}
        <span className="font-semibold text-[color:var(--ok)]">
          {mutable.length} é alterável
        </span>{" "}
        por command. O resto é imutável por construção ou está travado por uma
        lacuna já decidida e não implementada — cada linha diz qual.
      </p>

      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Parâmetro</th>
              <th className="px-3 py-2 font-medium">Valor</th>
              <th className="px-3 py-2 font-medium">Origem</th>
              <th className="px-3 py-2 font-medium">Alterável</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.key}
                className="border-b border-border/60 align-top even:bg-surface-2/40 last:border-0"
              >
                <td className="px-3 py-2.5">
                  <div className="font-medium">{row.label}</div>
                  <div className="mono text-[11px] text-muted-foreground">
                    {row.key}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <ValueCell row={row} />
                </td>
                <td className="px-3 py-2.5">
                  {/* A origem separa o que a API serviu do que a tela espelha do
                      código. Um `16` observado e um `23` copiado do core não têm
                      o mesmo valor de prova, e a tabela não os embaralha. */}
                  <div className="text-[11px] text-muted-foreground">
                    {ORIGIN_LABEL[row.origin]}
                  </div>
                  <div className="mono mt-0.5 text-[11px] text-muted-foreground/70">
                    {row.source}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <MutabilityCell mutability={row.mutability} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-semibold">Por que quase nada é alterável.</span> As
        constantes da gênese são{" "}
        <span className="mono">literais de tipo</span> no core — um mundo de 20
        clubes não compila, e a ativação recusa. R-182 já ratificou que elas viram{" "}
        <span className="mono">GameRuleConfig</span>; a tabela existe no{" "}
        <span className="mono">prisma/schema.prisma:2210</span> sem nenhum leitor
        ou escritor. Editar coeficiente de mundo vivo, aliás, contraria R-24/R-30:
        o caminho canônico é publicar ruleset novo, e{" "}
        <span className="mono">PublishRuleSetVersion</span> está no catálogo e não
        no código.
      </p>
    </div>
  );
}
