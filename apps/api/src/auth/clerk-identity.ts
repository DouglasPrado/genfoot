import { verifyToken } from "@clerk/backend";

/**
 * Verificação da identidade externa (R-85/R-171: o Clerk autentica; a conta do
 * jogo segue sendo a fonte de verdade). A API deriva o `subject` do `sub` do
 * token verificado, em vez de aceitar o `subject` que o cliente mandar.
 *
 * Duas formas de verificar, nesta ordem:
 *  - `CLERK_JWT_KEY` (PEM da chave PÚBLICA): verificação networkless e de menor
 *    privilégio — é o modo preferido, porque verificar token não precisa de
 *    poder para criar ou apagar usuário.
 *  - `CLERK_SECRET_KEY`: o SDK busca o JWKS na API do Clerk. Funciona, mas dá à
 *    API uma credencial mais poderosa do que a tarefa exige.
 */
export interface ClerkVerifier {
  readonly configured: boolean;
  verify(token: string): Promise<string>;
}

export class ClerkTokenInvalid extends Error {
  constructor(cause: string) {
    super(`Token do provedor inválido: ${cause}`);
  }
}

export class ClerkNotConfigured extends Error {
  constructor() {
    super(
      "Verificação de identidade não configurada: defina CLERK_JWT_KEY (chave pública) ou CLERK_SECRET_KEY.",
    );
  }
}

export function createClerkVerifier(
  env: NodeJS.ProcessEnv = process.env,
): ClerkVerifier {
  const jwtKey = env.CLERK_JWT_KEY?.trim();
  const secretKey = env.CLERK_SECRET_KEY?.trim();
  const configured =
    (jwtKey !== undefined && jwtKey !== "") ||
    (secretKey !== undefined && secretKey !== "");

  return {
    configured,
    async verify(token: string): Promise<string> {
      if (!configured) throw new ClerkNotConfigured();

      let payload;
      try {
        payload = await verifyToken(token, {
          ...(jwtKey !== undefined && jwtKey !== "" ? { jwtKey } : {}),
          ...(secretKey !== undefined && secretKey !== ""
            ? { secretKey }
            : {}),
        });
      } catch (error) {
        // Falha fechado: qualquer problema de verificação recusa o token. Nunca
        // caímos para "confia no subject do corpo".
        throw new ClerkTokenInvalid(
          error instanceof Error ? error.message : "verificação falhou",
        );
      }

      const subject = payload.sub;
      if (typeof subject !== "string" || subject.trim() === "") {
        throw new ClerkTokenInvalid("token sem `sub`");
      }
      return subject;
    },
  };
}
