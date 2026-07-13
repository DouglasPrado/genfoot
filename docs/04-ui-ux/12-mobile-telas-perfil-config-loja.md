# Mobile — Perfil, Configurações e Loja

> **Status:** CANÔNICO · **Fontes:** docs/01-game-design/01-mundo-persistente-e-clubes.md, docs/01-game-design/14-monetizacao.md, docs/01-game-design/09-anti-abuso-e-onboarding.md, docs/01-game-design/11-torcida-imprensa-e-narrativa.md · **Revisão:** 2026-07-11

Perfil do clube, identidade/rebranding, configurações, loja/monetização, passe de temporada, regras de integridade, report de bug e suporte. Fluxos: [MF-24](02-mobile-fluxos.md#mf-24--ação-bloqueada-por-anti-abuso), [MF-25](02-mobile-fluxos.md#mf-25--personalização-e-loja). Encerra a aba **Clube**.

---

## `M-CLUB-PROFILE` — Perfil do clube

- **Objetivo:** a "capa" institucional do clube.
- **Componentes e dados** (perfil do [doc 01, §2](../01-game-design/01-mundo-persistente-e-clubes.md)): nome, escudo, país/região, caixa, elenco (resumo), comissão, diretoria (nível), estrutura (resumo por área), torcida (perfil/pressão), **reputação** (faixa), histórico (atalho), divisão/campeonato atual, **estilo de jogo**, cultura interna, **nível institucional**, índice de **Tamanho Real do Clube** (0–100, pequeno→gigante) [`03 §14.3`].
- **Ações:** → `M-IDENTITY`, `M-HISTORY`, `M-REPUTATION`, `M-STRUCTURE`, `M-CLUB-LEAVE`.
- **Estados:** identidade versionada por época (histórico).
- **Referências:** [`01-mundo §2, §4`](../01-game-design/01-mundo-persistente-e-clubes.md); [`03-economia §14.3`](../01-game-design/03-economia.md).

## `M-IDENTITY` — Identidade / rebranding

- **Objetivo:** personalizar a identidade visual (com peso emocional).
- **Componentes e dados:** nome, escudo, cores, uniforme (variações), números emblemáticos (1/9/10), homenagens; itens cosméticos aplicáveis (da loja). Mudança brusca exige comunicação à torcida.
- **Ações:** aplicar identidade (command); abrir loja (`M-STORE`).
- **Estados:** reação da torcida a rebranding; itens pagos são **cosméticos** (sem efeito esportivo).
- **Referências:** [`11-torcida §21`](../01-game-design/11-torcida-imprensa-e-narrativa.md); [`14-monetizacao §4`](../01-game-design/14-monetizacao.md).

## `M-SETTINGS` — Configurações

- **Objetivo:** preferências do app e da conta.
- **Componentes e dados:** idioma (pt-BR padrão), **tema** (claro/escuro/sistema), **notificações push** por categoria, som/vibração, preferência de modo simples/detalhado, acessibilidade (tamanho de fonte, reduce motion), conta (`M-ACCOUNT`), integridade (`M-INTEGRITY`), suporte (`M-SUPPORT`), sair, trocar/abandonar clube (`M-CLUB-LEAVE`).
- **Ações:** alterar preferências (estado de UI local); gerenciar push.
- **Estados:** padrão salvo localmente; reautenticação para conta.
- **Referências:** [`00-visao-geral §7`](00-visao-geral-e-design-system.md#7-acessibilidade-i18n-e-tema). Campos canônicos derivados de plataforma e R-98/R-165.

## `M-STORE` — Loja / monetização

- **Objetivo:** vender **apenas cosmético/conveniência**, sem pay-to-win.
- **Componentes e dados:** catálogo — identidades visuais, uniformes, **temas de UI**, personalização de estádio **sem efeito esportivo**, narrações/apresentações, itens comemorativos, **slots** de organização, passe de temporada (`M-SEASON-PASS`). Regra visível: nada altera resultado/economia/mercado/potencial/recuperação; itens proibidos **não aparecem**.
- **Ações:** comprar item (fluxo de pagamento da store — IAP); aplicar (`M-IDENTITY`).
- **Estados:** confirmação de que a compra é cosmética; restauração de compras.
- **Referências:** [`14-monetizacao §1–4`](../01-game-design/14-monetizacao.md). **Fechado:** sem moeda premium, assinatura vantajosa ou relatório pago; R-75/R-167.

## `M-SEASON-PASS` — Passe de temporada

- **Objetivo:** trilha de recompensas **exclusivamente cosméticas**.
- **Componentes e dados:** trilha de recompensas cosméticas por progresso/temporada; sem qualquer vantagem competitiva.
- **Ações:** adquirir; resgatar recompensa.
- **Estados:** catálogo cosmético do passe definido em R-93/R-167; indisponível após a temporada, itens adquiridos permanecem conforme catálogo.
- **Referências:** [`14-monetizacao §2`](../01-game-design/14-monetizacao.md).

## `M-INTEGRITY` — Regras de integridade

- **Objetivo:** transparência das regras anti-abuso em linguagem simples ([MF-24](02-mobile-fluxos.md#mf-24--ação-bloqueada-por-anti-abuso)).
- **Componentes e dados:** regras públicas (multi-conta proibida, mercado suspeito bloqueável, W.O. recorrente pune, manipular resultado proibido, explorar bug grave, transferências entre relacionados auditadas) — **sem revelar fórmulas**; faixas de risco e como o app sinaliza bloqueios/quarentena.
- **Ações:** ler; ir a `M-BUG-REPORT`/`M-SUPPORT`.
- **Estados:** referência para as mensagens de bloqueio.
- **Referências:** [`09-anti-abuso §1.14 (Dec. 1956)`](../01-game-design/09-anti-abuso-e-onboarding.md).

## `M-BUG-REPORT` — Report de bug

- **Objetivo:** reportar problemas com recompensa **não competitiva**.
- **Componentes e dados:** formulário (descrição, passos, print/anexo, contexto automático); recompensa possível = badge cosmético/menção/agradecimento — **nunca** dinheiro/jogador/atributo/vantagem.
- **Ações:** enviar report (command).
- **Estados:** confirmação; acompanhamento do status.
- **Referências:** [`09-anti-abuso (Dec. 1932)`](../01-game-design/09-anti-abuso-e-onboarding.md).

## `M-SUPPORT` — Suporte e recursos

- **Objetivo:** atendimento e **contestação de sanções**.
- **Componentes e dados:** casos abertos; sanções aplicadas ao clube/usuário com **motivo geral**; abrir **recurso/contestação** para ações graves; status da revisão (SLA — pendência de plataforma); ações pendentes em **quarentena/delay** com prazo.
- **Ações:** abrir recurso; responder ao suporte.
- **Estados:** ação em quarentena mostra o prazo de revisão; recurso em análise.
- **Referências:** [`09-anti-abuso §1.13 (Dec. 1937–1939)`](../01-game-design/09-anti-abuso-e-onboarding.md); [`09-operacao-e-admin`](../02-tecnico/09-operacao-e-admin-do-mundo.md).
