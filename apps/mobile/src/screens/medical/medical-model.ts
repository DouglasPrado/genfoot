/**
 * Lógica pura de `M-MEDICAL` e `M-MEDICAL-CASE`.
 *
 * O componente só renderiza e despacha: ordenação, rótulos, qual ação a
 * máquina permite agora e o aviso de risco moram aqui, testáveis.
 */

export type MedicalEpisodeStateCode =
  | "EVALUATION"
  | "EXAMS"
  | "DIAGNOSIS"
  | "REHAB"
  | "COMPETITIVE_RETURN"
  | "DISCHARGE"
  | "MEDICAL_RETIREMENT";

export type SeverityCode =
  | "MINOR"
  | "LIGHT"
  | "MODERATE"
  | "SERIOUS"
  | "CRITICAL";

export interface MedicalCase {
  readonly injuryId: string;
  readonly playerId: string;
  readonly playerName: string;
  readonly position: string;
  readonly state: MedicalEpisodeStateCode;
  readonly rehabStage: number | null;
  readonly rehabStageCode: string | null;
  readonly rehabStageTotal: number;
  readonly injuryType: string;
  readonly region: string;
  readonly severity: SeverityCode | null;
  readonly occurredOn: string;
  readonly estimatedReturnOn: string | null;
  readonly minimumDays: number | null;
  readonly maximumDays: number | null;
  readonly treatmentOption: string | null;
  /** Só existe dentro da reabilitação; `null` fora dela. */
  readonly relapseRisk: number | null;
  readonly returnRiskScore: number | null;
  readonly relapseCount: number;
  readonly fatigue: number;
  readonly condition: number;
  readonly backInTraining: boolean;
}

/**
 * Impedido por motivo médico SEM episódio aberto.
 *
 * O elenco marca "Lesionado" a partir de `availability`; o departamento lista
 * episódios. Quando um existe sem o outro, esta linha é o que impede as duas
 * telas de se contradizerem.
 */
export interface MedicalRestriction {
  readonly playerId: string;
  readonly playerName: string;
  readonly position: string;
  readonly availability: string;
  readonly fatigue: number;
  readonly condition: number;
}

export interface MedicalDepartment {
  readonly cases: readonly MedicalCase[];
  readonly restrictions: readonly MedicalRestriction[];
  readonly squadSize: number;
  readonly healthyCount: number;
  readonly departmentLevel: number | null;
}

const STATE_LABELS: Readonly<Record<MedicalEpisodeStateCode, string>> = {
  EVALUATION: "Avaliação inicial",
  EXAMS: "Exames em andamento",
  DIAGNOSIS: "Diagnóstico fechado",
  REHAB: "Em reabilitação",
  COMPETITIVE_RETURN: "Liberado pela medicina",
  DISCHARGE: "Alta",
  MEDICAL_RETIREMENT: "Aposentadoria médica",
};

export const stateLabel = (state: MedicalEpisodeStateCode): string =>
  STATE_LABELS[state];

const SEVERITY_LABELS: Readonly<Record<SeverityCode, string>> = {
  MINOR: "Mínima",
  LIGHT: "Leve",
  MODERATE: "Moderada",
  SERIOUS: "Grave",
  CRITICAL: "Gravíssima",
};

/** Sem diagnóstico não há gravidade — é suspeita, e a tela tem de dizer isso. */
export const severityLabel = (severity: SeverityCode | null): string =>
  severity === null ? "A confirmar" : SEVERITY_LABELS[severity];

const REHAB_STAGE_LABELS: Readonly<Record<string, string>> = {
  PAIN_CONTROL: "Controle da dor",
  MOVEMENT_RECOVERY: "Recuperação de movimento",
  STRENGTHENING: "Fortalecimento",
  INDIVIDUAL_TRAINING: "Treino individual",
  PARTIAL_TRAINING: "Treino parcial",
  FULL_TRAINING: "Treino completo",
  COMPETITIVE_CLEARANCE: "Liberação competitiva",
};

export const rehabStageLabel = (code: string | null): string | null =>
  code === null ? null : (REHAB_STAGE_LABELS[code] ?? code);

const INJURY_TYPE_LABELS: Readonly<Record<string, string>> = {
  LIGHT: "Lesão leve",
  MODERATE: "Lesão moderada",
  SERIOUS: "Lesão grave",
  MUSCULAR: "Lesão muscular",
  IMPACT: "Lesão por pancada",
  RECURRENT: "Lesão recorrente",
};

