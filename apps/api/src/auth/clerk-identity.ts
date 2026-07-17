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
/**
 * A identidade externa verificada.
 *
 * **`email` sai do TOKEN, nunca do corpo da requisição** — e isso não é
 * simetria com o `sub`, é segurança. O `ResolveAccountForSubject` liga contas
 * POR E-MAIL ("e-mail já existe sem vínculo → liga"): se o cliente pudesse
 * mandá-lo, bastaria enviar o e-mail de outra pessoa com o próprio subject do
 * Clerk para tomar a conta dela. Aceitar e-mail do cliente aqui é entregar conta
 * alheia.
 */
export interface VerifiedIdentity {
  readonly subject: string;
  readonly email: string;
  readonly name: string;
}

export interface ClerkVerifier {
  readonly configured: boolean;
  verify(token: string): Promise<VerifiedIdentity>;
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
    async verify(token: string): Promise<VerifiedIdentity> {
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

      const email = claim(payload, "email");
      if (email === null) {
        // Falha fechado e com instrução. O `sub` vem em todo token de sessão; o
        // e-mail só vem se o JWT template o incluir. Sem ele não dá para criar a
        // conta — e buscar na API do Clerk exigiria a `CLERK_SECRET_KEY`, que é
        // credencial mais poderosa do que verificar token precisa ser
        // (o modo preferido aqui é networkless, por menor privilégio).
        throw new ClerkTokenInvalid(
          'token sem `email`: adicione a claim ao JWT template do Clerk ' +
            '(Dashboard → Sessions → Customize session token: {"email": "{{user.primary_email_address}}"})',
        );
      }

      return {
        subject,
        email,
        // Nome é cosmético e o Clerk pode não tê-lo (cadastro só por e-mail).
        // Cair para o e-mail é melhor que recusar o login por causa do rótulo.
        name: claim(payload, "name") ?? email,
      };
    },
  };
}

/** Uma claim de texto do token, ou `null` — string vazia conta como ausente. */
function claim(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}
