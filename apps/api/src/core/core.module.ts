import { Module } from "@nestjs/common";
import {
  createPrismaClient,
  PrismaClubControlRepository,
  PrismaClubReadModel,
  PrismaSquadReadModel,
  PrismaLedgerReadModel,
  PrismaClubFinanceReadModel,
  PrismaCompetitionReadModel,
  PrismaTrainingPlanRepository,
  PrismaTrainingContextReader,
  PrismaAccrualContextReader,
  PrismaAccrualBufferWriter,
  PrismaSeasonAccrualUnitOfWork,
  PrismaPlayerDevelopmentReadModel,
  PrismaPlayerRepository,
  PrismaYouthIntakeReadModel,
  PrismaSeasonAgingUnitOfWork,
  PrismaSeasonLifecycleRepository,
  PrismaClubLineupRepository,
  PrismaLineupContextReader,
  PrismaMatchesReadModel,
  PrismaMarketReadModel,
  PrismaFanbaseReadModel,
  PrismaNarrativeReadModel,
  PrismaStaffReadModel,
  PrismaInboxReadModel,
  PrismaClubRepository,
  PrismaClubUnitOfWork,
  PrismaGenesisUnitOfWork,
  PrismaMatchPlayRepository,
  PrismaPresenceRepository,
  PrismaWorldClockRepository,
  PrismaTransferUnitOfWork,
  PrismaPromoteYouthUnitOfWork,
  PrismaDemoteToYouthUnitOfWork,
  PrismaReleaseUnitOfWork,
  PrismaSellUnitOfWork,
  PrismaListUnitOfWork,
  PrismaCompetitionUnitOfWork,
  PrismaAutomationUnitOfWork,
  PrismaSeasonFinanceUnitOfWork,
  PrismaIdentityReadModel,
  PrismaUserAccountRepository,
  PrismaIdentityUnitOfWork,
  PrismaWorldReadModel,
  PrismaWorldRepository,
  type PrismaClient,
} from "@grinta/persistence";

import { IdempotencyStore } from "./idempotency-store.js";
import {
  CLUB_CONTROL_REPOSITORY,
  CLUB_READ_MODEL,
  SQUAD_READ_MODEL,
  LEDGER_READ_MODEL,
  CLUB_FINANCE_READ_MODEL,
  COMPETITION_READ_MODEL,
  TRAINING_PLAN_REPOSITORY,
  TRAINING_CONTEXT_READER,
  TRAINING_ACCRUAL_CONTEXT_READER,
  TRAINING_ACCRUAL_BUFFER_WRITER,
  SEASON_ACCRUAL_UNIT_OF_WORK,
  PLAYER_DEVELOPMENT_READ_MODEL,
  PLAYER_REPOSITORY,
  YOUTH_INTAKE_READ_MODEL,
  SEASON_AGING_UNIT_OF_WORK,
  SEASON_LIFECYCLE_REPOSITORY,
  CLUB_LINEUP_REPOSITORY,
  LINEUP_CONTEXT_READER,
  MATCHES_READ_MODEL,
  MARKET_READ_MODEL,
  FANBASE_READ_MODEL,
  NARRATIVE_READ_MODEL,
  STAFF_READ_MODEL,
  INBOX_READ_MODEL,
  CLUB_REPOSITORY,
  CLUB_UNIT_OF_WORK,
  GENESIS_UNIT_OF_WORK,
  MATCH_PLAY_REPOSITORY,
  PRESENCE_REPOSITORY,
  WORLD_CLOCK_REPOSITORY,
  TRANSFER_UNIT_OF_WORK,
  PROMOTE_YOUTH_UNIT_OF_WORK,
  DEMOTE_TO_YOUTH_UNIT_OF_WORK,
  RELEASE_UNIT_OF_WORK,
  SELL_UNIT_OF_WORK,
  LIST_UNIT_OF_WORK,
  COMPETITION_UNIT_OF_WORK,
  AUTOMATION_UNIT_OF_WORK,
  SEASON_FINANCE_UNIT_OF_WORK,
  GAME_WORLD_REPOSITORY,
  IDEMPOTENCY_STORE,
  IDENTITY_READ_MODEL,
  IDENTITY_UNIT_OF_WORK,
  PRISMA_CLIENT,
  USER_ACCOUNT_REPOSITORY,
  WORLD_READ_MODEL,
} from "./tokens.js";

/**
 * Fronteira domínio↔infra da API. Nenhuma regra vive aqui: a API só orquestra
 * os casos de uso de `@grinta/core`.
 *
 * **Há UM armazenamento: o Postgres.** O adapter JSON e os três wrappers
 * preguiçosos (`LazyWorldRepository` e irmãos) morreram junto com a arquitetura
 * morta. Eles só existiam porque a migração era contexto a contexto e exigir
 * `DATABASE_URL` no boot derrubaria a API por causa de um contexto — o próprio
 * comentário deles dizia que sumiriam quando o último migrasse.
 *
 * Agora o boot EXIGE o banco, e isso é a melhoria: uma API que sobe sem
 * `DATABASE_URL` e só falha no primeiro request esconde o defeito até o usuário
 * o encontrar.
 */
