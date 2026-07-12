# Mobile — Onboarding e Conta

> **Status:** Rascunho consolidado · **Fontes:** docs/01-game-design/09-anti-abuso-e-onboarding.md, docs/01-game-design/01-mundo-persistente-e-clubes.md, docs/01-game-design/08-estadio-regiao-e-clima.md, docs/01-game-design/15-fluxos-completos.md · **Revisão:** 2026-07-11

Telas de autenticação, entrada no mundo, escolha/criação de clube, revisão inicial, retorno após ausência e troca de clube. Fluxos: [MF-00](02-mobile-fluxos.md#mf-00--bootstrap-autenticação-e-sessão), [MF-01](02-mobile-fluxos.md#mf-01--criação-e-entrada-em-clube), [MF-02](02-mobile-fluxos.md#mf-02--retorno-após-ausência-longa), [MF-03](02-mobile-fluxos.md#mf-03--abandono-ou-troca-de-clube). Template em [00 §Template](00-visao-geral-e-design-system.md#template-de-especificação-de-tela).

> **Nota transversal:** o onboarding está consolidado em nível de princípio no GDD (Decisão 1961). Onde a fonte é omissa (valores de caixa inicial, duração de pré-temporada, critérios de "clube disponível", parâmetros do Programa de Clube Novo), a tela **prevê o campo** e marca `> **Pendência:**`, sem inventar número.

---

## `M-SPLASH` — Splash / carregamento

- **Objetivo:** iniciar sessão, checar versão/contratos e rotear.
- **Como se chega:** abertura do app.
- **Layout:** logo centralizado + barra de progresso discreta.
- **Componentes e dados:** logo Grinta; versão do cliente; indicador de conexão.
- **Ações:** nenhuma direta — roteia para `M-LOGIN`, `M-RETURN`, `M-HOME` ou onboarding.
- **Estados:** *loading* padrão; **erro** de rede → botão "tentar de novo"; **contrato BREAKING** → tela "atualize o app" com link à store, bloqueando o uso.
- **Tempo real/notificações:** abre WebSocket; processa *deep link* pendente após rotear.
- **Referências:** [doc 08 — versionamento/sessão](../02-tecnico/08-frontend-cliente-e-tempo-real.md); [MF-00](02-mobile-fluxos.md#mf-00--bootstrap-autenticação-e-sessão).

## `M-LOGIN` — Login

- **Objetivo:** autenticar o usuário.
- **Como se chega:** `M-SPLASH` sem sessão; logout; sessão expirada.
- **Layout:** logo, campos, botão primário, links secundários.
- **Componentes e dados:** e-mail/senha; entrar com provedor (Apple/Google — recomendado no iOS); links "criar conta" e "esqueci a senha".
- **Ações:** **Entrar** → autentica e roteia (MF-00); **Criar conta** → `M-SIGNUP`; **Recuperar** → `M-RECOVER`.
- **Estados:** validação por campo (`fieldErrors`); erro de credencial com `errorCode`; *loading* no botão; offline → desabilita com aviso.
- **Referências:** [MF-00](02-mobile-fluxos.md#mf-00--bootstrap-autenticação-e-sessão).

## `M-SIGNUP` — Cadastro

- **Objetivo:** criar conta.
- **Como se chega:** `M-LOGIN`.
- **Componentes e dados:** nome, e-mail, senha, aceite de termos/privacidade; opção provedor.
- **Ações:** **Cadastrar** → cria conta e segue a `M-WORLD-PICK`.
- **Estados:** validação por campo; e-mail já usado (`errorCode`); *loading*.
- **Referências:** [`09-anti-abuso`](../01-game-design/09-anti-abuso-e-onboarding.md) (integridade de conta).

## `M-RECOVER` — Recuperação de senha

- **Objetivo:** redefinir acesso.
- **Componentes e dados:** e-mail; confirmação de envio.
- **Ações:** **Enviar link** → confirma envio (mensagem neutra, sem revelar se o e-mail existe).
- **Estados:** *loading*; erro genérico.

## `M-WORLD-PICK` — Seleção de mundo / tipo de liga

- **Objetivo:** escolher em qual mundo jogar.
- **Como se chega:** pós-cadastro; usuário sem clube; "entrar em outro mundo".
- **Layout:** lista de mundos + filtro por **tipo de liga**.
- **Componentes e dados:** por mundo: nome, temporada atual, tipo (**Liga nova** / **Em andamento** / **Temática/especial**), nº de clubes, vagas, elegibilidade do usuário. `Chip` de tipo; `Badge` de vagas.
- **Ações:** **Selecionar mundo** → verifica elegibilidade/vagas → `M-CLUB-PICK` ou `M-CLUB-CREATE`.
- **Estados:** vazio ("nenhum mundo disponível"); **bloqueado** por cooldown/conta relacionada com motivo geral; *loading* da lista (cursor).
- **Referências:** [`09-anti-abuso §2.9`](../01-game-design/09-anti-abuso-e-onboarding.md); [`03-multiplayer-e-mundos`](../02-tecnico/03-multiplayer-e-mundos.md). > **Pendência:** regras de cada liga temática (Decisão 3, em aberto).

## `M-CLUB-PICK` — Assumir clube existente

- **Objetivo:** escolher um clube disponível para assumir.
- **Como se chega:** `M-WORLD-PICK` (ramo assumir).
- **Layout:** lista filtrável de clubes disponíveis.
- **Componentes e dados:** por clube: nome, escudo, divisão, reputação/tamanho (pequeno→gigante), torcida, caixa, sinal de dívida, motivo de disponibilidade. Filtros por divisão/região.
- **Ações:** **Ver clube** → `M-CLUB-PREVIEW`.
- **Estados:** vazio; **bloqueio** ao assumir clube recém-abandonado por conta relacionada; auditoria de contexto ao assumir clube forte (aviso).
- **Referências:** [`09-anti-abuso §1.8, §2.1`](../01-game-design/09-anti-abuso-e-onboarding.md); [`01-mundo §4`](../01-game-design/01-mundo-persistente-e-clubes.md).

## `M-CLUB-CREATE` — Criar clube de expansão

- **Objetivo:** fundar um clube novo.
- **Como se chega:** `M-WORLD-PICK` (ramo criar).
- **Layout:** formulário de identidade + próximo (região).
- **Componentes e dados:** nome, escudo (seletor de identidade visual), cores, **perfil de identidade** balanceado (Formador, Operário, Organizado, Popular, Técnico, Defensivo — diferença de identidade, não de poder). Aviso de que entra na **Liga Inicial**.
- **Ações:** **Continuar** → `M-REGION-PICK`.
- **Estados:** validação de nome único; *preview* do escudo.
- **Referências:** [`01-mundo §3, §3.2`](../01-game-design/01-mundo-persistente-e-clubes.md).

## `M-REGION-PICK` — Escolha de região/cidade

- **Objetivo:** escolher onde o clube nasce.
- **Como se chega:** `M-CLUB-CREATE`.
- **Componentes e dados:** mapa/lista de regiões; por região: torcida inicial potencial, rivais, **perfil climático** (quente/chuvosa/fria/seca/equilibrada), custo de vida/logística, patrocinadores regionais, base. Explica que região influencia contexto, não destino.
- **Ações:** **Escolher região** → `M-CLUB-PREVIEW`.
- **Estados:** trava anti-exploit (não permite combinação quebrada); *preview* de impacto.
- **Referências:** [`08-estadio §10`](../01-game-design/08-estadio-regiao-e-clima.md) (Dec. 1830–1834, 1867–1871).

## `M-CLUB-PREVIEW` — Estado inicial do clube

- **Objetivo:** entender o que está assumindo/criando antes de confirmar.
- **Como se chega:** `M-CLUB-PICK` ou `M-REGION-PICK`.
- **Layout:** cabeçalho do clube + blocos (elenco, estrutura, finanças, torcida, riscos).
- **Componentes e dados:** divisão; elenco resumido (~23 jogadores, idade média); estrutura por área (níveis); **dívidas e políticas herdadas**; torcida (perfil/paciência); reputação; **riscos** destacados. Ao criar: caixa inicial fixo idêntico.
- **Ações:** **Reservar vaga** → `M-SLOT-RESERVE`; **Voltar** para reconsiderar.
- **Estados:** ao assumir, exibe estado herdado real; *loading* dos agregados.
- **Referências:** [`15-fluxos §1 passo 4`](../01-game-design/15-fluxos-completos.md); [`01-mundo §2, §3`](../01-game-design/01-mundo-persistente-e-clubes.md).

## `M-SLOT-RESERVE` — Reserva de vaga e aporte inicial

- **Objetivo:** garantir a escolha e confirmar o aporte fixo.
- **Como se chega:** `M-CLUB-PREVIEW`.
- **Componentes e dados:** **aporte inicial fixo** (igualdade competitiva, sem vantagem por dinheiro real); prazo de **reserva de vaga** (`Countdown`); banner do **Programa de Clube Novo** (upgrades 1→3 mais baratos, obras mais rápidas, contratos protegidos, premiações proporcionais) quando aplicável.
- **Ações:** **Confirmar reserva** → command `ReserveClubSlot` → `M-CONTROL-ACTIVATE`.
- **Estados:** vaga expirando (`Countdown`); vaga tomada → volta a `M-CLUB-PICK`.
- **Referências:** [`09-anti-abuso §2.2, §2.8`](../01-game-design/09-anti-abuso-e-onboarding.md); [`15-fluxos §1 passos 5–6`](../01-game-design/15-fluxos-completos.md). > **Pendência:** valor do aporte e parâmetros do Programa.

## `M-CONTROL-ACTIVATE` — Ativação de controle / pré-temporada

- **Objetivo:** assumir o comando na data válida.
- **Componentes e dados:** data de ativação; para clube novo: entrada na Liga Inicial + **pré-temporada**; para assumido: mantém estado integral.
- **Ações:** **Ativar controle** → command `ActivateClubControl` → `M-ONBOARD-REVIEW`.
- **Estados:** contagem até a data válida; *loading*.
- **Referências:** [`15-fluxos §1 passo 7`](../01-game-design/15-fluxos-completos.md); [`09-anti-abuso §2.5`](../01-game-design/09-anti-abuso-e-onboarding.md).

## `M-ONBOARD-REVIEW` — Revisão inicial

- **Objetivo:** apresentar autoridade, objetivos e pendências imediatas.
- **Layout:** cartões sequenciais (pode ser *wizard* curto).
- **Componentes e dados:** **autoridade/autonomia** concedida; **objetivos** da diretoria (proporcionais ao clube e ao momento); orçamento, elenco e **plano automático** (política offline padrão); **pendências e políticas herdadas** que exigem ação; checklist de "primeiros passos".
- **Ações:** **Concluir** → `M-HOME` (pendências viram itens na `M-DECISIONS`); **Configurar automação** → `M-AUTOMATIONS`.
- **Estados:** cada pendência com prazo; *skeleton* enquanto carrega objetivos.
- **Referências:** [`15-fluxos §1 passos 8–10`](../01-game-design/15-fluxos-completos.md); [`10-experiencia`](../01-game-design/10-experiencia-e-telas.md).

## `M-RETURN` — Retorno após ausência longa

- **Objetivo:** reintegrar o usuário mostrando o que mudou.
- **Como se chega:** bootstrap detecta ausência longa.
- **Layout:** resumo em blocos + ações urgentes + ordem de recuperação.
- **Componentes e dados:** **mudanças do mundo** (competições, mercado, economia); **mudanças do clube** (resultados, elenco, finanças, estrutura); **decisões automáticas** tomadas pela IA; **prazos perdidos** (com a ação padrão aplicada); lista de **ações urgentes** com prazo; **ordem de recuperação sugerida** (checklist).
- **Ações:** **Abrir na Central** → `M-DECISIONS`; item → tela específica; **Assumir controle** → `M-HOME`.
- **Estados:** *loading* da consolidação; vazio ("nada urgente, tudo em dia").
- **Referências:** [`15-fluxos §2`](../01-game-design/15-fluxos-completos.md); [`13-relatorios`](../01-game-design/13-relatorios-notificacoes-e-memoria.md).

## `M-CLUB-LEAVE` — Abandono / troca de clube

- **Objetivo:** encerrar o vínculo preservando o clube.
- **Como se chega:** `M-SETTINGS`/`M-CLUB-PROFILE`.
- **Componentes e dados:** explicação de que o clube **mantém tudo** e a **IA assume**; **cooldown/restrições** de negociação; auditoria de ações recentes; preferência por trocar **entre temporadas**.
- **Ações:** **Confirmar saída** → `HighRiskConfirm` → command `LeaveClub`; depois pode iniciar [MF-01](02-mobile-fluxos.md#mf-01--criação-e-entrada-em-clube).
- **Estados:** **bloqueio** se detectar destruição proposital (venda de ativos barato, dívidas artificiais); aviso de cooldown ativo.
- **Referências:** [`15-fluxos §3`](../01-game-design/15-fluxos-completos.md); [`09-anti-abuso §1.7–1.8`](../01-game-design/09-anti-abuso-e-onboarding.md).

## `M-ACCOUNT` — Conta e sessão

- **Objetivo:** gerenciar dados de conta e sessões.
- **Como se chega:** `M-SETTINGS`.
- **Componentes e dados:** e-mail, provedor vinculado, dispositivos/sessões ativas, dados pessoais, exclusão de conta.
- **Ações:** trocar senha; encerrar sessões; sair; **excluir conta** (`HighRiskConfirm`).
- **Estados:** reautenticação para ações sensíveis; erro por `errorCode`.
- **Referências:** [`04-plataforma-seguranca-operacoes`](../02-tecnico/04-plataforma-seguranca-operacoes.md).
