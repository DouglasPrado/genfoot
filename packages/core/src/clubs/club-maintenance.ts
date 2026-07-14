import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type Result,
} from "@grinta/shared";

import type { ScheduledTaskHandler } from "../scheduling/scheduling-types.js";
import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import type { ClubPortfolioRepository } from "./club-repository.js";
import type { WorldClubPortfolioSnapshot } from "./club-types.js";

export function processClubMaintenanceDay(
  snapshot: WorldClubPortfolioSnapshot,
  worldDate: string,
): Result<WorldClubPortfolioSnapshot, DomainError> {
  const parsed = WorldDate.parse(worldDate);
  if (!parsed.ok) return parsed;
  const key = `${snapshot.gameWorldId}:${worldDate}`;
  if (snapshot.processedMaintenanceDayKeys.includes(key))
    return succeed(snapshot);
  const origin = snapshot.clubs[0]?.identityHistory[0]?.effectiveFrom;
  if (origin === undefined) {
    return fail(
      new DomainError(
        "INVALID_CLUB_PORTFOLIO",
        "Portfólio sem origem temporal.",
      ),
    );
  }
  const elapsedDays = Math.round(
    (Date.parse(`${worldDate}T00:00:00Z`) - Date.parse(`${origin}T00:00:00Z`)) /
      86_400_000,
  );
  const deteriorates = elapsedDays > 0 && elapsedDays % 30 === 0;
  const clubs = deteriorates
    ? snapshot.clubs.map((club) => ({
        ...club,
        departments: club.departments.map((department) => ({
          ...department,
          condition: Math.max(0, department.condition - 1),
          maintenanceDueOn:
            department.condition - 1 <= 70
              ? worldDate
              : department.maintenanceDueOn,
          version: department.version + 1,
        })),
        stadium: {
          ...club.stadium,
          condition: Math.max(0, club.stadium.condition - 1),
          maintenanceDueOn:
            club.stadium.condition - 1 <= 70
              ? worldDate
              : club.stadium.maintenanceDueOn,
          version: club.stadium.version + 1,
        },
        version: club.version + 1,
      }))
    : snapshot.clubs;
  return succeed({
    ...snapshot,
    clubs,
    processedMaintenanceDayKeys: [...snapshot.processedMaintenanceDayKeys, key],
    revision: snapshot.revision + 1,
  });
}

export function createClubMaintenanceTaskHandler(
  repository: ClubPortfolioRepository,
): ScheduledTaskHandler {
  return async (context) => {
    const snapshot = await repository.findClubPortfolioByWorldId(
      context.gameWorldId,
    );
    if (snapshot === null)
      throw new DomainError(
        "CLUB_PORTFOLIO_NOT_FOUND",
        "Portfólio não encontrado.",
      );
    const processed = processClubMaintenanceDay(snapshot, context.worldDate);
    if (!processed.ok) throw processed.error;
    if (processed.value !== snapshot) {
      await repository.saveClubPortfolio(processed.value, snapshot.revision);
    }
  };
}

export function buildClubDailyTasks(
  input: Readonly<{
    gameWorldId: WorldClubPortfolioSnapshot["gameWorldId"];
    worldSeed: string;
    fromExclusive: string;
    throughInclusive: string;
  }>,
) {
  const from = WorldDate.parse(input.fromExclusive);
  if (!from.ok) throw from.error;
  const through = WorldDate.parse(input.throughInclusive);
  if (!through.ok) throw through.error;
  const firstDueOn = from.value.addDays(1).toString();
  if (firstDueOn > through.value.toString()) return [];
  return [
    {
      id: deterministicUuidV7<"ScheduledTask">({
        worldSeed: input.worldSeed,
        context: "clubs:process-day:recurring",
        timestampMilliseconds: Date.parse(`${firstDueOn}T00:00:00.000Z`),
      }),
      type: "clubs:process-day",
      dueOn: firstDueOn,
      priority: 30,
      payload: {},
      idempotencyKey: `clubs:process-day:${input.gameWorldId}`,
      recurrence: { everyDays: 1, untilOn: through.value.toString() },
    },
  ];
}
