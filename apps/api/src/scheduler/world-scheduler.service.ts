import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";

import {
  AdvanceWorldOneDay,
  addSeconds,
  type CompetitionReadModel,
  type CompetitionUnitOfWork,
  type MatchPlayRepository,
  type WorldClockRepository,
  type WorldRepository,
} from "@grinta/core";

import {
  COMPETITION_READ_MODEL,
  COMPETITION_UNIT_OF_WORK,
  GAME_WORLD_REPOSITORY,
  MATCH_PLAY_REPOSITORY,
  WORLD_CLOCK_REPOSITORY,
} from "../core/tokens.js";

/** De quanto em quanto tempo (ms) o scheduler verifica os relógios vencidos. */
const POLL_INTERVAL_MS = Number(process.env.GRINTA_SCHEDULER_POLL_MS ?? 10_000);
/** Quantos mundos processar por passada. */
const BATCH = 20;

/**
 * O scheduler do mundo (MUNDO-V3): o mundo anda SOZINHO. A cada intervalo, acha
 * os mundos ATIVOS com o relógio rodando e vencido (`nextTickAt ≤ agora`),
 * avança UM dia lógico em cada (o motor do dia, MUNDO-V2) e reagenda o próximo
 * tick para `+ realSecondsPerDay`. Se um mundo está muito atrasado, ele volta a
 * vencer no próximo intervalo e recupera um dia por vez.
 *
 * É `setInterval` puro (sem dependência de scheduler) com trava anti-sobreposição
 * — se uma passada demora mais que o intervalo, a próxima espera.
 */
@Injectable()
export class WorldSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorldSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  public constructor(
    @Inject(GAME_WORLD_REPOSITORY)
    private readonly worlds: WorldRepository,
    @Inject(WORLD_CLOCK_REPOSITORY)
    private readonly worldClock: WorldClockRepository,
    @Inject(COMPETITION_UNIT_OF_WORK)
    private readonly competitionUnitOfWork: CompetitionUnitOfWork,
    @Inject(COMPETITION_READ_MODEL)
    private readonly competitionReadModel: CompetitionReadModel,
    @Inject(MATCH_PLAY_REPOSITORY)
    private readonly matchPlay: MatchPlayRepository,
  ) {}

  public onModuleInit(): void {
    // Desligável em teste/CI: o gate roda a suíte sem um mundo andando por baixo.
    if (process.env.GRINTA_SCHEDULER_DISABLED === "1") return;
    this.timer = setInterval(() => void this.tick(), POLL_INTERVAL_MS);
    this.logger.log(`Relógio do mundo a cada ${POLL_INTERVAL_MS}ms.`);
  }

  public onModuleDestroy(): void {
    if (this.timer !== null) clearInterval(this.timer);
  }

  /** Uma passada: avança os mundos vencidos um dia. Pública para prova/teste. */
  public async tick(): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    let advanced = 0;
    try {
      const nowIso = new Date().toISOString();
      const due = await this.worldClock.dueWorlds(nowIso, BATCH);
      for (const world of due) {
        if (world.realSecondsPerDay === null) continue;
        const result = await new AdvanceWorldOneDay({
          worlds: this.worlds,
          competitionUnitOfWork: this.competitionUnitOfWork,
          competitionReadModel: this.competitionReadModel,
          matchPlay: this.matchPlay,
        }).execute({ gameWorldId: world.gameWorldId });
        // Reagenda na grade (a partir do tick vencido, não de agora — sem drift).
        const base = world.nextTickAt ?? nowIso;
        await this.worldClock.setNextTick(
          world.gameWorldId,
          addSeconds(base, world.realSecondsPerDay),
        );
        if (result.ok) advanced += 1;
        else this.logger.warn(`Mundo ${world.gameWorldId}: ${result.error.code}`);
      }
    } catch (error) {
      this.logger.error(`Falha na passada do scheduler: ${String(error)}`);
    } finally {
      this.running = false;
    }
    return advanced;
  }
}
