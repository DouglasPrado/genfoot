import {
  NotificationType,
  type NotificationItemSnapshot,
} from "@grinta/core";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PrismaInboxReadModel } from "../src/prisma-inbox-read-model.js";
import { PrismaNotificationRepository } from "../src/prisma-notification-repository.js";
import { CLUB_ID, WORLD_ID, seedClub, seedWorld } from "./fixtures.js";
import { connect, hasDatabase, skipReason, truncate } from "./postgres.harness.js";

const TABLES = [
  "GameWorld",
  "Club",
  "ClubIdentityPeriod",
  "Stadium",
  "Notification",
];

function notification(
  id: string,
  overrides: Partial<NotificationItemSnapshot> = {},
): NotificationItemSnapshot {
  return {
    id,
    gameWorldId: WORLD_ID as never,
    userId: null,
    clubId: CLUB_ID,
    type: NotificationType.TRANSFER_OFFER,
    title: "Contratação concluída",
    message: "Fulano assinou.",
    priority: 3,
    createdOn: "2026-01-02",
    ...overrides,
  };
}

describe.skipIf(!hasDatabase)(
  `PrismaInboxReadModel ${hasDatabase ? "" : `— PULADO: ${skipReason}`}`,
  () => {
    let client: ReturnType<typeof connect>;
    let notifications: PrismaNotificationRepository;
    let inbox: PrismaInboxReadModel;

    beforeAll(() => {
      client = connect();
      notifications = new PrismaNotificationRepository(client);
      inbox = new PrismaInboxReadModel(client);
    });

    beforeEach(async () => {
      await truncate(client, TABLES);
      await seedWorld(client);
      await seedClub(client);
    });

    afterAll(async () => {
      await client.$disconnect();
    });

    it("conta as pendências do clube — não lidas e total", async () => {
      await notifications.append(notification("019b76da-a800-7e01-9462-49c009be0001"));
      await notifications.append(notification("019b76da-a800-7e02-9462-49c009be0002"));

      const summary = await inbox.summaryForClubs(WORLD_ID as never, [CLUB_ID]);
      expect(summary.openNotificationCount).toBe(2);
      expect(summary.timelineCount).toBe(2);
      expect(summary.reportCount).toBe(0);
    });

    it("é idempotente por id — o mesmo fato não duplica a pendência", async () => {
      const id = "019b76da-a800-7e03-9462-49c009be0003";
      await notifications.append(notification(id));
      await notifications.append(notification(id));

      const summary = await inbox.summaryForClubs(WORLD_ID as never, [CLUB_ID]);
      expect(summary.timelineCount).toBe(1);
    });

    it("um clube sem inbox, ou lista vazia, soma zero", async () => {
      await notifications.append(notification("019b76da-a800-7e04-9462-49c009be0004"));

      const outro = await inbox.summaryForClubs(WORLD_ID as never, [
        "019b76da-a800-7fff-9462-49c009be9999",
      ]);
      expect(outro.timelineCount).toBe(0);

      const nenhum = await inbox.summaryForClubs(WORLD_ID as never, []);
      expect(nenhum.openNotificationCount).toBe(0);
    });
  },
);
