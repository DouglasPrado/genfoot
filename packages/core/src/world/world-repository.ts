import type { GameWorldId } from "@grinta/shared";

import type { GameWorldSnapshot } from "./world-types.js";

export interface WorldRepository {
  findById(id: GameWorldId): Promise<GameWorldSnapshot | null>;
  save(
    snapshot: GameWorldSnapshot,
    expectedVersion: number | null,
  ): Promise<void>;
  /**
   * Apaga o mundo e TUDO que pende dele.
   *
   * É a única operação destrutiva e irreversível da porta, e por isso ela está
   * aqui e não escondida num adapter: quem lê a porta vê que o mundo pode
   * morrer.
   *
   * Não confunda com ARQUIVAR (R-56): arquivar põe o mundo em read-only,
   * preserva "histórico, títulos e recordes" e é REVERSÍVEL por decisão
   * administrativa. Deletar não é nada disso. São operações diferentes, e o
   * canon só tem a primeira — a segunda é ferramenta de operação, não regra de
   * jogo.
   */
  delete(id: GameWorldId): Promise<void>;
}
