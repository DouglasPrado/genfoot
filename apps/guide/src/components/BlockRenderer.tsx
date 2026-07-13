import type { Block, CalloutTone } from "@/lib/content";
import { Markdown } from "./Markdown";
import { Icon, type IconName } from "./Icon";

const TONE_META: Record<CalloutTone, { icon: IconName; fallbackLabel: string; cls: string }> = {
  rule: { icon: "rule", fallbackLabel: "Regra", cls: "callout--rule" },
  warning: { icon: "warning", fallbackLabel: "Atenção", cls: "callout--warning" },
  example: { icon: "example", fallbackLabel: "Exemplo", cls: "callout--example" },
  hidden: { icon: "hidden", fallbackLabel: "Como o jogo avalia", cls: "callout--hidden" },
  reference: { icon: "reference", fallbackLabel: "Material de consulta", cls: "callout--reference" },
  quote: { icon: "list", fallbackLabel: "", cls: "callout--quote" },
};

function Callout({ block }: { block: Block }) {
  const tone = block.tone ?? "quote";
  const meta = TONE_META[tone];
  const label = block.label ?? meta.fallbackLabel;
  return (
    <aside className={`callout ${meta.cls}`} role="note">
      {tone !== "quote" && (
        <div className="callout__head">
          <Icon name={meta.icon} size={18} className="callout__icon" />
          <span className="callout__label">{label}</span>
        </div>
      )}
      <div className="callout__body">
        <Markdown layers={false}>{block.markdown}</Markdown>
      </div>
    </aside>
  );
}

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <div className="prose">
      {blocks.map((block, i) =>
        block.type === "callout" ? (
          <Callout key={i} block={block} />
        ) : (
          <Markdown key={i}>{block.markdown}</Markdown>
        )
      )}
    </div>
  );
}
