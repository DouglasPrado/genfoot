/**
 * Rótulos PT dos 39 atributos do grid (GDD §2) — fonte ÚNICA, compartilhada pela
 * tela de treino, pelo aviso de treino completo (push + in-app) e por qualquer
 * lugar que precise nomear um atributo. Espelha os códigos de `player-attributes`.
 */
const ATTRIBUTE_LABEL_PT: Readonly<Record<string, string>> = {
  // Técnicos (12)
  finishing: "Finalização",
  longShots: "Chute de longe",
  shortPassing: "Passe curto",
  longPassing: "Passe longo",
  crossing: "Cruzamento",
  dribbling: "Drible",
  firstTouch: "Domínio",
  marking: "Marcação",
  tackling: "Desarme",
  heading: "Cabeceio",
  setPieces: "Bola parada",
  vision: "Visão",
  // Físicos (9)
  pace: "Velocidade",
  acceleration: "Aceleração",
  strength: "Força",
  stamina: "Resistência",
  jumping: "Impulsão",
  agility: "Agilidade",
  balance: "Equilíbrio",
  explosiveness: "Explosão",
  recovery: "Recuperação",
  // Mentais (10)
  positioning: "Posicionamento",
  decisions: "Decisão",
  concentration: "Concentração",
  discipline: "Disciplina",
  composure: "Frieza",
  determination: "Determinação",
  leadership: "Liderança",
  consistency: "Regularidade",
  bravery: "Coragem",
  resilience: "Resiliência",
  // Goleiro (8)
  goalkeeperReflexes: "Reflexos",
  goalkeeperPositioning: "Posic. de gol",
  goalkeeperHandling: "Saída de gol",
  goalkeeperKicking: "Reposição",
  goalkeeperAerial: "Jogo aéreo",
  goalkeeperOneOnOne: "Um-a-um",
  goalkeeperPenalty: "Pênalti",
  goalkeeperCommand: "Comando de área",
};

/** O rótulo PT do atributo; código cru como fallback (nunca quebra). */
export function attributeLabelPt(code: string): string {
  return ATTRIBUTE_LABEL_PT[code] ?? code;
}
