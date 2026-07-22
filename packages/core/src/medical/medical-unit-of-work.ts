/**
 * A transação do departamento médico: o episódio, a carga do dia e o estado
 * oficial do jogador no MESMO commit.
 *
 * Abrir o episódio e marcar o jogador como lesionado em transações separadas
 * deixaria a janela em que a escalação ainda o escala — a tela mostraria caso
 * aberto e jogador disponível ao mesmo tempo.
 */

import type { InjuryEpisodeRepository } from "./injury-episode-types.js";
import type { PlayerAvailabilityWriter } from "./medical-use-cases.js";
import type { TrainingLoadReader } from "./settle-training-injuries.js";

export interface MedicalRepositories {
  readonly episodes: InjuryEpisodeRepository;
  readonly loads: TrainingLoadReader;
  readonly availability: PlayerAvailabilityWriter;
}

export interface MedicalUnitOfWork {
  run<T>(work: (repos: MedicalRepositories) => Promise<T>): Promise<T>;
}
