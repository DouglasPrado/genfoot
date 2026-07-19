import type { CommandTrackingStatus } from "./clients-types.js";
import type { RiskTier, ScreenState } from "./screen-registry.js";

export type GoldenPathId =
  | "GP-001"
  | "GP-002"
  | "GP-003"
  | "GP-004"
  | "GP-005"
  | "GP-006"
  | "GP-007"
  | "GP-008"
  | "GP-009"
  | "GP-010"
  | "GP-011"
  | "GP-012"
  | "GP-013"
  | "GP-014"
  | "GP-015"
  | "GP-016";

export interface GoldenPathDefinition {
  readonly id: GoldenPathId;
  readonly title: string;
  readonly summary: string;
  readonly screenIds: readonly string[];
  /** `world` usa GET /worlds/:id; os demais usam /worlds/:id/:queryType. */
  readonly queryTypes: readonly string[];
  readonly commandTypes: readonly string[];
  readonly offlineIntentTypes: readonly string[];
  readonly risk: RiskTier;
}

const path = (
  definition: GoldenPathDefinition,
): GoldenPathDefinition => definition;

export const GOLDEN_PATH_REGISTRY: readonly GoldenPathDefinition[] = [
  path({ id: "GP-001", title: "Criação e entrada em clube", summary: "Escolha o mundo, reserve um clube e ative o controle.", screenIds: ["M-WORLD-PICK", "M-CLUB-PICK", "M-CLUB-PREVIEW", "M-CONTROL-ACTIVATE"], queryTypes: ["world", "identity", "club"], commandTypes: ["identity:join-world", "identity:reserve-club", "identity:confirm-onboarding"], offlineIntentTypes: [], risk: "high" }),
  path({ id: "GP-002", title: "Retorno após ausência", summary: "Reconcilie mudanças, decisões automáticas e urgências.", screenIds: ["M-RETURN", "M-HOME", "M-DECISIONS"], queryTypes: ["world", "identity", "inbox", "automation"], commandTypes: ["identity:start-session", "automation:get-explanation"], offlineIntentTypes: ["MARK_NOTIFICATION_READ"], risk: "low" }),
  path({ id: "GP-003", title: "Abandono ou troca de clube", summary: "Encerre o vínculo preservando o clube e cumpra o cooldown.", screenIds: ["M-CLUB-LEAVE", "M-MY-WORLDS"], queryTypes: ["identity", "club"], commandTypes: ["identity:end-club-control", "identity:request-switch"], offlineIntentTypes: [], risk: "irreversible" }),
  path({ id: "GP-004", title: "Início de temporada", summary: "Confirme participantes, calendário, inscrições e preparação.", screenIds: ["M-COMPETITIONS", "M-CALENDAR", "M-REGISTRATION"], queryTypes: ["competitions", "scheduler", "club"], commandTypes: ["competition:create-edition", "competition:generate-fixtures", "scheduler:schedule-tasks"], offlineIntentTypes: [], risk: "high" }),
  path({ id: "GP-005", title: "Ciclo semanal de gestão", summary: "Revise urgências, elenco, treino, mercado e próxima partida.", screenIds: ["M-HOME", "M-SQUAD", "M-TRAINING", "M-NEXTMATCH"], queryTypes: ["world", "players", "inbox", "matches"], commandTypes: ["world:advance-day"], offlineIntentTypes: ["SET_LINEUP_DRAFT", "TOGGLE_TRAINING_FOCUS"], risk: "medium" }),
  path({ id: "GP-006", title: "Encerramento de temporada", summary: "Homologue resultados e processe a virada sem resetar o mundo.", screenIds: ["M-SEASON-CLOSE", "M-AWARDS", "M-HISTORY"], queryTypes: ["competitions", "ledger", "players", "scheduler"], commandTypes: ["competition:homologate", "season:rollover:start", "season:rollover:resume"], offlineIntentTypes: [], risk: "irreversible" }),
  path({ id: "GP-007", title: "Preparação e partida", summary: "Prepare escalação, acompanhe decisões e consulte o pós-jogo.", screenIds: ["M-PREMATCH", "M-LINEUP", "M-LIVE", "M-POSTMATCH"], queryTypes: ["matches", "players", "competitions"], commandTypes: ["match:create-manifest", "match:start", "match:submit-command", "match:finalize"], offlineIntentTypes: ["SET_LINEUP_DRAFT"], risk: "high" }),
  path({ id: "GP-008", title: "Contratação de jogador", summary: "Observe, negocie, reserve recursos e registre o reforço.", screenIds: ["M-SCOUTING", "M-NEGOTIATION", "M-CONTRACT", "M-REGISTRATION"], queryTypes: ["market", "ledger", "players"], commandTypes: ["market:request-scouting", "market:open-negotiation", "market:submit-offer", "market:start-transfer"], offlineIntentTypes: [], risk: "irreversible" }),
  path({ id: "GP-009", title: "Venda de jogador", summary: "Avalie impacto, responda à proposta e acompanhe a saída.", screenIds: ["M-PLAYER", "M-NEGOTIATION", "M-ACCOUNTING"], queryTypes: ["market", "players", "ledger"], commandTypes: ["market:submit-offer", "market:accept-offer", "market:start-transfer"], offlineIntentTypes: [], risk: "irreversible" }),
  path({ id: "GP-010", title: "Empréstimo de jogador", summary: "Negocie condições, acompanhe minutos e conclua o desfecho.", screenIds: ["M-LOAN", "M-PLAYER-MEMORY"], queryTypes: ["market", "players"], commandTypes: ["market:start-loan", "market:exercise-loan-option", "market:return-loaned-player"], offlineIntentTypes: [], risk: "irreversible" }),
  path({ id: "GP-011", title: "Jornada de um jovem", summary: "Capte, desenvolva e promova talentos com histórico preservado.", screenIds: ["M-ACADEMY", "M-YOUTH-PLAYER", "M-CAREER-PLAN", "M-PROMOTE"], queryTypes: ["players", "club"], commandTypes: ["youth:promote-player"], offlineIntentTypes: ["TOGGLE_TRAINING_FOCUS"], risk: "high" }),
  path({ id: "GP-012", title: "Lesão e recuperação", summary: "Abra o caso médico, reavalie e libere conforme o estado oficial.", screenIds: ["M-MEDICAL", "M-MEDICAL-CASE"], queryTypes: ["players"], commandTypes: ["player:open-medical-case", "player:reassess-medical"], offlineIntentTypes: [], risk: "high" }),
  path({ id: "GP-013", title: "Ciclo financeiro mensal", summary: "Concilie lançamentos, dívidas e feche o período no ledger.", screenIds: ["M-FINANCE", "M-ACCOUNTING", "M-DEBT"], queryTypes: ["ledger", "club"], commandTypes: ["ledger:reconcile", "ledger:accrue-debt", "ledger:close-period"], offlineIntentTypes: [], risk: "irreversible" }),
  path({ id: "GP-014", title: "Projeto de infraestrutura", summary: "Inicie, acompanhe, retome ou aborte uma obra do clube.", screenIds: ["M-STRUCTURE", "M-STADIUM-WORKS"], queryTypes: ["club", "scheduler"], commandTypes: ["infrastructure:start", "infrastructure:resume", "infrastructure:abort"], offlineIntentTypes: [], risk: "irreversible" }),
  path({ id: "GP-015", title: "Crise esportiva", summary: "Entenda os fatos, proponha recuperação e acompanhe a resolução.", screenIds: ["M-BOARD", "M-MORALE", "M-PRESS"], queryTypes: ["narrative", "inbox", "club"], commandTypes: ["narrative:open-crisis", "narrative:submit-recovery", "narrative:resolve-crisis"], offlineIntentTypes: [], risk: "high" }),
  path({ id: "GP-016", title: "Crise financeira", summary: "Reconheça a dívida, proteja operações críticas e recupere o clube.", screenIds: ["M-DEBT", "M-FINANCE", "M-BOARD"], queryTypes: ["ledger", "narrative", "club"], commandTypes: ["ledger:accrue-debt", "narrative:open-crisis", "narrative:submit-recovery"], offlineIntentTypes: [], risk: "irreversible" }),
];

export function goldenPathById(
  id: string,
): GoldenPathDefinition | undefined {
  return GOLDEN_PATH_REGISTRY.find((definition) => definition.id === id);
}

export type GoldenPathScreenState = ScreenState | "content";

export function deriveGoldenPathScreenState(input: Readonly<{
  session: "connecting" | "online" | "offline";
  query: "idle" | "loading" | "ready" | "empty" | "error";
  command?: CommandTrackingStatus;
  blocked?: boolean;
}>): GoldenPathScreenState {
  if (input.session === "connecting" || input.query === "loading" || input.query === "idle") {
    return "initial-loading";
  }
  if (input.session === "offline") return "offline";
  if (input.blocked === true) return "forbidden/read-only";
  if (input.query === "empty") return "empty";
  if (input.query === "error") return "technical-error";
  if (input.command === "SUBMITTING" || input.command === "ACCEPTED") return "processing";
  if (input.command === "UNKNOWN_RECOVERING") return "partial/stale";
  if (input.command === "REJECTED") return "domain-error";
  if (input.command === "APPLIED") return "success";
  return "content";
}
