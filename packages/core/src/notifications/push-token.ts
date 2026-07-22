import { DomainError, fail, succeed, type Result } from "@grinta/shared";

/**
 * Registro do token de push (Expo) de um dispositivo, por conta. Alimenta o
 * envio de push remoto do servidor (ex.: treino completo → banner no device).
 *
 * O token é a chave natural (o mesmo device dá o mesmo token): registrar de novo
 * é upsert, não duplica. Determinístico: nada de `Date.now`/`Math.random` aqui —
 * o id da linha é gerado pelo adapter (default do schema).
 */
export interface PushTokenRecord {
  readonly accountId: string;
  readonly expoPushToken: string;
  readonly platform: string;
}

export interface PushTokenRepository {
  /** Upsert pelo token (único). Atualiza a conta/plataforma se o token voltar. */
  upsertByToken(record: PushTokenRecord): Promise<void>;
  /** Tokens de uma conta — para o envio (um usuário pode ter vários devices). */
  findByAccount(accountId: string): Promise<readonly PushTokenRecord[]>;
  /**
   * Tokens do DONO de um clube (o controlador ativo) — para avisar o técnico
   * humano. Clube de IA (sem controle) devolve vazio. Junta
   * ClubControl(ativo) → WorldParticipant → PushDeviceToken.
   */
  findTokensForClub(
    gameWorldId: string,
    clubId: string,
  ): Promise<readonly string[]>;
}

/** Formato do token do Expo: `ExponentPushToken[...]` ou `ExpoPushToken[...]`. */
const EXPO_TOKEN_RE = /^Expo(nent)?PushToken\[[^\]]+\]$/;

export interface RegisterPushTokenInput {
  readonly accountId: string;
  readonly expoPushToken: string;
  readonly platform?: string;
}

export class RegisterPushToken {
  public constructor(private readonly repo: PushTokenRepository) {}

  public async execute(
    input: RegisterPushTokenInput,
  ): Promise<Result<{ readonly registered: true }, DomainError>> {
    if (!EXPO_TOKEN_RE.test(input.expoPushToken)) {
      return fail(
        new DomainError(
          "INVALID_PUSH_TOKEN",
          "O token de push não está no formato do Expo.",
          { expoPushToken: input.expoPushToken },
        ),
      );
    }
    await this.repo.upsertByToken({
      accountId: input.accountId,
      expoPushToken: input.expoPushToken,
      platform: input.platform ?? "ios",
    });
    return succeed({ registered: true });
  }
}
