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

/**
 * Specs de formulário dos commands vivos.
 *
 * Eram 16, e as 16 estavam mortas: `world:advance-days` (o `WorldScheduler`),
 * `competition:*`, `ledger:*` e onze `admin:*` foram apagados com os
 * mega-agregados que os serviam (R-175). Um formulário para command inexistente
 * é pior que a ausência dele — o operador preenche, envia, leva REJECTED e não
 * tem como saber que o problema não era o payload dele.
 *
 * Voltam conforme os contextos voltarem, já em agregado por entidade sobre
 * Postgres. Esta lista é o que EXISTE, não o que se pretende ter.
 */
export const COMMAND_SPECS: readonly CommandSpec[] = [
  // --- Mundo (admin) ---
  {
    commandType: "world:create",
    label: "Criar mundo",
    fields: [
      {
        name: "seed",
        label: "Seed",
        kind: "text",
        placeholder: "grinta-demo",
      },
      // Data do MUNDO, não instante de plataforma: ela rege regra de jogo e é
      // determinística. Sem ela o mundo não é reproduzível (R-182).
      {
        name: "startDate",
        label: "Data inicial",
        kind: "date",
        defaultValue: "2026-01-01",
      },
      {
        name: "rulesetVersion",
        label: "Ruleset",
        kind: "text",
        defaultValue: "1.0.0",
        optional: true,
      },
    ],
  },
  {
    commandType: "world:genesis",
    label: "Gerar mundo (clubes)",
    // Sem campos: a gênese é função pura do seed do mundo (R-185). Não há o que
    // escolher — escolher aqui quebraria o determinismo.
    fields: [],
  },
  {
    commandType: "world:activate",
    label: "Ativar mundo",
    fields: [],
  },

  // --- Identidade (C1) ---
  {
    commandType: "identity:join-world",
    label: "Entrar no mundo",
    fields: [
      { name: "accountId", label: "Conta", kind: "text", actor: true },
    ],
  },
  {
    commandType: "identity:reserve-club",
    label: "Reservar clube",
    fields: [
      { name: "accountId", label: "Conta", kind: "text", actor: true },
      { name: "clubId", label: "Clube", kind: "text" },
      // A reserva é retenção MOLE com prazo (R-25): sem vencimento ela seguraria
      // o clube para sempre.
      { name: "expiresOn", label: "Vence em", kind: "date" },
    ],
  },
  {
    commandType: "identity:confirm-onboarding",
    label: "Assumir clube",
    fields: [
      { name: "reservationId", label: "Reserva", kind: "text" },
      // Risco alto (`10-catalogo-de-commands.md:81`): assumir o clube é assumir
      // o estado herdado — dívidas, contratos, promessas. O barramento recusa
      // sem isto marcado, e é de propósito.
      {
        name: "acceptInheritedState",
        label: "Aceito o estado herdado (dívidas, contratos, promessas)",
        kind: "checkbox",
      },
    ],
  },
  {
    commandType: "identity:release-club-reservation",
    label: "Soltar reserva",
    fields: [{ name: "reservationId", label: "Reserva", kind: "text" }],
  },
  {
    commandType: "identity:end-club-control",
    label: "Largar clube",
    fields: [
      { name: "accountId", label: "Conta", kind: "text", actor: true },
      { name: "clubId", label: "Clube", kind: "text" },
    ],
  },
  {
    commandType: "identity:request-switch",
    label: "Pedir troca de clube",
    fields: [
      { name: "accountId", label: "Conta", kind: "text", actor: true },
      { name: "clubId", label: "Clube", kind: "text" },
    ],
  },
];

export function specFor(commandType: string): CommandSpec | undefined {
  return COMMAND_SPECS.find((spec) => spec.commandType === commandType);
}