export const injuryTypeLabel = (type: string): string =>
  INJURY_TYPE_LABELS[type] ?? "Lesão";

const TREATMENT_LABELS: Readonly<Record<string, string>> = {
  CONSERVATIVE: "Conservador",
  STANDARD: "Padrão",
  INTENSIVE: "Intensivo",
  SURGERY: "Cirúrgico",
};

export const treatmentLabel = (option: string | null): string | null =>
  option === null ? null : (TREATMENT_LABELS[option] ?? option);

/** Ordem de urgência dos estados: quem ainda nem foi diagnosticado vem antes. */
const STATE_URGENCY: Readonly<Record<MedicalEpisodeStateCode, number>> = {
  EVALUATION: 0,
  EXAMS: 1,
  DIAGNOSIS: 2,
  REHAB: 3,
  COMPETITIVE_RETURN: 4,
  DISCHARGE: 5,
  MEDICAL_RETIREMENT: 6,
};

const SEVERITY_WEIGHT: Readonly<Record<SeverityCode, number>> = {
  CRITICAL: 0,
  SERIOUS: 1,
  MODERATE: 2,
  LIGHT: 3,
  MINOR: 4,
};

/**
 * Ordena por quem exige decisão AGORA: primeiro o que está travado esperando o
 * usuário (avaliação, exames, diagnóstico sem plano), depois reabilitação por
 * gravidade. Empate resolvido pelo nome, para a lista não dançar entre buscas.
 */
export function sortCases(
  cases: readonly MedicalCase[],
): readonly MedicalCase[] {
  return [...cases].sort((a, b) => {
    const byState = STATE_URGENCY[a.state] - STATE_URGENCY[b.state];
    if (byState !== 0) return byState;
    const severityA = a.severity === null ? 5 : SEVERITY_WEIGHT[a.severity];
    const severityB = b.severity === null ? 5 : SEVERITY_WEIGHT[b.severity];
    if (severityA !== severityB) return severityA - severityB;
    return a.playerName.localeCompare(b.playerName, "pt-BR");
  });
}

/** Progresso da reabilitação, 0–1. Fora da reabilitação não existe barra. */
export function rehabProgress(medicalCase: MedicalCase): number | null {
  if (medicalCase.state === "COMPETITIVE_RETURN") return 1;
  if (medicalCase.state !== "REHAB" || medicalCase.rehabStage === null) {
    return null;
  }
  return medicalCase.rehabStage / medicalCase.rehabStageTotal;
}

export type MedicalActionKind =
  | "ORDER_EXAM"
  | "DIAGNOSE"
  | "SET_PLAN"
  | "ADVANCE_REHAB"
  | "FORCE_RETURN"
  | "DISCHARGE"
  | "NONE";

export interface MedicalAction {
  readonly kind: MedicalActionKind;
  readonly label: string;
  /** Ação que assume risco real de recaída pede confirmação (HighRiskConfirm). */
  readonly highRisk: boolean;
}

/**
 * A ação principal permitida pelo estado atual — a tela NÃO oferece transição
 * que a máquina recusaria, porque um botão que sempre erra é pior que nenhum.
 */
export function primaryAction(medicalCase: MedicalCase): MedicalAction {
  switch (medicalCase.state) {
    case "EVALUATION":
      return { kind: "ORDER_EXAM", label: "Solicitar exames", highRisk: false };
    case "EXAMS":
      return { kind: "DIAGNOSE", label: "Registrar diagnóstico", highRisk: false };
    case "DIAGNOSIS":
      return { kind: "SET_PLAN", label: "Escolher tratamento", highRisk: false };
    case "REHAB":
      return {
        kind: "ADVANCE_REHAB",
        label:
          medicalCase.rehabStage !== null &&
          medicalCase.rehabStage >= medicalCase.rehabStageTotal
            ? "Liberar para competição"
            : "Avançar estágio",
        highRisk: false,
      };
    case "COMPETITIVE_RETURN":
      return { kind: "DISCHARGE", label: "Dar alta", highRisk: false };
    default:
      return { kind: "NONE", label: "Caso encerrado", highRisk: false };
  }
}

/**
 * O retorno antecipado só existe DENTRO da reabilitação — em S7 o caminho é a
 * liberação regular, não forçar nada.
 */
export function canForceReturn(medicalCase: MedicalCase): boolean {
  return (
    medicalCase.state === "REHAB" &&
    medicalCase.rehabStage !== null &&
    medicalCase.rehabStage < medicalCase.rehabStageTotal
  );
}

