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
  /**
   * Clubes SEM gestor — as vagas (`M-WORLD-PICK` pede "vagas" explicitamente).
   *
   * É a pergunta que o jogador faz olhando a lista: "dá para entrar?". Sem ela a
   * tela dispararia uma query de clubes por mundo só para saber se vale abrir.
   *
   * Vaga = ausência de `ClubControl` ativo (R-180: a IA é a ausência de
   * controle). Não há flag "livre" para contar — há a falta de dono.
   */
  readonly openSlots: number;
  /**
   * A participação DESTE usuário neste mundo, se houver — a "elegibilidade" que
   * o doc pede, na forma que o domínio sabe responder.
   *
   * `null` = nunca entrou. Quem já tem clube aqui não escolhe mundo, volta para
   * ele; quem saiu pode estar em cooldown (R-26). A tela decide o rótulo; o read
   * model entrega o fato.
   */
  readonly myParticipation: {
    readonly status: string;
    readonly hasActiveControl: boolean;
    readonly cooldownUntilOn: string | null;
  } | null;
}

export interface WorldReadModel {
  /**
   * Todos os mundos. Sem paginação: são dezenas, não milhões.
   *
   * `accountId` opcional: o admin lista sem conta (e `myParticipation` vem
   * `null`); o jogador lista com a dele, e a mesma query responde "posso entrar
   * aqui?" sem uma segunda ida ao servidor.
   */
  listWorlds(accountId?: string | null): Promise<readonly WorldListItemView[]>;
}
