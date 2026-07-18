import type { ClubRepository } from "../clubs/club-repository.js";
import type { SquadRepository } from "../clubs/squad-repository.js";
import type { CompetitionRepository } from "../competitions/competition-repository.js";
import type { FanbaseRepository } from "../fanbase/fanbase-repository.js";
import type { LedgerRepository } from "../finance/ledger-repository.js";
import type { PlayerRepository } from "../players/player-repository.js";

/**
 * Os repositórios que a gênese escreve, todos ligados à MESMA transação.
 *
 * A gênese é um efeito atômico: ou o mundo nasce inteiro — 16 clubes, 368
 * jogadores, 16 elencos, o razão com a dotação — ou não nasce. Um mundo com
 * clubes e sem dinheiro é pior que um mundo vazio: parece pronto e não é.
 */
export interface GenesisRepositories {
  readonly clubs: ClubRepository;
  readonly players: PlayerRepository;
  readonly squads: SquadRepository;
  readonly ledger: LedgerRepository;
  readonly competitions: CompetitionRepository;
  readonly fanbase: FanbaseRepository;
}

/**
 * Envolve a materialização da gênese numa transação. O adapter constrói os três
 * repositórios sobre o MESMO `TransactionClient`, e é isso que garante a
 * atomicidade que os saves individuais, cada um na sua transação, não dariam.
 */
export interface GenesisUnitOfWork {
  run<T>(work: (repositories: GenesisRepositories) => Promise<T>): Promise<T>;
}