export interface RiskWarning {
  readonly tone: "info" | "warning" | "danger";
  readonly title: string;
  readonly message: string;
}

/**
 * Aviso de risco do retorno forçado. A consequência é real (§16): quanto mais
 * longe de S7, maior a chance de recaída — e a recaída pode agravar a lesão.
 */
export function forceReturnWarning(medicalCase: MedicalCase): RiskWarning {
  // Chamada só a partir da reabilitação (`canForceReturn`), onde o risco
  // existe; o zero é a defesa contra um caso fora dela chegar aqui.
  const risk = medicalCase.relapseRisk ?? 0;
  const stagesLeft =
    medicalCase.rehabStage === null
      ? medicalCase.rehabStageTotal
      : medicalCase.rehabStageTotal - medicalCase.rehabStage;
  const base = `Faltam ${stagesLeft} ${stagesLeft === 1 ? "estágio" : "estágios"} de reabilitação. Risco de recaída: ${risk}%.`;
  if (risk >= 60) {
    return {
      tone: "danger",
      title: "Risco alto de recaída",
      message: `${base} Uma recaída volta o tratamento atrás e pode agravar a lesão.`,
    };
  }
  if (risk >= 30) {
    return {
      tone: "warning",
      title: "Retorno antes da hora",
      message: `${base} A liberação médica só vem no último estágio.`,
    };
  }
  return {
    tone: "info",
    title: "Retorno antecipado",
    message: `${base} Mesmo com risco baixo, o retorno não garante ritmo.`,
  };
}

/** Texto do prazo — "a definir" enquanto não há tratamento escolhido. */
export function returnEstimateLabel(medicalCase: MedicalCase): string {
  if (medicalCase.estimatedReturnOn !== null) {
    return `Retorno previsto em ${formatWorldDate(medicalCase.estimatedReturnOn)}`;
  }
  if (medicalCase.minimumDays !== null && medicalCase.maximumDays !== null) {
    return `Faixa estimada: ${medicalCase.minimumDays}–${medicalCase.maximumDays} dias`;
  }
  return "Prazo a definir pelos exames";
}

/** `YYYY-MM-DD` → `DD/MM/YYYY`. Data do mundo, não do relógio do device. */
export function formatWorldDate(worldDate: string): string {
  const [year, month, day] = worldDate.split("-");
  if (year === undefined || month === undefined || day === undefined) {
    return worldDate;
  }
  return `${day}/${month}/${year}`;
}

/** Resumo do topo da lista — a "incidência agregada" que o doc pede. */
export function departmentSummary(department: MedicalDepartment): string {
  const restrictions = department.restrictions.length;
  if (department.cases.length === 0 && restrictions === 0) {
    return department.squadSize === 0
      ? "Sem elenco registrado"
      : `Elenco saudável — ${department.squadSize} jogadores disponíveis`;
  }
  if (department.cases.length === 0) {
    return `${restrictions} ${restrictions === 1 ? "jogador impedido" : "jogadores impedidos"} sem caso registrado · ${department.healthyCount} sãos`;
  }
  const total = department.cases.length;
  const inRehab = department.cases.filter(
    (item) => item.state === "REHAB",
  ).length;
  const base = `${total} ${total === 1 ? "caso aberto" : "casos abertos"} · ${inRehab} em reabilitação · ${department.healthyCount} sãos`;
  return restrictions === 0
    ? base
    : `${base} · ${restrictions} sem caso registrado`;
}

/**
 * Rótulo do impedimento sem episódio.
 *
 * Só chega aqui quem está `INJURED` — `UNAVAILABLE` é sessão de treino, não
 * medicina, e fica fora ainda na query.
 */
export function restrictionLabel(restriction: MedicalRestriction): string {
  return restriction.availability === "INJURED"
    ? "Marcado como lesionado, sem caso médico aberto"
    : "Indisponível, sem caso médico aberto";
}

/** Nível da comissão médica; `null` = clube sem médico contratado. */
export function departmentLevelLabel(level: number | null): string {
  if (level === null) return "Sem comissão médica contratada";
  if (level >= 80) return `Comissão médica de elite (${level})`;
  if (level >= 60) return `Comissão médica competente (${level})`;
  if (level >= 40) return `Comissão médica mediana (${level})`;
  return `Comissão médica limitada (${level})`;
}
