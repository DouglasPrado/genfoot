/**
 * Leitura de C2 — separada da porta de escrita (R-175).
 *
 * `WorldRepository` carrega UM mundo por id, e é estreito de propósito. Faltava
 * o oposto: a LISTA dos mundos que existem.
 *
 * Sem isto, o admin listava os mundos do `localStorage` do navegador
 * (`worlds.ts:24`, que já declarava "um endpoint de listagem no servidor é
 * follow-up"). O efeito: trocar de navegador, limpar o cache ou criar o mundo
 * por outro caminho deixava o console cego — e a tela de Usuários, que varre os
 * mundos conhecidos, vinha sempre vazia. Um console de operação que só enxerga o
 * que este navegador lembra não é um console.
 *
 * `clubCount` entra aqui, e não numa segunda chamada por mundo: a lista sem ele
 * obrigaria a tela a disparar N queries para saber quais mundos têm gênese — e
 * "tem clubes?" é a pergunta que o operador faz olhando a lista.
 */
export interface WorldListItemView {
  readonly id: string;
  readonly seed: string;
  readonly status: string;
  readonly currentDate: string;
  readonly startDate: string;
  readonly rulesetVersion: string;
  readonly clubCount: number;
}

export interface WorldReadModel {
  /** Todos os mundos. Sem paginação: são dezenas, não milhões. */
  listWorlds(): Promise<readonly WorldListItemView[]>;
}
