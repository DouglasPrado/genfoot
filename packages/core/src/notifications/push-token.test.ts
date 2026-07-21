import { describe, expect, it } from "vitest";

import {
  RegisterPushToken,
  type PushTokenRecord,
  type PushTokenRepository,
} from "./push-token.js";

class MemPushTokens implements PushTokenRepository {
  public rows: PushTokenRecord[] = [];
  public upsertByToken(record: PushTokenRecord): Promise<void> {
    const i = this.rows.findIndex((r) => r.expoPushToken === record.expoPushToken);
    if (i >= 0) this.rows[i] = record;
    else this.rows.push(record);
    return Promise.resolve();
  }
  public findByAccount(accountId: string): Promise<readonly PushTokenRecord[]> {
    return Promise.resolve(this.rows.filter((r) => r.accountId === accountId));
  }
}

const ACC = "019b76da-a800-7451-8ea2-7b2378e42050";

describe("RegisterPushToken", () => {
  it("registra um token válido do Expo", async () => {
    const repo = new MemPushTokens();
    const r = await new RegisterPushToken(repo).execute({
      accountId: ACC,
      expoPushToken: "ExponentPushToken[abc123DEF]",
    });
    expect(r.ok).toBe(true);
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0]?.platform).toBe("ios"); // default
  });

  it("registrar o MESMO token de novo é upsert (não duplica)", async () => {
    const repo = new MemPushTokens();
    const uc = new RegisterPushToken(repo);
    await uc.execute({ accountId: ACC, expoPushToken: "ExpoPushToken[xyz]", platform: "android" });
    await uc.execute({ accountId: ACC, expoPushToken: "ExpoPushToken[xyz]", platform: "android" });
    expect(repo.rows).toHaveLength(1);
  });

  it("recusa token fora do formato do Expo", async () => {
    const repo = new MemPushTokens();
    const r = await new RegisterPushToken(repo).execute({
      accountId: ACC,
      expoPushToken: "not-a-token",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("INVALID_PUSH_TOKEN");
    expect(repo.rows).toHaveLength(0);
  });
});
