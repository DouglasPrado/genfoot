# Provedor de identidade — R-171

> **Status:** CANÔNICO / RATIFICADO · **Data:** 2026-07-16 · **Autoridade:** decisão do dono do produto · **Escopo:** autenticação dos clientes (mobile e admin)

## Por que existe

[R-85](registro-de-decisoes.md) ratificou **identidade externa OIDC (Google/Apple; conta é fonte de verdade)**, e [R-95](registro-de-decisoes.md)/[R-131](registro-de-decisoes.md) fixaram o fluxo de credencial (access JWT ~15 min, refresh rotativo ~30 dias com detecção de reúso, credencial de WS ~60 s, rotação de chave a cada 90 dias, MFA obrigatório para admin). Nenhuma delas **nomeia o provedor**. Esta decisão nomeia.

O que existia no código contradizia as três: `POST /auth/session` emitia Bearer para qualquer `subject`, sem prova; nenhum command verificava credencial; e a palavra `email` não aparecia em `packages/core/src` nem em `apps/api/src`. Login, cadastro e recuperação estavam travados no domínio, não na UI.

## Decisão ratificada

### R-171 — Clerk como provedor de identidade

O **Clerk** é o provedor de identidade dos clientes, materializando R-85. Passam a ser responsabilidade dele:

- **Credencial:** hash de senha, unicidade de e-mail (`1 conta por e-mail`), verificação de e-mail.
- **Recuperação de acesso:** envio do e-mail de redefinição. O produto não opera infraestrutura de e-mail para isto.
- **Provedores sociais:** Google e Apple, conforme R-85.
- **Ciclo de token:** access token curto + refresh rotativo com detecção de reúso, satisfazendo a intenção de R-95/R-131 sem reimplementação própria.
- **MFA:** o fator exigido para admin por R-131.

**A conta do jogo continua sendo a fonte de verdade** (R-85). O Clerk autentica; o `UserAccount` do produto permanece dono de perfil, papel, participações e vínculo de controle de clube. A ligação é o `sub` do token verificado.

**A API nunca confia no cliente.** Ela verifica o token do Clerk pela **chave pública** (`CLERK_JWT_KEY`, verificação networkless) e deriva o `subject` do `sub` verificado — em vez de aceitar um `subject` arbitrário do corpo da requisição, como fazia antes.

### Consequências aceitas

- **`M-RECOVER` deixa de ser tela nossa** com envio próprio: a redefinição é fluxo do provedor.
- **`UserCredential.passwordHash`** do [`prisma/schema.prisma`](../../prisma/schema.prisma) fica **sem uso** enquanto o Clerk detiver a credencial. Não removido aqui; marcado como pendência de reconciliação do modelo físico.
- **Apple exige development build.** O Apple nativo depende de `expo-apple-authentication`, que não roda no Expo Go. Google via `useSSO` (navegador) roda no Expo Go. Ordem: Google agora, Apple no dev build.
- **Dependência externa** passa a existir no caminho crítico de entrada do jogador. Indisponibilidade do provedor impede login novo; sessão já ativa segue pelo token em cache.

### Pendências abertas (não bloqueiam a decisão)

- **`CLERK_SECRET_KEY` vive hoje em `apps/mobile/.env.local`**, escrita pelo `clerk init`. Não vai ao bundle (o Expo só embute `EXPO_PUBLIC_*`) e o arquivo é gitignored, mas o lugar correto é o ambiente da API. **Decisão do dono: manter por ora**; migrar antes de produção. A verificação de token não precisa dela — só da chave pública.
- **Conta por mundo vs. conta global:** `AccountSnapshot` em `packages/core` tem `gameWorldId`, enquanto [`02-modelo-de-dados.md §6.3.1`](../02-tecnico/02-modelo-de-dados.md) e o `prisma/schema.prisma` definem `UserAccount` como **global** (plataforma, sem `gameWorldId`), com `WorldParticipant` fazendo o vínculo por mundo. Contradição **anterior** a esta decisão e não resolvida por ela. Com o Clerk, a unicidade de e-mail passa a ser garantida fora do domínio, o que reduz o dano — mas a reconciliação continua devida.

## Efeito

Destrava `M-LOGIN`, `M-SIGNUP` e `M-RECOVER`, que estavam bloqueadas por ausência de autenticação, e fecha o buraco de `/auth/session` aceitar qualquer `subject`. Não altera R-85, R-95 nem R-131: as materializa.
