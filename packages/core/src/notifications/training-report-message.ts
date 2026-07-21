/**
 * Texto do aviso de treino completo (push remoto) — puro e testável, no mesmo
 * espírito de `transfer-notification` (o texto do fato vive no core). O envio em
 * si (Expo Push API) é infra da API; aqui só se monta o que o jogador lê.
 */

/** Rótulo PT dos atributos treináveis (espelha o ATTRIBUTE_LABEL da tela). */
const ATTRIBUTE_LABEL_PT: Readonly<Record<string, string>> = {
  finishing: "Finalização",
  shortPassing: "Passe curto",
  longPassing: "Passe longo",
  dribbling: "Drible",
  crossing: "Cruzamento",
  marking: "Marcação",
  tackling: "Desarme",
  heading: "Cabeceio",
  pace: "Velocidade",
  stamina: "Resistência",
  strength: "Força",
  agility: "Agilidade",
  vision: "Visão de jogo",
  composure: "Frieza",
  positioning: "Posicionamento",
  reflexes: "Reflexos",
  handling: "Defesa (mãos)",
  diving: "Elasticidade",
};

export function attributeLabelPt(code: string): string {
  return ATTRIBUTE_LABEL_PT[code] ?? code;
}

export interface TrainingReportMessageInput {
  readonly playerName: string;
  readonly attributeCode: string;
  readonly before: number;
  readonly after: number;
}

export interface PushMessageText {
  readonly title: string;
  readonly body: string;
}

/**
 * "Kauã Martins completou o treino" / "Passe curto 32 → 38 (+6)". Quando não
 * houve ganho (teto/sem headroom), o corpo diz isso em vez de "→ igual".
 */
export function buildTrainingReportMessage(
  input: TrainingReportMessageInput,
): PushMessageText {
  const label = attributeLabelPt(input.attributeCode);
  const delta = input.after - input.before;
  const body =
    delta > 0
      ? `${label} ${input.before} → ${input.after} (+${delta})`
      : `${label} ${input.before} — sem ganho neste treino`;
  return {
    title: `${input.playerName} completou o treino`,
    body,
  };
}
