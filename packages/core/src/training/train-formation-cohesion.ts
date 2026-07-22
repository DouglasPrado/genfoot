import { DomainError, fail, succeed, type Result } from "@grinta/shared";

/**
 * Treino da formação como fonte de ENTROSAMENTO (R-220 Fase 3, refinamento
 * declarado: "treino coletivo-por-formação como fonte de coesão").
 *
 * A coesão do time (R-220.1) só subia jogando partida e caía por transferência.
 * Faltava o meio-termo que o treinador controla: pôr os titulares para treinar a
 * formação escolhida entrosa o coletivo — devagar, menos que uma partida de
 * verdade (a magnitude vive em `team-cohesion`, VAL-001).
 *
 * Exige uma escalação: não se treina uma formação que não foi montada. É o que
 * amarra o treino de grupo aos TITULARES e à formação tática, e não a "o elenco
 * todo genérico".
 */
export interface LineupPresenceReader {
  /** O clube tem uma escalação montada? Sem ela, não há formação a treinar. */
  hasLineup(gameWorldId: string, clubId: string): Promise<boolean>;
}

export interface CohesionWriter {
  /**
   * Sobe a coesão do clube pelo ganho de treino de formação (teto 100).
   * `bonusPoints` (default 0) soma ao ganho base — usado pelo bônus de
   * ADAPTAÇÃO do treino em grupo (participantes fora do ofício entrosam mais).
   */
  raiseByFormationTraining(
    gameWorldId: string,
    clubId: string,
    bonusPoints?: number,
  ): Promise<void>;
}

/** Escalação e coesão mudam no MESMO commit — checar e subir é um efeito só. */
export interface CohesionTrainingRepositories {
  readonly lineup: LineupPresenceReader;
  readonly cohesion: CohesionWriter;
}

export interface CohesionTrainingUnitOfWork {
  run<T>(work: (repos: CohesionTrainingRepositories) => Promise<T>): Promise<T>;
}

export interface TrainFormationCohesionInput {
  readonly gameWorldId: string;
  readonly clubId: string;
}

export class TrainFormationCohesion {
  public constructor(
    private readonly lineup: LineupPresenceReader,
    private readonly cohesion: CohesionWriter,
  ) {}

  public async execute(
    input: TrainFormationCohesionInput,
  ): Promise<Result<{ readonly trained: true }, DomainError>> {
    const hasLineup = await this.lineup.hasLineup(
      input.gameWorldId,
      input.clubId,
    );
    if (!hasLineup) {
      return fail(
        new DomainError(
          "NO_LINEUP_TO_TRAIN",
          "Monte a escalação antes de treinar a formação.",
          { clubId: input.clubId },
        ),
      );
    }
    await this.cohesion.raiseByFormationTraining(
      input.gameWorldId,
      input.clubId,
    );
    return succeed({ trained: true });
  }
}
