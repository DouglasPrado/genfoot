import { DomainError } from "@grinta/shared";

/**
 * Potencial em três camadas (R-213, `02-sistema-de-jogadores.md:203-213`).
 *
 * O domínio tinha um escalar só (`Player.potentialAbility`), e com ele a
 * pergunta que a `M-PLAYER-DEV` precisa responder — "por que estagnou?" — não
 * tem resposta: o teto era o mesmo em qualquer clube, em qualquer função.
 *
 * O doc é explícito: potencial natural 82 rende **68** em clube errado, **82**
 * no certo, **86** com mudança de posição. São três números diferentes sobre o
 * mesmo jogador, e é isso que as camadas materializam.
 */
export interface PotentialLayers {
  /** Teto bruto. Quase imutável — só cai com lesão grave. */
  readonly natural: number;
  /** O que a estrutura atual permite alcançar (R-12). */
  readonly usable: number;
  /** O que rende na função em que ele joga; pode superar o natural. */
  readonly functional: number;
}

/**
 * Aproveitamento do potencial por nível de núcleo (R-12,
 * `04-estrutura-do-clube-e-staff.md:242-252`). Índice 0 = nível 1.
 */
export const STRUCTURE_YIELD: readonly number[] = [
  0.4, 0.55, 0.7, 0.85, 0.95,
] as const;

/**
 * Nível assumido enquanto a estrutura real não é conhecida.
 *
 * Provisório declarado na R-213: `DevelopmentSignature` (§7) e os níveis de CT
 * não existem no código — a própria R-197 registra a ausência do multiplicador
 * de treino. Até existirem, assume-se o meio da tabela. É dívida, não regra: um
 * clube nível 1 e um nível 5 rendem igual hoje, e isso está errado de um jeito
 * que só some quando a estrutura for implementada.
 */
export const PROVISIONAL_STRUCTURE_LEVEL = 3;

/**
 * Quanto a função ideal pode revelar ALÉM do teto natural.
 *
 * O doc dá o número: natural 82 → 86 com mudança de posição, 4 pontos acima.
 * É o único caso em que uma camada passa do natural, e existe porque a posição
 * errada esconde qualidade — não porque a função crie qualidade do nada.
 */
const ROLE_UPSIDE = 4;

interface PotentialInput {
  readonly natural: number;
  readonly currentAbility: number;
  /** Nível do núcleo de formação (1..5), ou `null` para o provisório. */
  readonly structureLevel?: number | null;
  /** Ajuste de função, -1 (errada) a 1 (ideal). 0 = neutra. */
  readonly roleFit?: number;
}

export function derivePotentialLayers(input: PotentialInput): PotentialLayers {
  const { natural, currentAbility } = input;
  const level = input.structureLevel ?? PROVISIONAL_STRUCTURE_LEVEL;
  const roleFit = input.roleFit ?? 0;

  if (!Number.isInteger(level) || level < 1 || level > STRUCTURE_YIELD.length) {
    throw new DomainError(
      "INVALID_STRUCTURE_LEVEL",
      `Nível de estrutura deve ser inteiro entre 1 e ${STRUCTURE_YIELD.length}.`,
    );
  }
  if (roleFit < -1 || roleFit > 1) {
    throw new DomainError(
      "INVALID_ROLE_FIT",
      "roleFit deve estar entre -1 e 1.",
    );
  }

  // O rendimento incide sobre a MARGEM de crescimento, não sobre o teto.
  // R-12: "potencial para evoluir 10 pontos aproveita 4 com comissão nível 1".
  // Aplicá-lo ao teto daria aproveitável ABAIXO da habilidade atual — o jogador
  // regrediria por ter estrutura ruim, que não é o que o doc descreve.
  const margem = Math.max(0, natural - currentAbility);
  const yieldFactor = STRUCTURE_YIELD[level - 1]!;
  const usable = Math.min(
    natural,
    Math.round(currentAbility + margem * yieldFactor),
  );

  // Função errada encolhe a margem aproveitável; função ideal a estende acima
  // do natural. Piso na habilidade atual: a função errada atrasa a evolução,
  // não desfaz o jogador.
  const functional =
    roleFit >= 0
      ? Math.round(usable + roleFit * ROLE_UPSIDE)
      : Math.max(
          currentAbility,
          Math.round(usable + roleFit * (usable - currentAbility)),
        );

  return {
    natural,
    usable: Math.max(currentAbility, usable),
    functional: Math.max(currentAbility, functional),
  };
}