@Module({
  providers: [
    {
      provide: PRISMA_CLIENT,
      useFactory: (): PrismaClient => {
        const url = process.env.DATABASE_URL;
        if (url === undefined || url.trim() === "") {
          throw new Error(
            "DATABASE_URL não definida. O Postgres é o único armazenamento (R-173): " +
              "suba o banco (docker compose up -d) e exporte a URL.",
          );
        }
        return createPrismaClient(url);
      },
    },
    {
      provide: GAME_WORLD_REPOSITORY,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaWorldRepository =>
        new PrismaWorldRepository(client),
    },
    {
      provide: WORLD_READ_MODEL,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaWorldReadModel =>
        new PrismaWorldReadModel(client),
    },
    {
      provide: CLUB_REPOSITORY,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaClubRepository =>
        new PrismaClubRepository(client),
    },
    {
      provide: CLUB_READ_MODEL,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaClubReadModel =>
        new PrismaClubReadModel(client),
    },
    {
      provide: SQUAD_READ_MODEL,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaSquadReadModel =>
        new PrismaSquadReadModel(client),
    },
    {
      provide: LEDGER_READ_MODEL,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaLedgerReadModel =>
        new PrismaLedgerReadModel(client),
    },
    {
      provide: CLUB_FINANCE_READ_MODEL,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaClubFinanceReadModel =>
        new PrismaClubFinanceReadModel(client),
    },
    {
      provide: TRAINING_PLAN_REPOSITORY,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaTrainingPlanRepository =>
        new PrismaTrainingPlanRepository(client),
    },
    {
      provide: TRAINING_CONTEXT_READER,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaTrainingContextReader =>
        new PrismaTrainingContextReader(client),
    },
    {
      provide: TRAINING_ACCRUAL_CONTEXT_READER,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaAccrualContextReader =>
        new PrismaAccrualContextReader(client),
    },
    {
      provide: TRAINING_ACCRUAL_BUFFER_WRITER,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaAccrualBufferWriter =>
        new PrismaAccrualBufferWriter(client),
    },
    {
      provide: SEASON_ACCRUAL_UNIT_OF_WORK,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaSeasonAccrualUnitOfWork =>
        new PrismaSeasonAccrualUnitOfWork(client),
    },
    {
      provide: PLAYER_DEVELOPMENT_READ_MODEL,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaPlayerDevelopmentReadModel =>
        new PrismaPlayerDevelopmentReadModel(client),
    },
    {
      provide: SEASON_AGING_UNIT_OF_WORK,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaSeasonAgingUnitOfWork =>
        new PrismaSeasonAgingUnitOfWork(client),
    },
    {
      provide: SEASON_LIFECYCLE_REPOSITORY,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaSeasonLifecycleRepository =>
        new PrismaSeasonLifecycleRepository(client),
    },
    {
      provide: CLUB_LINEUP_REPOSITORY,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaClubLineupRepository =>
        new PrismaClubLineupRepository(client),
    },
    {
      provide: LINEUP_CONTEXT_READER,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaLineupContextReader =>
        new PrismaLineupContextReader(client),
    },
    {
      provide: PLAYER_REPOSITORY,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaPlayerRepository =>
        new PrismaPlayerRepository(client),
    },
    {
      provide: YOUTH_INTAKE_READ_MODEL,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaYouthIntakeReadModel =>
        new PrismaYouthIntakeReadModel(client),
    },
    {
      provide: COMPETITION_READ_MODEL,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaCompetitionReadModel =>
        new PrismaCompetitionReadModel(client),
    },
    {
      provide: MATCHES_READ_MODEL,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaMatchesReadModel =>
        new PrismaMatchesReadModel(client),
    },
    {
      provide: MARKET_READ_MODEL,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaMarketReadModel =>
        new PrismaMarketReadModel(client),
    },
    {
      provide: FANBASE_READ_MODEL,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaFanbaseReadModel =>
        new PrismaFanbaseReadModel(client),
    },
    {
      provide: NARRATIVE_READ_MODEL,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaNarrativeReadModel =>
        new PrismaNarrativeReadModel(client),
    },
    {
      provide: STAFF_READ_MODEL,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaStaffReadModel =>
        new PrismaStaffReadModel(client),
    },
    {
      provide: INBOX_READ_MODEL,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaInboxReadModel =>
        new PrismaInboxReadModel(client),
    },
    {
      provide: CLUB_UNIT_OF_WORK,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaClubUnitOfWork =>
        new PrismaClubUnitOfWork(client),
    },
    {
      provide: GENESIS_UNIT_OF_WORK,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaGenesisUnitOfWork =>
        new PrismaGenesisUnitOfWork(client),
    },
    {
      provide: MATCH_PLAY_REPOSITORY,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaMatchPlayRepository =>
        new PrismaMatchPlayRepository(client),
    },
    {
      provide: PRESENCE_REPOSITORY,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaPresenceRepository =>
        new PrismaPresenceRepository(client),
    },
    {
      provide: WORLD_CLOCK_REPOSITORY,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaWorldClockRepository =>
        new PrismaWorldClockRepository(client),
    },
    {
      provide: TRANSFER_UNIT_OF_WORK,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaTransferUnitOfWork =>
        new PrismaTransferUnitOfWork(client),
    },
    {
      provide: PROMOTE_YOUTH_UNIT_OF_WORK,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaPromoteYouthUnitOfWork =>
        new PrismaPromoteYouthUnitOfWork(client),
    },
    {
      provide: DEMOTE_TO_YOUTH_UNIT_OF_WORK,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaDemoteToYouthUnitOfWork =>
        new PrismaDemoteToYouthUnitOfWork(client),
    },
    {
      provide: RELEASE_UNIT_OF_WORK,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaReleaseUnitOfWork =>
        new PrismaReleaseUnitOfWork(client),
    },
    {
      provide: SELL_UNIT_OF_WORK,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaSellUnitOfWork =>
        new PrismaSellUnitOfWork(client),
    },
    {
      provide: LIST_UNIT_OF_WORK,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaListUnitOfWork =>
        new PrismaListUnitOfWork(client),
    },
    {
      provide: COMPETITION_UNIT_OF_WORK,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaCompetitionUnitOfWork =>
        new PrismaCompetitionUnitOfWork(client),
    },
    {
      provide: AUTOMATION_UNIT_OF_WORK,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaAutomationUnitOfWork =>
        new PrismaAutomationUnitOfWork(client),
    },
    {
      provide: SEASON_FINANCE_UNIT_OF_WORK,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaSeasonFinanceUnitOfWork =>
        new PrismaSeasonFinanceUnitOfWork(client),
    },
    {
      provide: CLUB_CONTROL_REPOSITORY,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaClubControlRepository =>
        new PrismaClubControlRepository(client),
    },
    {
      provide: IDENTITY_UNIT_OF_WORK,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaIdentityUnitOfWork =>
        new PrismaIdentityUnitOfWork(client),
    },
    {
      provide: IDENTITY_READ_MODEL,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaIdentityReadModel =>
        new PrismaIdentityReadModel(client),
    },
    {
      provide: USER_ACCOUNT_REPOSITORY,
      inject: [PRISMA_CLIENT],
      useFactory: (client: PrismaClient): PrismaUserAccountRepository =>
        new PrismaUserAccountRepository(client),
    },
    {
      provide: IDEMPOTENCY_STORE,
      useFactory: (): IdempotencyStore => new IdempotencyStore(),
    },
  ],
  exports: [
    PRISMA_CLIENT,
    GAME_WORLD_REPOSITORY,
    WORLD_READ_MODEL,
    CLUB_REPOSITORY,
    CLUB_READ_MODEL,
    SQUAD_READ_MODEL,
    LEDGER_READ_MODEL,
    CLUB_FINANCE_READ_MODEL,
    COMPETITION_READ_MODEL,
    MATCHES_READ_MODEL,
    MARKET_READ_MODEL,
    FANBASE_READ_MODEL,
    NARRATIVE_READ_MODEL,
    STAFF_READ_MODEL,
    INBOX_READ_MODEL,
    CLUB_UNIT_OF_WORK,
    GENESIS_UNIT_OF_WORK,
    MATCH_PLAY_REPOSITORY,
    PRESENCE_REPOSITORY,
    WORLD_CLOCK_REPOSITORY,
    TRANSFER_UNIT_OF_WORK,
    PROMOTE_YOUTH_UNIT_OF_WORK,
    DEMOTE_TO_YOUTH_UNIT_OF_WORK,
    RELEASE_UNIT_OF_WORK,
    SELL_UNIT_OF_WORK,
    LIST_UNIT_OF_WORK,
    COMPETITION_UNIT_OF_WORK,
    TRAINING_PLAN_REPOSITORY,
    TRAINING_CONTEXT_READER,
    TRAINING_ACCRUAL_CONTEXT_READER,
    TRAINING_ACCRUAL_BUFFER_WRITER,
    SEASON_ACCRUAL_UNIT_OF_WORK,
    PLAYER_DEVELOPMENT_READ_MODEL,
    SEASON_AGING_UNIT_OF_WORK,
    SEASON_LIFECYCLE_REPOSITORY,
    CLUB_LINEUP_REPOSITORY,
    LINEUP_CONTEXT_READER,
    PLAYER_REPOSITORY,
    YOUTH_INTAKE_READ_MODEL,
    AUTOMATION_UNIT_OF_WORK,
    SEASON_FINANCE_UNIT_OF_WORK,
    CLUB_CONTROL_REPOSITORY,
    IDEMPOTENCY_STORE,
    IDENTITY_UNIT_OF_WORK,
    IDENTITY_READ_MODEL,
    USER_ACCOUNT_REPOSITORY,
  ],
})
export class CoreModule {}
