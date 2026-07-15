export type FieldKind =
  | "text"
  | "number"
  | "checkbox"
  | "select"
  | "list"
  | "date";

export interface FieldSpec {
  readonly name: string;
  readonly label: string;
  readonly kind: FieldKind;
  readonly options?: readonly string[];
  readonly optional?: boolean;
  /** Preenche com o subject da sessão (o operador que age). */
  readonly actor?: boolean;
  readonly placeholder?: string;
  readonly defaultValue?: string | number | boolean;
}

export interface CommandSpec {
  readonly commandType: string;
  readonly label: string;
  readonly fields: readonly FieldSpec[];
  readonly needsExpectedVersion?: boolean;
}

const LEDGER_TYPES = [
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "REVENUE",
  "EXPENSE",
  "FAUCET",
  "SINK",
];

/** Specs de formulário dos comandos-chave (substituem o JSON cru). */
export const COMMAND_SPECS: readonly CommandSpec[] = [
  // Mundo / temporada
  {
    commandType: "world:advance-days",
    label: "Avançar dias",
    fields: [{ name: "days", label: "Dias", kind: "number", defaultValue: 1 }],
  },
  {
    commandType: "competition:homologate",
    label: "Homologar competição",
    fields: [
      { name: "editionId", label: "Edição", kind: "text" },
      { name: "decidedBy", label: "Decidido por", kind: "text", actor: true },
    ],
  },
  {
    commandType: "competition:record-result",
    label: "Registrar resultado",
    fields: [
      { name: "fixtureId", label: "Fixture", kind: "text" },
      { name: "matchRef", label: "Match ref", kind: "text" },
      { name: "homeGoals", label: "Gols casa", kind: "number", defaultValue: 0 },
      { name: "awayGoals", label: "Gols fora", kind: "number", defaultValue: 0 },
    ],
  },
  // Ledger
  {
    commandType: "ledger:open-account",
    label: "Abrir conta",
    fields: [
      { name: "name", label: "Nome", kind: "text" },
      { name: "type", label: "Tipo", kind: "select", options: LEDGER_TYPES },
    ],
  },
  // Anti-abuso / C12
  {
    commandType: "admin:record-risk",
    label: "Sinal de risco",
    fields: [
      { name: "dedupKey", label: "Chave dedup", kind: "text" },
      { name: "subject", label: "Sujeito", kind: "text" },
      { name: "kind", label: "Tipo", kind: "text" },
      { name: "weight", label: "Peso", kind: "number", defaultValue: 10 },
      { name: "source", label: "Fonte", kind: "text", defaultValue: "admin" },
      { name: "observedOn", label: "Observado em", kind: "date" },
      { name: "actor", label: "Operador", kind: "text", actor: true },
    ],
  },
  {
    commandType: "admin:open-case",
    label: "Abrir caso",
    fields: [
      { name: "subjects", label: "Sujeitos (vírgula)", kind: "list" },
      { name: "severity", label: "Severidade", kind: "number", defaultValue: 3 },
      { name: "evidenceRefs", label: "Evidências (vírgula)", kind: "list", optional: true },
      { name: "openedBy", label: "Aberto por", kind: "text", actor: true },
    ],
  },
  {
    commandType: "admin:place-quarantine",
    label: "Quarentena",
    fields: [
      { name: "caseId", label: "Caso", kind: "text", optional: true },
      { name: "scope", label: "Escopo", kind: "text" },
      { name: "reason", label: "Motivo", kind: "text" },
      { name: "startsOn", label: "Início", kind: "date" },
      { name: "expiresOn", label: "Fim", kind: "date" },
      { name: "placedBy", label: "Aplicado por", kind: "text", actor: true },
    ],
  },
  {
    commandType: "admin:propose-sanction",
    label: "Propor sanção",
    fields: [
      { name: "subject", label: "Sujeito", kind: "text" },
      { name: "sanctionType", label: "Tipo", kind: "text" },
      { name: "severity", label: "Severidade", kind: "number", defaultValue: 3 },
      { name: "basis", label: "Base", kind: "text" },
      { name: "evidenceRefs", label: "Evidências (vírgula)", kind: "list", optional: true },
      { name: "proposedBy", label: "Proposto por", kind: "text", actor: true },
    ],
  },
  {
    commandType: "admin:approve-sanction",
    label: "Aprovar sanção",
    fields: [
      { name: "sanctionId", label: "Sanção", kind: "text" },
      { name: "approvedBy", label: "Aprovado por (≠ propositor)", kind: "text", actor: true },
    ],
  },
  {
    commandType: "admin:request-correction",
    label: "Solicitar correção",
    fields: [
      { name: "targetOwner", label: "Owner alvo", kind: "text" },
      { name: "targetId", label: "ID alvo", kind: "text" },
      { name: "targetVersion", label: "Versão alvo", kind: "number", defaultValue: 0 },
      { name: "reasonCode", label: "Código do motivo", kind: "text" },
      { name: "expectedEffect", label: "Efeito esperado", kind: "text" },
      { name: "requestedBy", label: "Solicitado por", kind: "text", actor: true },
    ],
  },
  {
    commandType: "admin:approve-correction",
    label: "Aprovar correção",
    fields: [
      { name: "correctionId", label: "Correção", kind: "text" },
      { name: "approvedBy", label: "Aprovado por (≠ solicitante)", kind: "text", actor: true },
      { name: "reject", label: "Rejeitar", kind: "checkbox" },
    ],
  },
  {
    commandType: "admin:request-reprocessing",
    label: "Reprocessar",
    fields: [
      { name: "stream", label: "Stream", kind: "text" },
      { name: "fromSequence", label: "De (seq)", kind: "number", defaultValue: 0 },
      { name: "toSequence", label: "Até (seq)", kind: "number", defaultValue: 0 },
      { name: "reason", label: "Motivo", kind: "text" },
      { name: "requestedBy", label: "Solicitado por", kind: "text", actor: true },
      { name: "expectedAuditHead", label: "Audit head esperado", kind: "text" },
    ],
  },
  {
    commandType: "admin:file-appeal",
    label: "Abrir recurso",
    fields: [
      { name: "sanctionId", label: "Sanção", kind: "text" },
      { name: "grounds", label: "Fundamentos", kind: "text" },
      { name: "appellant", label: "Recorrente", kind: "text", actor: true },
    ],
  },
  {
    commandType: "admin:decide-appeal",
    label: "Decidir recurso",
    fields: [
      { name: "sanctionId", label: "Sanção", kind: "text" },
      { name: "upheld", label: "Mantida", kind: "checkbox" },
      { name: "reviewer", label: "Revisor", kind: "text", actor: true },
    ],
  },
  {
    commandType: "admin:open-support",
    label: "Abrir suporte",
    fields: [
      { name: "requester", label: "Solicitante", kind: "text", actor: true },
      { name: "category", label: "Categoria", kind: "text" },
    ],
  },
  {
    commandType: "admin:resolve-support",
    label: "Resolver suporte",
    fields: [
      { name: "supportCaseId", label: "Caso de suporte", kind: "text" },
      { name: "resolution", label: "Resolução", kind: "text" },
      { name: "resolvedBy", label: "Resolvido por", kind: "text", actor: true },
    ],
  },
];

export function specFor(commandType: string): CommandSpec | undefined {
  return COMMAND_SPECS.find((spec) => spec.commandType === commandType);
}
