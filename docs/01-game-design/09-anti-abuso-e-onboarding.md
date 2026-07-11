# Anti-abuso e Onboarding

> **Status:** Rascunho consolidado · **Fontes:** chats/decisao-escopo-do-jogo.md · **Revisão:** 2026-07-10

Este documento consolida duas camadas de proteção do mundo persistente de **Grinta**: o sistema **anti-abuso global**, que mantém a integridade competitiva e econômica sem punir o jogador honesto, e o **onboarding**, que insere novos usuários no mundo sem quebrar o equilíbrio nem gerar frustração inicial.

A filosofia central: **proteger o mundo inteiro, não só o mercado, mantendo tudo auditável, com punições proporcionais, e sem travar negociações legítimas nem histórias orgânicas** (Decisão 1875).

Para a implementação técnica de auditoria, segurança e operações (server authoritative, idempotência, locks, snapshots, logs, painel admin), consulte [`../02-tecnico/04-plataforma-seguranca-operacoes.md`](../02-tecnico/04-plataforma-seguranca-operacoes.md). Para regras de economia e equilíbrio de mercado, consulte [`./03-economia.md`](./03-economia.md).

## Sumário

- [1. Anti-abuso global](#1-anti-abuso-global)
  - [1.1 Filosofia e escopo](#11-filosofia-e-escopo)
  - [1.2 Risk score global](#12-risk-score-global)
  - [1.3 Multi-conta e contas relacionadas](#13-multi-conta-e-contas-relacionadas)
  - [1.4 Clube satélite](#14-clube-satelite)
  - [1.5 Mercado suspeito](#15-mercado-suspeito)
  - [1.6 Manipulação esportiva](#16-manipulacao-esportiva)
  - [1.7 W.O. e abandono](#17-wo-e-abandono)
  - [1.8 Troca de clube](#18-troca-de-clube)
  - [1.9 Explorações de sistema](#19-exploracoes-de-sistema)
  - [1.10 Interações sociais futuras e parcerias oficiais](#110-interacoes-sociais-futuras-e-parcerias-oficiais)
  - [1.11 Garantias técnicas de integridade](#111-garantias-tecnicas-de-integridade)
  - [1.12 Punições e sanções](#112-punicoes-e-sancoes)
  - [1.13 Admin, revisão e recurso](#113-admin-revisao-e-recurso)
  - [1.14 Auditoria, transparência e privacidade](#114-auditoria-transparencia-e-privacidade)
  - [1.15 Escopo fechado](#115-escopo-fechado)
- [2. Onboarding e entrada tardia](#2-onboarding-e-entrada-tardia)

---

## 1. Anti-abuso global

### 1.1 Filosofia e escopo

**Anti-abuso deve proteger o mundo sem punir o jogador honesto** (Decisão 1875). É parte do **core** do jogo, não uma ferramenta adicionada depois (Decisão 1876). Sem essa camada, o mundo persistente quebra com o tempo.

O sistema precisa impedir (Decisão 1875):

- multi-conta;
- clube satélite;
- manipulação de mercado;
- manipulação esportiva;
- favorecimento entre clubes;
- abandono abusivo;
- W.O. intencional;
- exploração de calendário;
- farm de jovens;
- transferência suspeita;
- destruição proposital de clube.

Tudo isso **sem travar negociações legítimas e histórias orgânicas**.

O anti-abuso atua sobre (Decisão 1876): transferências, empréstimos, trocas, finanças, troca de clube, abandono, escalação, W.O., manipulação esportiva, multi-conta, mercado de jovens, calendário, ranking, recompensas, premiações e relatórios administrativos.

**Tudo importante gera rastro** (Decisão 1877). Decisões críticas produzem audit log com: quem fez, quando, clube envolvido, entidade afetada, valor anterior, valor novo, contexto, IP/dispositivo (se aplicável), risk score, justificativa automática e versão da regra. Vale para ações de usuário, IA, sistema e admin.

**O anti-abuso não substitui design** (Decisão 1954): primeiro se desenha a regra segura, depois se detecta a fraude. Snapshots impedem manipulação temporal, limites de amistoso impedem farm, a IA recusa proposta ruim, contratos computáveis evitam cláusula ambígua e locks impedem duplicidade. O detector é complemento.

**O jogador honesto não deve sentir burocracia excessiva** (Decisão 1955). Proposta plausível, escalação normal, compra lógica e venda bem-feita passam rápido, sem fricção, com logs invisíveis e bloqueios raros. O anti-abuso só aparece quando necessário.

### 1.2 Risk score global

Existe um **RiskAssessment global** — não apenas para transferências (Decisão 1878). O risk score avalia ações sensíveis como: transferência, empréstimo, troca, abandono de clube, troca de clube, contratação incomum, venda muito abaixo do valor, W.O., escalação suspeita, sequência de derrotas estranhas, movimentação financeira anormal, uso excessivo de jovens e conexão entre contas.

**Níveis de risco** (Decisão 1879):

| Faixa | Efeito |
| --- | --- |
| Baixo | Ação liberada |
| Moderado | Ação liberada com log reforçado |
| Alto | Ação com restrição, atraso ou revisão automática |
| Crítico | Ação bloqueada |
| Grave recorrente | Ação bloqueada + punição/admin |

As faixas existem justamente para **evitar bloqueio excessivo**.

**Explicação limitada ao usuário** (Decisão 1880): bloqueios devem explicar o motivo geral sem revelar a fórmula.

- Correto: "Essa negociação foi bloqueada porque está fora dos parâmetros seguros do mercado."
- Ruim: "Bloqueamos porque seu IP bateu com outra conta e o preço ficou 42% abaixo da faixa."

O usuário entende o motivo geral, mas não aprende a burlar.

### 1.3 Multi-conta e contas relacionadas

**Multi-conta é tratada como risco alto quando há benefício competitivo** (Decisão 1881). Sinais: mesmo dispositivo, mesmo IP recorrente, padrão de login, transferências entre contas relacionadas, empréstimos favoráveis, clubes se ajudando, login alternado, abandono e reassunção suspeita, comportamento sincronizado. **Nem todo mesmo IP é fraude, mas aumenta o risco.**

**Contas relacionadas** podem ser marcadas em quatro graus (Decisão 1882): fraca, moderada, forte, confirmada. A relação não bloqueia tudo sozinha, mas **endurece** transferências, empréstimos, trocas, venda de jovens, troca de clube e partidas decisivas entre os clubes envolvidos.

**Família / escritório / rede compartilhada** (Decisão 1883): mesmo IP não pune automaticamente. Pode haver irmãos, amigos, escritório, lan house, VPN ou rede móvel compartilhada. Por isso o sistema usa **um conjunto de sinais, não apenas o IP**.

### 1.4 Clube satélite

Detectar clube usado para alimentar outro (Decisão 1884). Sinais:

- vende barato para o mesmo clube;
- empresta jogadores bons sem retorno;
- compra jogadores ruins caro;
- assume salários sem lógica;
- cede jovens com opção baixa;
- perde partidas suspeitas contra o clube beneficiado;
- abandona após transferir ativos.

A ação deve ser **forte**, porque o clube satélite destrói a economia.

**Farm de jovens** é tratado como abuso forte (Decisão 1893): criar/assumir clube para captar jovens e transferir, múltiplas contas captando em regiões diferentes, jovens vendidos abaixo do valor, empréstimos com opção baixa, abandonar clube após extrair a base, excesso de testes/vínculos sem plano.

**Assédio abusivo a jovens** também tem limites (Decisão 1894): insistência repetida no mesmo jovem protegido, assédio por conta relacionada, proposta ofensiva em massa, tentativa de desestabilizar base alheia sem interesse real, vazamento manipulado.

### 1.5 Mercado suspeito

As transferências continuam sendo o **principal foco** anti-abuso (Decisão 1885). O sistema avalia o **valor total real**, não só o valor anunciado, considerando: valor fixo, parcelas, bônus prováveis, percentual futuro, salário subsidiado, troca de jogadores, relação entre clubes, urgência financeira, contrato, idade, potencial, lesão, reputação e histórico de negociações.

| Situação | Decisão | Justificativas válidas que reduzem o risco |
| --- | --- | --- |
| Venda abaixo do valor | 1886 | contrato acabando, salário alto, jogador insatisfeito, lesão recorrente, veterano, crise financeira, dívida urgente, baixa liquidez, cláusula contratual, relação ruim com elenco |
| Compra acima do valor | 1887 | leilão real, rivalidade, urgência, jogador decisivo, multa rescisória, promessa rara, falta de alternativas |
| Troca de jogadores | 1888 | avaliação de equivalência (valor, idade, potencial, salário, contrato, posição, liquidez, lesão, cláusulas, dinheiro incluído) |
| Empréstimo | 1889 | auditar estrela de graça, salário pago sem motivo, opção de compra baixa, empréstimo a relacionado, jogador decisivo liberado antes de confronto, jovem enviado a satélite, recall manipulado |

Sem justificativa, o risco sobe; pagar muito acima pode indicar transferência indireta de dinheiro, manipulação de preço, favorecimento, lavagem econômica interna, clube satélite ou inflação artificial (Decisão 1887).

**Cláusulas abusivas** não podem esconder favorecimento (Decisão 1890): opção de compra simbólica, obrigação de compra impossível de evitar, recompra irreal, percentual futuro para mascarar preço, bônus inalcançável para fingir valor, salário subsidiado sem lógica, multa artificialmente baixa.

**Parcelamento abusivo** respeita o risco financeiro (Decisão 1891): bloquear ou restringir parcelas longas demais, clube sem capacidade de pagar, compras em sequência sem caixa futuro, parcela para conta relacionada com valor manipulado, venda parcelada usada para esconder preço baixo.

**Manipulação de mercado** — inflação ou deflação artificial (Decisão 1892): transações circulares, compras caras entre relacionados, vendas baratas repetidas, troca de ativos sem lógica esportiva, jogador comprado/vendido várias vezes, clubes combinando preços. **Transações suspeitas não devem alimentar a referência de mercado.**

**Mercado usuário-usuário** é permitido, mas sempre auditado (Decisão 1940): aplica faixa plausível, relação entre contas, cooldown, logs, risk score e revisão se extremo — sem bloquear o social do jogo.

**Mercado IA-usuário** (Decisão 1941): a IA não aceita proposta absurda, parcelamento inseguro, troca ruim, empréstimo sem lógica ou venda que destrói o elenco sem motivo. Uma **boa IA é proteção natural** (Decisão 1942): ela recusa abuso, cobra valor justo, evita trocas ruins, percebe urgência e protege jovens — o anti-abuso entra como segunda camada.

### 1.6 Manipulação esportiva

Detectar derrota intencional ou escalação sabotada (Decisão 1895). Sinais: escalar reservas ruins em jogo decisivo sem motivo, usar jogador fora de posição em massa, não escalar goleiro disponível, substituir os melhores cedo sem justificativa, tática absurda contra clube relacionado, sequência de derrotas beneficiando terceiro, W.O. em partida específica, vender titulares antes de confronto-chave. **Nem toda rotação é abuso; o contexto decide.**

**Escalação suspeita** (Decisão 1896): escalação muito fora do padrão em jogo sensível gera risco. Avaliar importância da partida, adversário, relação entre clubes, fadiga real, lesões, suspensões, prioridade de competição, promessa de minutos, calendário próximo e jovens planejados. **Havendo justificativa esportiva, libera.**

**Entregar jogo para prejudicar terceiro** é abuso (Decisão 1897): perder de propósito para rebaixar rival, poupar de forma absurda para beneficiar aliado, escalar irregularmente para alterar a tabela. Difícil de provar, então usa-se risk score e padrões recorrentes.

**Escalação irregular** — prevenir antes de punir (Decisão 1900). O sistema bloqueia: suspenso, não inscrito, contrato inativo, lesionado inelegível, jogador transferido, estrangeiro acima do limite, categoria inválida. Se passar por bug, entra revisão administrativa.

**Integridade competitiva** (Decisão 1947): competições oficiais têm proteção maior que amistosos. Anti-abuso mais rígido em liga, copa, acesso/rebaixamento, final, clássico, decisão por prêmio e jogo que afeta terceiros. Amistoso tem menor impacto, mas ainda tem limites.

**Jogo decisivo com clubes relacionados** (Decisão 1948): não bloqueia automaticamente, mas recebe monitoramento especial de escalação, substituições, tática extrema, W.O., vendas recentes, comportamento de mercado e impacto na tabela.

### 1.7 W.O. e abandono

**W.O. intencional** recorrente ou conveniente deve ser punido (Decisão 1898). Sinais: ocorre contra clube relacionado; em jogo que não interessa ao usuário mas interessa a terceiro; após vender jogadores; repetidamente; para evitar lesões/suspensões; em calendário importante. Punições podem ser esportivas, financeiras e de reputação.

**Proteção contra W.O. acidental** (Decisão 1899): antes de decretar W.O., o sistema usa escalação automática, plano offline, completa o banco se possível, alerta o usuário, usa interino/IA e valida elenco mínimo. **O W.O. deve ser o último recurso.**

**Abandono de clube** não pode limpar consequência (Decisão 1901). Ao abandonar: o clube vai para a IA; dívidas, contratos, moral, histórico e promessas ficam; a auditoria registra; o usuário pode receber cooldown. **Não existe reset gratuito.**

**Abandono abusivo** — detectar destruição proposital antes de abandonar (Decisão 1902): vendeu ativos barato, comprou jogadores caros inúteis, assumiu dívidas, dispensou jovens, renovou contratos ruins, transferiu para clube relacionado, deixou salários estourarem. Pode gerar bloqueio de abandono, reversão ou punição.

**Destruição proposital de elenco** (Decisão 1906): bloquear ou revisar dispensar vários titulares sem motivo, vender o elenco inteiro abaixo do valor, renovar todos com salários absurdos, deixar o clube sem posição mínima, destruir a base sem justificativa. O usuário pode gerir mal, mas não destruir para abusar.

**Má gestão legítima vs abuso** (Decisão 1907) — diferenciar erro de fraude:

| Má gestão legítima | Abuso |
| --- | --- |
| Contratou caro achando que valia | Padrão de favorecimento |
| Vendeu mal por crise | Relação entre contas |
| Treinou errado | Ações sem lógica esportiva |
| Apostou em jovens e caiu | Benefício externo |
| Segurou veteranos demais | Repetição suspeita |

### 1.8 Troca de clube

**Troca de clube precisa de cooldown e auditoria** (Decisão 1903): preferencialmente no fim da temporada; cooldown para negociar com o clube antigo; auditoria das transferências recentes; impedir levar jogadores baratos; impedir vender barato antes de sair; bloquear troca em crise criada artificialmente.

**Assumir clube recém-abandonado** (Decisão 1904): usuário relacionado não pode assumir clube que ajudou a preparar indiretamente. Sinais: conta relacionada abandona, clube foi fortalecido antes, base preservada de forma incomum, dívidas descarregadas em outro, ativos transferidos entre relacionados.

**Clube forte disponível** (Decisão 1905): assumir clube forte **não é abuso** (já decidido), mas exige auditoria de contexto — verificar se ficou disponível legitimamente, se não houve preparação por conta relacionada, se não foi manipulado para ser assumido e se compensações/contexto estão preservados.

### 1.9 Explorações de sistema

**Exploração de calendário** (Decisão 1908): adiar jogo para recuperar atleta, forçar W.O. para descansar, manipular amistosos para farm, inscrever/desinscrever em brechas, transferir jogador em janela crítica de snapshot, usar bug de remarcação.

**Exploração de amistosos** (Decisão 1909): limites de quantidade por período, impacto reduzido na evolução, risco físico real, receita limitada, sem manipular a forma artificialmente, sem repetir o mesmo adversário para benefício.

**Exploração de treino** (Decisão 1910): bloquear treino intenso infinito, recuperação instantânea, evolução sem carga, alternância artificial para ganhar atributo, plano individual abusivo sem consequência.

**Exploração de lesões** (Decisão 1911): forçar lesionado sem risco calculado, burlar indisponibilidade, usar diagnóstico incerto para escalar ilegalmente, resetar lesão por troca/abandono, transferir lesionado escondendo informação fora da regra.

**Exploração financeira** (Decisão 1912): criar dívida sem finalidade, parcelamento circular, pagamentos duplicados, cancelar obrigação indevidamente, antecipação abusiva, venda entre relacionados para cobrir saldo, uso de bônus irreais.

**Pagamento e calote** (Decisão 1913): calote tem consequência, não é bug explorável. Se o clube não paga, a obrigação vira dívida, a reputação financeira cai, o mercado restringe, jogador/staff reagem e pode haver punição. **Inadimplência nunca pode virar vantagem.**

**Exploração de premiações** (Decisão 1914): premiações devem ser **idempotentes** e auditadas — evitar pagamento duplicado, premiação a clube errado, prêmio por competição não homologada, prêmio após reversão sem ajuste, manipulação de tabela para prêmio.

**Exploração de ranking** (Decisão 1915): ranking não pode ser manipulado por eventos artificiais (amistosos repetidos, transferências falsas, vitórias por W.O. arranjadas, satélites entregando jogos, farm de torcida com cosmético). **O ranking deve usar apenas eventos oficiais confiáveis.**

**Bot/script** (Decisão 1916): automação externa abusiva é limitada. Sinais: ações em frequência impossível, propostas em massa, login/ações repetitivas, scraping de mercado, comandos com padrão robótico, manipulação de timing. Ações: rate limit, cooldown, captcha/verificação futura, bloqueio temporário, punição.

**Spam de propostas** (Decisão 1917): proposta em massa tem custo/cooldown, para evitar incomodar todos os jogadores, testar limites da IA, descobrir a faixa oculta por tentativa, assediar jovens ou travar o mercado. Rejeições em excesso podem reduzir reputação.

**Descoberta de fórmula oculta** (Decisão 1918): limitar engenharia reversa — **não expor** potencial real, fórmula de valor, risk score exato, pesos do motor, chance exata de lesão, faixa exata anti-abuso. Mostrar apenas explicação qualitativa.

**Exploração de informação oculta** (Decisão 1919): impedir obtenção de dados ocultos por brecha (ver atributo oculto por API, inferir potencial por preço exato, relatório premium revelando demais, bug de scouting, admin/debug acessível). **Dados sensíveis nunca devem ir ao cliente se não forem exibíveis.**

**Abuso de notificações/decisões** (Decisão 1945): usuário não pode travar outro com spam de propostas, sondagens em massa, provocações, convites ou pedidos de amistoso em excesso — o sistema aplica cooldown.

**Abuso de comunicação pública** (Decisão 1946): se houver sistema de fala pública, limitar frequência, moderar conteúdo, impedir ataque pessoal, impedir spam contra jogador/clube e registrar histórico.

### 1.10 Interações sociais futuras e parcerias oficiais

Grinta poderá, no futuro, oferecer **interações sociais competitivas** entre clubes que hoje ainda não existem. A regra-mestra já está fixada: **qualquer interação social competitiva futura passa obrigatoriamente pelo anti-abuso** (Decisão 1943) — não é um espaço fora das regras de integridade.

**Interações sociais previstas** (Decisão 1943) — todas tratadas como mecânicas futuras:

- alianças entre clubes;
- empréstimos recorrentes;
- torneios privados;
- amistosos pagos;
- parcerias de base;
- clubes satélites oficiais.

**Parcerias oficiais entre clubes** (Decisão 1944): se existirem futuramente, precisam de **regras rígidas**. Uma parceria pode envolver empréstimos, cessão de jovens, prioridade de compra e amistosos — mas sempre dentro de limites de segurança:

- **valor justo** — nenhuma vantagem econômica embutida fora da faixa de mercado;
- **auditoria** — toda a movimentação da parceria é registrada e revisável;
- **duração** — a parceria tem prazo definido, não é vínculo perpétuo;
- **transparência** — as condições ficam visíveis e rastreáveis;
- **proibição entre contas relacionadas abusivas** — a parceria não pode virar disfarce de multi-conta ou de clube satélite.

A diferença entre uma parceria legítima e um clube satélite (ver [§1.4](#14-clube-satelite)) é justamente esse conjunto de limites: a parceria oficial existe à luz do anti-abuso, enquanto o satélite opera para burlá-lo. Enquanto essas mecânicas não forem implementadas, valem como **direção de design** — os detalhes operacionais (parâmetros, fluxos e telas) ainda serão fechados em revisão futura.

### 1.11 Garantias técnicas de integridade

Estas garantias sustentam todo o anti-abuso. A implementação está detalhada em [`../02-tecnico/04-plataforma-seguranca-operacoes.md`](../02-tecnico/04-plataforma-seguranca-operacoes.md).

- **Server authoritative** (Decisão 1920): o servidor é a autoridade de tudo que é competitivo. O cliente **nunca** decide resultado, evolução, dinheiro, contrato, status de jogador, lesão, mercado nem comando efetivo sem validação — o cliente só **solicita** a ação.
- **Idempotência** (Decisão 1921): toda ação crítica precisa de idempotency key, evitando comprar/pagar duas vezes, comando duplicado, proposta aceita em duplicidade, jogo processado duas vezes ou premiação duplicada.
- **Locks** (Decisão 1922): ações críticas usam locks por entidade — partida, clube, jogador, negociação, financeiro, temporada, competição, rollover — para evitar corrida e inconsistência.
- **Snapshots** (Decisão 1923): impedem manipulação de estado durante eventos (partida, inscrição, fechamento de temporada, negociação avançada, prêmio, tabela, contrato). Depois do snapshot, mudanças não afetam aquele evento sem regra explícita.
- **Reprocessamento seguro** (Decisão 1924): reprocessar só com versão, log e autorização (por bug, partida interrompida, job falho, revisão administrativa, erro de calendário), sempre preservando histórico, registrando o motivo, evitando duplicidade e notificando quando afetar o usuário.
- **Reversão administrativa** (Decisão 1925): existe, mas deve ser **rara** — usada em abuso confirmado, bug grave, transferência indevida, duplicidade, manipulação comprovada ou erro de admin, sempre com audit log.

### 1.12 Punições e sanções

**Punições progressivas** escalam por gravidade e reincidência (Decisão 1926):

1. aviso;
2. bloqueio da ação;
3. cooldown;
4. restrição de mercado;
5. multa no clube;
6. perda de pontos;
7. reversão;
8. suspensão temporária;
9. banimento do mundo/conta em caso extremo.

Tipos de punição:

| Tipo | Quando aplicar | Exemplos |
| --- | --- | --- |
| **Esportiva** (Decisão 1927) | Só em abuso que afeta a competição | Escalação irregular, W.O. intencional, manipulação de resultado, fraude de inscrição, multi-conta afetando a tabela. *Não* aplicar perda de pontos por erro menor de mercado. |
| **Financeira** (Decisão 1928) | Abuso econômico/administrativo | Multa por irregularidade, perda de renda, taxa extra, bloqueio de contratação, restrição de folha. |
| **Reputação** (Decisão 1929) | Violações que impactam a imagem do clube | Afeta torcida, patrocinador, jogadores, staff, mercado e diretoria. Ex.: manipulação financeira ou W.O. recorrente. |

**Suspensão de conta** (Decisão 1930) é para abuso grave ou reincidente: multi-conta confirmada, manipulação sistemática, exploração de bug, bot agressivo, fraude de mercado, sabotagem de mundo.

**Exploração de bug** (Decisão 1931): explorar bug conscientemente é abuso grave (reversão, punição, possível suspensão). Quem **reporta e não explora** pode receber reconhecimento não competitivo.

**Report de bug** (Decisão 1932): incentivar o report **sem recompensa competitiva**. Recompensas possíveis: badge cosmético, menção, item visual, agradecimento. **Nunca:** dinheiro, jogador, atributo, recuperação física ou vantagem esportiva.

**Sanções públicas** (Decisão 1959): punições esportivas podem virar notícia — perda de pontos, multa pública, W.O., punição de mando, eliminação administrativa. Isso **afeta reputação e torcida**.

### 1.13 Admin, revisão e recurso

- **Admin não altera sem rastro** (Decisão 1933): toda ação admin gera audit log **imutável** registrando admin, ação, motivo, entidade, antes/depois, timestamp, ticket/referência e impacto.
- **Admin tools com permissões** (Decisão 1934): o painel admin tem níveis de permissão (suporte visualiza, moderador revisa, operador corrige job, admin financeiro ajusta ledger, superadmin reverte), sempre com **menor privilégio possível**.
- **Detecção automática + revisão humana** (Decisão 1935): o sistema **bloqueia o óbvio** (duplicidade, valores extremos, escalação ilegal, contrato inválido, W.O. repetido, relação confirmada + transferência absurda) e **marca o duvidoso** para revisão (caso contextual, padrão suspeito, manipulação esportiva complexa).
- **Falso positivo** (Decisão 1936): minimizar com faixas de risco, justificativas contextuais, revisão em risco médio, logs claros, recurso futuro e **não punir automaticamente casos ambíguos**.
- **Recurso/contestação** (Decisão 1937): para ações graves, explicar o motivo geral, permitir recurso, revisão por admin e registro da decisão. Não é necessário para bloqueio simples de proposta inválida.
- **Quarentena de ação** (Decisão 1938): ações suspeitas (transferência alta, troca complexa, empréstimo de jovem valioso, venda de clube relacionado) podem ficar **pendentes** — jogador não muda, dinheiro não move, usuário é avisado e existe prazo de revisão.
- **Delay anti-fraude** (Decisão 1939): algumas ações de risco têm atraso de efetivação para reduzir abuso de último minuto (transferência usuário-usuário no fim da janela, troca com cláusula complexa, venda antes de clássico, troca de clube).

### 1.14 Auditoria, transparência e privacidade

- **Auditoria de temporada** (Decisão 1949): o fim de temporada roda uma auditoria global sobre transferências extremas, clubes satélite, W.O., manipulação de tabela, evolução econômica anormal, premiações, usuários trocando de clube, jovens transferidos e rankings.
- **Health check anti-abuso** (Decisão 1950): o mundo tem um painel de saúde com métricas — negociações bloqueadas, negociações em revisão, contas relacionadas, W.O. por clube, transferências fora da faixa, clubes em risco satélite, reversões, punições e recursos.
- **Anti-abuso e privacidade** (Decisão 1951): coletar só o necessário para segurança e usar sinais técnicos com cuidado. **Não expor** IP, dispositivo, relação entre contas, critérios internos nem logs sensíveis. Admin vê conforme a permissão.
- **Anti-abuso versionado** (Decisão 1952): as regras são versionadas registrando versão, pesos, data, mundo, temporada e motivo da mudança — o que ajuda a revisar decisões antigas.
- **Simulação de abuso** (Decisão 1953): o **SimulationLab** testa cenários de abuso — multi-conta transferindo jovens, clube satélite, W.O. estratégico, mercado inflado, troca de clube abusiva, compra parcelada impossível, abandono destrutivo, manipulação de acesso/rebaixamento.
- **Transparência geral** (Decisão 1956): as regras de integridade são públicas em linguagem simples. O usuário deve saber que multi-conta para benefício é proibida, mercado suspeito pode ser bloqueado, W.O. recorrente pune, manipular resultado é proibido, explorar bug é grave e transferências entre relacionados são auditadas — **sem revelar a fórmula**.
- **Logs imutáveis** (Decisão 1957): logs críticos são **append-only**. Não se edita log antigo; para corrigir, cria-se um novo log de correção que referencia o anterior e registra admin/sistema.
- **Separar auditoria de narrativa** (Decisão 1958): o audit log é técnico/administrativo e **não é notícia** do jogo. A narrativa pública só aparece se o evento for esportivo/financeiro conhecido. Exemplo: anti-abuso bloqueando uma transferência suspeita não vira notícia automaticamente; um clube punido publicamente vira narrativa.

### 1.15 Escopo fechado

**Anti-abuso global considerado fechado em nível de regra principal** (Decisão 1960). Cobertos: risk score global, multi-conta, contas relacionadas, clube satélite, mercado suspeito, empréstimos, jovens, manipulação esportiva, W.O., abandono, troca de clube, exploração de calendário, exploração financeira, bot/script, server authoritative, idempotência, locks, snapshots, reversão, punições, admin, revisão, SimulationLab, privacidade e logs imutáveis.

---

## 2. Onboarding e entrada tardia

**Filosofia do onboarding** (Decisão 1961): o onboarding deve **inserir o usuário no mundo sem quebrar o equilíbrio**. Ele precisa permitir:

- **criar clube novo** ou **assumir clube existente**;
- **entender os riscos** de cada escolha;
- **começar com caixa fixo**;
- **entrar em temporada avançada**;
- **receber objetivos justos**;
- **ter pré-temporada ativa**;
- **evitar a exploração de clubes fortes**;
- **preservar a história do mundo**.

Esse bloco fecha *como o usuário entra no jogo* e *como o sistema evita vantagem injusta ou frustração inicial*.

As diretrizes abaixo detalham cada item da filosofia. Como a fonte consolida o onboarding apenas em nível de princípio (a única decisão registrada é a 1961), os parâmetros numéricos e mecânicas específicas ficam como pendências a serem fechadas — conforme necessário, alinhadas às regras de [`./03-economia.md`](./03-economia.md).

### 2.1 Criar clube novo ou assumir existente

O usuário pode **criar um clube novo** ou **assumir um clube existente**, entendendo os riscos de cada caminho (Decisão 1961). Assumir clube forte não é abuso, mas passa por auditoria de contexto (Decisão 1905, ver seção 1.8), e assumir clube recém-abandonado por conta relacionada é bloqueado (Decisão 1904).

> **Pendência:** Os critérios que tornam um clube existente "disponível" para ser assumido e como a escolha entre criar e assumir é apresentada ao usuário ainda não foram detalhados na fonte. (Onde clubes novos são inseridos já está resolvido: entram na **Liga Inicial** das divisões por nível estrutural — ver [`../02-tecnico/03-multiplayer-e-mundos.md`](../02-tecnico/03-multiplayer-e-mundos.md) — com o apoio do **Programa de Clube Novo**, seção [2.8](#28-programa-de-clube-novo-catch-up-estrutural).)

### 2.2 Caixa inicial fixo

O usuário **começa com um caixa fixo** (Decisão 1961), o que padroniza o ponto de partida econômico e evita que a entrada gere vantagem ou distorção de mercado.

> **Pendência:** Definir o valor do caixa inicial fixo, se ele varia por divisão/porte do clube, e como se relaciona com dívidas/obrigações herdadas ao assumir um clube existente. Alinhar com [`./03-economia.md`](./03-economia.md).

### 2.3 Entrada em temporada avançada

O sistema deve permitir **entrar em temporada avançada** (Decisão 1961), sem exigir que o usuário aguarde o início de uma nova temporada e sem quebrar as competições em curso.

> **Pendência:** Definir como o clube ingressa numa temporada já em andamento (calendário restante, competições em curso, tabela), e como se evita impacto injusto sobre os adversários já estabelecidos.

### 2.4 Objetivos justos

O novo usuário **recebe objetivos justos** (Decisão 1961), proporcionais ao clube assumido/criado e ao momento da temporada, para não gerar frustração inicial.

> **Pendência:** Definir como os objetivos são calibrados conforme porte do clube, divisão e ponto da temporada em que o usuário entra.

### 2.5 Pré-temporada ativa

O usuário **tem pré-temporada ativa** (Decisão 1961), permitindo preparar o elenco antes de competir de forma plena.

> **Pendência:** Definir o funcionamento da pré-temporada no onboarding (duração, amistosos disponíveis, ajustes de elenco) e como ela interage com a entrada em temporada avançada.

### 2.6 Evitar exploração de clubes fortes

O onboarding deve **evitar a exploração de clubes fortes** (Decisão 1961) — impedir que a entrada seja usada para obter vantagem indevida assumindo os melhores clubes. Isso conversa diretamente com o anti-abuso: auditoria de contexto ao assumir clube forte (Decisão 1905) e bloqueio de assumir clube preparado por conta relacionada (Decisão 1904).

> **Pendência:** Definir as regras concretas (cooldowns, filas, auditoria de disponibilidade) que evitam a captura oportunista de clubes fortes no momento da entrada, e a **proteção contra escolhas quebradas** mencionada no escopo, ainda não detalhada na fonte. O mecanismo de **divisão de expansão** já está resolvido: o clube novo entra na **Liga Inicial** (divisões por nível estrutural, ver [`../02-tecnico/03-multiplayer-e-mundos.md`](../02-tecnico/03-multiplayer-e-mundos.md)), com o apoio do **Programa de Clube Novo** (seção [2.8](#28-programa-de-clube-novo-catch-up-estrutural)).

### 2.7 Preservar a história do mundo

A entrada de novos usuários deve **preservar a história do mundo** (Decisão 1961), mantendo o histórico, os vínculos e a continuidade das competições já disputadas — coerente com a natureza de mundo persistente de Grinta e com os princípios de auditoria e logs imutáveis (Decisões 1957 e 1958).

> **Pendência:** O bloco de Onboarding e entrada tardia foi consolidado na fonte (Decisão 1961) sobretudo em nível de filosofia. O item "proteção contra escolhas quebradas" citado no escopo ainda não tem decisão dedicada e deve ser fechado em revisão futura; o item "divisão de expansão" está materializado pela Liga Inicial (seção [2.8](#28-programa-de-clube-novo-catch-up-estrutural) e [`../02-tecnico/03-multiplayer-e-mundos.md`](../02-tecnico/03-multiplayer-e-mundos.md)).

### 2.8 Programa de Clube Novo (catch-up estrutural)

Para dar a um clube recém-criado a capacidade de recuperar o atraso frente a clubes de temporadas anteriores — sem conceder vantagem injusta nem "jogador apelão" — o Grinta aplica um **Programa de Clube Novo**: um plano de desenvolvimento inicial, limitado no tempo. Durante as **3 primeiras temporadas** do clube:

- **custo de upgrade estrutural reduzido**;
- **tempo de construção menor**;
- **bônus pequeno na base**;
- **contratos iniciais um pouco mais protegidos**;
- **premiações de liga inicial maiores proporcionalmente**.

Isso **não dá jogador apelão** nem quebra a justiça inicial (caixa fixo idêntico, elenco equilibrado): dá **capacidade de recuperar o atraso** — um "catch-up" estrutural. O programa opera junto com as divisões por nível estrutural (a Liga Inicial em [`../02-tecnico/03-multiplayer-e-mundos.md`](../02-tecnico/03-multiplayer-e-mundos.md)) e com o mercado segmentado e as receitas proporcionais ao estágio da liga (ver [`./03-economia.md`](./03-economia.md), seções 7.3 e 9.5), que protegem a entrada do clube novo.

> **Pendência:** os parâmetros do programa (percentual de redução do custo de upgrade, redução do tempo de construção, tamanho do bônus de base, grau de proteção dos contratos iniciais e multiplicador das premiações de liga inicial) não foram definidos na fonte — são citados como plano, não como números. Calibrar em [`../02-tecnico/05-catalogo-de-regras-e-formulas.md`](../02-tecnico/05-catalogo-de-regras-e-formulas.md).
