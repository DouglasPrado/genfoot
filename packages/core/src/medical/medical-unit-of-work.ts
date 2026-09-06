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

/**
 * Contexto clínico de um jogador, para abrir caso MANUALMENTE sobre quem já
 * está marcado como indisponível mas nunca teve episódio registrado.
 */
export interface PlayerMedicalContextReader {
  forPlayer(
    gameWorldId: string,
    playerId: string,
    worldDate: string,
  ): Promise<{
    readonly clubId: string;
    readonly fatigue: number;
    readonly age: number;
    readonly injuredRegionHistory: readonly string[];
  } | null>;
}

export interface MedicalRepositories {
  readonly episodes: InjuryEpisodeRepository;
  readonly loads: TrainingLoadReader;
  readonly availability: PlayerAvailabilityWriter;
  readonly context: PlayerMedicalContextReader;
}

export interface MedicalUnitOfWork {
  run<T>(work: (repos: MedicalRepositories) => Promise<T>): Promise<T>;
}
