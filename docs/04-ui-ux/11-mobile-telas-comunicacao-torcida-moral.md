# Mobile — Comunicação, Torcida e Moral

> **Status:** CANÔNICO · **Fontes:** docs/01-game-design/11-torcida-imprensa-e-narrativa.md, docs/01-game-design/07-inteligencia-artificial.md, docs/01-game-design/13-relatorios-notificacoes-e-memoria.md · **Revisão:** 2026-07-11

Telas de moral do elenco, torcida, rivalidades, imprensa/coletiva, conversas com atletas, feed narrativo, promessas públicas, reputação e imagem pública. Fluxos: [MF-15](02-mobile-fluxos.md#mf-15--crise-esportiva), [MF-18](02-mobile-fluxos.md#mf-18--conversa-com-atleta), [MF-19](02-mobile-fluxos.md#mf-19--imprensa-e-comunicação). Vive na aba **Clube** (parte 2) e é alimentada por eventos.

> **Nota:** efeitos numéricos usam as baselines R-68..R-76/R-96 e mudam apenas por ruleset versionado. A UI define o padrão de interação e nunca calcula esses efeitos localmente.

---

## `M-MORALE` — Moral do elenco

- **Objetivo:** ler e gerir o clima do vestiário.
- **Como se chega:** aba Clube; Home; pós-jogo; crise.
- **Componentes e dados:** moral coletiva e **por jogador**; fatores (resultados/sequências, minutos, promessas, salários, críticas públicas, relação com técnico, lesões); atributos mentais que mediam a reação; efeito da comissão (controle emocional). Modo simples: rótulo ("boa/instável") + cor.
- **Ações:** gerir via `M-CONVO`, `M-PRESS` (proteger/cobrar), minutos/`M-GAMEPLAN`, delegar à comissão.
- **Estados:** moral baixa em sequência ruim realçada; ligação a decisões da Central.
- **Referências:** [`07-ia §3.4, §3.9`](../01-game-design/07-inteligencia-artificial.md); [`11-torcida`](../01-game-design/11-torcida-imprensa-e-narrativa.md).

## `M-FANS` — Torcida

- **Objetivo:** entender a torcida e a pressão.
- **Componentes e dados:** **satisfação 0–100** em 6 faixas nomeadas (Revolta / Forte insatisfação / Instabilidade / Aceitação / Satisfação / Empolgação); **breakdown por segmento** (casual, fiel/local, intensa/organizada, sócios, jovem/digital, tradicionalista, pragmática, ligada à base); **paciência** e **expectativa** (formada por elenco/folha/estrutura/divisão/discurso); avaliação **em relação à expectativa**; protestos e apoio extraordinário; crescimento/esfriamento; estilo/identidade valorizada.
- **Ações:** influência **indireta** (decisões esportivas, discurso `M-PRESS`, uso de jovens/ídolos, condução de despedidas, rebranding `M-IDENTITY`).
- **Estados:** protesto (evento) / apoio extraordinário sinalizados; transição de faixa.
- **Referências:** [`11-torcida §1–9, §16, §20`](../01-game-design/11-torcida-imprensa-e-narrativa.md).

## `M-RIVALRIES` — Rivalidades e clássicos

- **Objetivo:** dar peso aos confrontos que importam.
- **Componentes e dados:** rivais com **intensidade** (esfria com o tempo); histórico de clássicos (sequências, goleadas, memória); impacto em pressão, bilheteria, risco disciplinar, emoção.
- **Ações:** abrir próximo clássico (`M-NEXTMATCH`); ver histórico (`M-HISTORY`).
- **Estados:** clássico próximo realçado.
- **Referências:** [`11-torcida §8, §9`](../01-game-design/11-torcida-imprensa-e-narrativa.md).

## `M-PRESS` — Imprensa / coletiva

- **Objetivo:** responder à imprensa e conduzir a narrativa ([MF-19](02-mobile-fluxos.md#mf-19--imprensa-e-comunicação)).
- **Layout:** pauta/pergunta em contexto + opções de postura + preview de impacto.
- **Componentes e dados:** pauta atual (crise, ascensão, jovem prodígio, contratação cara, jejum, mercado, clássico, técnico pressionado); **8 posturas de comunicação**: assumir responsabilidade, proteger o elenco, cobrar jogadores, explicar uma venda, pedir paciência, reforçar o projeto, criticar arbitragem, prometer reação; **preview de impacto** (torcida/imprensa/vestiário) modulado pelo **nível da comunicação**.
- **Ações:** escolher postura (command); registrar **promessa pública** (`M-PUBLIC-PROMISES`).
- **Estados:** repetição vira reputação; nível baixo deixa crise crescer.
- **Referências:** [`11-torcida §10–13`](../01-game-design/11-torcida-imprensa-e-narrativa.md); [`07-ia §3.5`](../01-game-design/07-inteligencia-artificial.md).

## `M-CONVO` — Conversa com atleta

- **Objetivo:** conversar/negociar 1:1 ([MF-18](02-mobile-fluxos.md#mf-18--conversa-com-atleta)).
- **Layout:** cabeçalho do jogador + motivo + opções de resposta + consequência.
- **Componentes e dados:** motivo (pedir aumento, reclamar de minutos, renovação, forçar saída, conflito, liderança, **despedida de ídolo**); **perfil mental** do jogador (ambição, lealdade, ego, temperamento, resiliência); opções de resposta; consequência (moral, promessa, relação).
- **Ações:** escolher resposta; abrir renovação (`M-CONTRACT`); registrar promessa (`M-PROMISES`); conduzir a **despedida de ídolo** como fluxo guiado (reduz o desgaste da torcida) — reflete em `M-FANS` [`11 §7`].
- **Estados:** árvore e modulação por perfil mental/`CoachTrust` definidas em R-96.
- **Referências:** [`07-ia §3.4, §6`](../01-game-design/07-inteligencia-artificial.md); [`11-torcida §7`](../01-game-design/11-torcida-imprensa-e-narrativa.md).

### Acréscimo R-221 — elogiar/criticar: a decisão que move a FORMA

> Alinhamento à decisão [R-221](../99-decisoes/desenvolvimento-dinamico-2026-07-19.md), ratificada em 2026-07-19. Descreve **o que a decisão ratifica e o que o código já implementa**.

A R-221 dá à conversa um efeito **mecânico** que ela não tinha: a conversa é uma das três coisas que movem o atributo vivo (treino, partida, **decisão**).

- **Duas posturas (`TalkStance`):** **elogiar** (`PRAISE`, embala) e **criticar** (`CRITICIZE`, cobra). São as únicas ratificadas.
- **Dois alvos, dois commands:**
  - `morale:talk-to-player` — payload `clubId`, `playerId`, `stance`. Move a forma **daquele jogador**; devolve a forma resultante.
  - `morale:talk-to-squad` — payload `clubId`, `stance`. Move a forma de **todo o elenco profissional** do clube de uma vez.
- **O efeito é sobre a FORMA, não sobre o núcleo.** Elogiar/criticar **não** altera o que o jogador conquistou treinando: soma um delta ± à camada **transiente**, tetada em ± um máximo, e essa camada **decai de volta ao neutro** com o tempo. Ou seja: a conversa dá um empurrão temporário, nunca um dano (nem um presente) permanente — é a garantia anti-espiral da R-221. A leitura do efeito aparece em `M-PLAYER-DEV` (`player-development`), onde núcleo, forma e efetiva são mostrados separados.
- **Erros:** jogador inexistente → `PLAYER_NOT_FOUND`; postura fora do enum é recusada na validação de payload (código comum `COMMAND_PAYLOAD_INVALID`, `apps/api/src/commands/command-registry.ts:198`).
- **Nenhum dos dois commands publica evento de domínio** — o stream recebe só `CommandAccepted`, e o efeito oficial se lê recarregando a query.
- **Idempotência:** a chave usada pelo cliente é estável por **(command, alvo, postura)** — repetir a mesma conversa não multiplica o efeito.

**A árvore de conversa da R-96 continua NÃO implementada — é escopo separado.** Nada do que esta seção descreve acima cobre: motivo da conversa (pedir aumento, minutos, renovação, forçar saída, conflito, liderança, despedida de ídolo), **perfil mental** do jogador, modulação por `CoachTrust`, opções de resposta em árvore, registro de **promessa** ou consequência sobre a relação. Elogiar/criticar é um passo único e plano, não a conversa da R-96.

**Não decidido (falta ratificar):**

- **Não decidido:** as **magnitudes** do delta de forma por postura — calibração VAL-001, declarada no código como não-constante-de-doc.
- **Não decidido:** o **risco** da conversa (a crítica que sai pela culatra por personalidade/temperamento). Hoje o efeito é determinístico e igual para todos; o refinamento por perfil mental não foi ratificado.
- **Não decidido:** como (e se) elogiar/criticar interage com a **moral** de `M-MORALE` e com a árvore da R-96 quando ela existir — são duas leituras do mesmo gesto sem contrato entre si.
- **Não decidido:** se `morale:talk-to-squad` deveria distinguir **titulares** de reservas — o efeito hoje alcança o elenco profissional inteiro.

## `M-FEED` — Feed de eventos / narrativa

- **Objetivo:** dar vida ao mundo com acontecimentos e histórias.
- **Componentes e dados:** cards narrativos (`tone`: neutral/press/fan/dramatic) de eventos — notícias, comentários de torcida, resumos, arcos de jogadores (promessa em ascensão, veterano em despedida, jejum, ídolo retornando), reações de patrocinadores, protestos/apoio, vazamentos, sanções que viram notícia; **explicabilidade** anexa ("por quê", sem revelar fórmulas). Filtro por relevância/importância (anti-inundação).
- **Ações:** abrir entidade referenciada; poucos eventos exigem decisão (levam à Central).
- **Estados:** narrativa deriva de fatos (não altera atributos); só o relevante interrompe.
- **Referências:** [`07-ia §3.8, §5, §8`](../01-game-design/07-inteligencia-artificial.md); [`11-torcida §11, §19`](../01-game-design/11-torcida-imprensa-e-narrativa.md).

## `M-PUBLIC-PROMISES` — Promessas públicas

- **Objetivo:** acompanhar promessas feitas à imprensa/torcida.
- **Componentes e dados:** promessas públicas (buscar acesso, manter jogador, usar base, reforçar elenco) com status **promessa × entrega**; pesam mais que declarações internas; contradizer reduz confiança/reputação.
- **Ações:** cumprir; ver impacto na torcida/reputação.
- **Estados:** promessa em risco/quebrada realçada.
- **Referências:** [`11-torcida §13`](../01-game-design/11-torcida-imprensa-e-narrativa.md).

## `M-REPUTATION` — Reputação (clube e gestor)

- **Objetivo:** mostrar como o mundo enxerga o clube e o gestor.
- **Componentes e dados:** **reputação do gestor** (10 dimensões: tática, financeira, formadora, negociadora, disciplinar, comunicativa, lealdade, ousadia, gestão de crise, confiabilidade); **rótulos do clube** (formador, comprador, vendedor, vitrine, pagador confiável, instável, tradicional, inovador, ofensivo, defensivo, físico, regional); reputação por faixa.
- **Ações:** ver histórico de reputação (`M-HISTORY`).
- **Estados:** rótulo atual exclusivo por eixo; badges históricos acumuláveis (R-166).
- **Referências:** [`11-torcida §14, §15`](../01-game-design/11-torcida-imprensa-e-narrativa.md).

## `M-SPONSORS-IMAGE` — Imagem pública / patrocinadores

- **Objetivo:** ver a imagem pública e a reação dos patrocinadores.
- **Componentes e dados:** imagem combinando torcida, imprensa, finanças, reputação, mercado, comunicação; patrocinadores reagem bem a estabilidade/imagem positiva/audiência/estrelas e mal a punições/W.O./crise/protestos/rebaixamento.
- **Ações:** ligar a `M-COMMERCIAL` (contratos) e `M-PRESS` (narrativa).
- **Estados:** alerta quando a imagem ameaça contratos comerciais.
- **Referências:** [`11-torcida §17`](../01-game-design/11-torcida-imprensa-e-narrativa.md).
