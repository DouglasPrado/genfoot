DOCUMENTO DEFINITIVO DE ESCOPO
Estrutura, operação, simulação e governança de dados do jogo
Consolidação integral das decisões aprovadas nesta conversa
Versão consolidada — 10 de julho de 2026

1. Finalidade e critérios de consolidação
Este documento reúne, em uma única especificação, todas as decisões efetivamente aprovadas nesta conversa sobre a estrutura do jogo, a organização dos seus sistemas, a execução da simulação, a autoridade dos dados, os fluxos operacionais e as regras de integridade. Ele substitui a necessidade de consultar as mensagens originais para compreender o escopo aqui tratado.
Foram removidos códigos, nomes de estruturas de implementação, formatos de banco, versões de ferramentas, trechos de configuração, alternativas rejeitadas e discussões intermediárias. As escolhas técnicas foram convertidas em consequências funcionais e operacionais, preservando o sentido das decisões aprovadas.
O escopo não representa uma versão reduzida, um protótipo ou um MVP. As regras descritas devem ser consideradas como o modelo completo pretendido para o produto, ainda que a implantação ocorra de forma progressiva.
Este documento cobre a arquitetura funcional, os limites dos módulos, o comportamento da plataforma, o motor de simulação, os mundos persistentes, os fluxos assíncronos, a segurança, os dados, a observabilidade, a resiliência, os testes e a publicação de versões. Regras de jogo não discutidas nesta conversa não foram inventadas nem adicionadas.
1.1 Princípios obrigatórios
O servidor é a autoridade final sobre o estado do jogo, os resultados, os recursos, as permissões e as transições de negócio.
A simulação competitiva deve ser determinística, reproduzível, auditável e independente da interface utilizada pelo jogador.
Cada informação oficial possui um único módulo proprietário, responsável pelo seu ciclo de vida e pelas suas invariantes.
O estado atual, o histórico imutável, as projeções de leitura e os artefatos de recuperação são conceitos separados.
Operações demoradas ou dependentes de serviços externos não podem manter o jogo preso em transações ou bloqueios prolongados.
A plataforma deve suportar múltiplos mundos persistentes, isolamento entre mundos e futura distribuição física sem alterar as identidades do jogo.
Falhas devem resultar em pausa segura, retomada, repetição idempotente, compensação ou reconciliação; nunca em perda silenciosa de estado.
Regras competitivas não podem mudar de forma oculta ou individualizada para determinados jogadores. Mudanças devem ser versionadas e atribuídas explicitamente ao mundo, temporada ou competição.
2. Visão estrutural do produto
O jogo será uma plataforma online persistente de gestão e simulação de futebol. Cada mundo possui sua própria evolução temporal, clubes, jogadores, funcionários, competições, partidas, economia, histórico e regras ativas. Jogadores e demais entidades esportivas são únicos dentro do universo persistente e mantêm identidade e trajetória ao longo do tempo.
A plataforma será organizada como um conjunto de módulos de domínio fortemente delimitados, executados inicialmente dentro de uma base única de produto, mas com processos independentes para atividades de naturezas diferentes. Essa organização permite consistência transacional onde ela é necessária sem transformar todo o sistema em um único processo operacional.
2.1 Processos operacionais independentes
A execução será separada por responsabilidade. A plataforma deverá possuir, de forma lógica, processos distintos para:
receber comandos e consultas dos clientes;
manter conexões em tempo real;
agendar e liberar acontecimentos dos mundos;
executar ciclos e tarefas dos mundos;
preparar e distribuir partidas;
executar partidas ao vivo;
processar decisões de inteligência artificial;
atualizar projeções de leitura e pesquisa;
orquestrar notificações;
executar administração e recuperação;
rodar simulações de teste, balanceamento e validação.
Esses processos podem começar na mesma infraestrutura física, mas devem permanecer separados em responsabilidade, configuração, escalabilidade, observabilidade e capacidade de interrupção. A evolução da infraestrutura não pode exigir reescrever as regras centrais do jogo.
2.2 Separação entre escrita, leitura e comunicação
Comandos representam intenções de mudança e devem ser validados pela autoridade do servidor.
Consultas retornam projeções e visões autorizadas, sem conceder poder de alteração.
Eventos representam fatos já ocorridos e podem desencadear atualizações assíncronas em outros módulos.
Tarefas representam trabalho executável, repetível e rastreável.
Mensagens efêmeras servem para atualização de interface e presença, mas não substituem registros oficiais duráveis.
3. Módulos de domínio e responsabilidades
A plataforma será dividida por domínio de negócio, e não por tela, aplicação ou processo técnico. Cada módulo controla as regras, os estados e as alterações sob sua responsabilidade. Outros módulos podem consultar informações públicas, consumir fatos publicados ou solicitar operações por contratos explícitos, mas não podem alterar diretamente dados que não possuem.
3.1 Identidade e acesso
Representa o usuário humano, suas identidades externas, sessões de jogo, dispositivos, participações em mundos, restrições e poderes administrativos.
Separa a identidade autenticável do perfil e da participação esportiva dentro de cada mundo.
Revoga sessões, controla dispositivos, protege ações sensíveis e aplica autorizações por mundo e clube.
3.2 Mundos
Controla a existência e o estado do mundo persistente.
Mantém o relógio lógico, a temporada atual, as regras ativas, o estado de pausa e a localização operacional do mundo.
Coordena criação, ativação, pausa, recuperação, arquivamento, migração e desativação de mundos.
3.3 Clubes
Controla identidade institucional, estrutura, instalações, marca, reputação, controle administrativo e delegações.
Não controla contratos, transferências, finanças ou estado médico, ainda que esses sistemas referenciem o clube.
Preserva o histórico institucional mesmo quando o usuário controlador deixa o jogo.
3.4 Jogadores
Controla a identidade esportiva, os atributos oficiais, a personalidade, o desenvolvimento acumulado, o estado de carreira e a aposentadoria.
Os atributos oficiais permanecem separados das estimativas percebidas pelos clubes e observadores.
O jogador mantém identidade global e trajetória histórica, independentemente dos clubes pelos quais passe.
3.5 Funcionários
Controla a identidade profissional, atributos, especialidades, capacidades, desenvolvimento e estado de carreira dos funcionários.
Contratação, remuneração e vigência continuam pertencendo ao domínio contratual.
3.6 Contratos
Controla contratos de jogadores e funcionários, vigência, salários, bônus, parcelas, cláusulas, renovações, encerramentos e obrigações decorrentes.
Um contrato não pode existir sem moeda, partes, período e estado coerentes.
Contratos históricos permanecem preservados após o encerramento.
3.7 Transferências
Controla negociações, ofertas, contrapropostas, acordos, registros, empréstimos e janelas de mercado.
A transferência concluída pode coordenar mudanças em contrato, vínculo esportivo e finanças, respeitando a autoridade de cada módulo.
Negociações expiradas, recusadas ou canceladas continuam existindo historicamente.
3.8 Competições
Controla competições, edições, fases, grupos, rodadas, participantes, classificação oficial e aplicação dos critérios de desempate.
A classificação oficial deve ser derivada de resultados válidos e de regras versionadas.
Participações, inscrições e resultados históricos não podem desaparecer por exclusão comum.
3.9 Partidas
Controla agenda, escalações oficiais, execução, eventos, resultados, pontos de recuperação, alocação do executor de partida e decisões ao vivo.
A partida possui fluxo e relógio próprios, separados do calendário geral do mundo.
Resultados oficiais são versionados; correções preservam o resultado anterior, a justificativa e a autorização.
3.10 Treinamento
Controla planos, sessões, cargas, atribuições e resultados do treinamento.
O desenvolvimento aplicado ao jogador deve ser rastreável até sua origem e respeitar as regras de evolução ativas.
3.11 Sistema médico
Controla lesões, avaliações, tratamentos, recuperação, risco observado e disponibilidade médica.
A condição médica e o tratamento pertencem ao sistema médico; a constituição permanente do jogador permanece no módulo de jogadores.
3.12 Observação e descoberta
Controla missões de observação, relatórios, conhecimento de cada clube, estimativas, confiança e processos de descoberta.
Informação desconhecida, observação inconclusiva, conhecimento expirado e dado oculto são estados distintos.
O valor oficial do jogador não deve ser exposto apenas porque a interface possui um campo correspondente.
3.13 Finanças
Controla contas, transações, lançamentos, obrigações, orçamento, liquidação e reconciliação.
Toda movimentação oficial deve preservar equivalência entre débitos e créditos.
Correções financeiras ocorrem por compensação e novo lançamento, nunca pela remoção silenciosa do histórico.
3.14 Capacidades transversais
Além dos domínios de negócio, existirão capacidades transversais com responsabilidade própria: comunicação durável, agendamento, notificações, projeções, configuração, auditoria, operações, integrações e catálogos globais de referência. Essas capacidades não podem se transformar em depósitos genéricos de dados sem proprietário.
4. Autoridade, propriedade e transições entre módulos
4.1 Proprietário único do estado
Cada tabela, entidade, fluxo e histórico oficial possui um único proprietário lógico. O proprietário é definido pelo módulo que controla o ciclo de vida e as invariantes, e não pelo nome da entidade referenciada. Uma lesão pertence ao sistema médico, mesmo referindo-se a um jogador; um contrato pertence ao sistema contratual, mesmo referindo-se a clube e jogador.
4.2 Alterações entre módulos
Um módulo não altera diretamente o estado interno de outro módulo.
Alterações coordenadas podem ocorrer dentro de uma operação transacional quando a regra exige atomicidade imediata.
Processos que atravessam etapas, dependem de tempo ou de serviços externos devem ser conduzidos por um orquestrador persistente.
Fatos publicados permitem que outros módulos atualizem projeções, iniciem tarefas ou avancem seus próprios processos.
Compensações devem ser explícitas quando uma etapa posterior falha após uma decisão já confirmada.
4.3 Processos longos
Fechamento de temporada, migração de mundo, exclusão de dados, geração extensa, recuperação, preenchimento retroativo e fluxos semelhantes serão modelados como processos persistentes com etapas, estado, ponto de recuperação, tentativas, pausa e retomada. Nenhum desses fluxos pode depender de uma única execução longa em memória.
5. Mundo persistente, calendário e ordem dos acontecimentos
5.1 Relógio lógico do mundo
Cada mundo possui um relógio lógico próprio, independente do relógio real da infraestrutura. O avanço do mundo deve ser persistente, reproduzível e controlado. Um mundo pode ser pausado, retomado ou recuperado sem perder a posição dos acontecimentos já processados.
5.2 Agenda persistente
Acontecimentos futuros do mundo são registrados antes da execução.
A agenda distingue o momento lógico em que o fato deve ocorrer do momento real em que um processo técnico deve executá-lo.
Eventos simultâneos são ordenados por sequência, fase, prioridade e identificador estável.
O horário lógico isolado nunca é suficiente para definir a ordem oficial quando vários fatos compartilham o mesmo instante.
5.3 Fases e ciclos
O avanço do mundo ocorre por fases controladas. Processos sazonais, rodadas, janelas, pagamentos, geração de notícias, inscrições e demais ciclos devem respeitar uma ordem definida e auditável. Uma falha pode pausar somente o escopo afetado, preservando a possibilidade de retomada segura.
5.4 Quatro conceitos de tempo
Tempo real: quando uma ação ocorreu na plataforma, foi recebida, processada, publicada, expirada ou revogada.
Tempo lógico do mundo: data e horário dentro da história simulada.
Relógio da partida: tempo decorrido dentro de uma partida, com períodos e acréscimos próprios.
Duração: intervalo expresso com unidade explícita, sem confusão entre tempo real e tempo de jogo.
A apresentação pode converter instantes reais para o fuso do usuário, mas essa conversão não altera o valor oficial. Datas do mundo não sofrem conversão de fuso. Conceitos que representam apenas um dia permanecem sem horário artificial.
6. Motor de simulação e partidas em tempo real
6.1 Núcleo determinístico
O motor recebe entradas, estado e contexto explícitos e produz saídas sem depender de estado oculto do processo.
Toda aleatoriedade competitiva utiliza sementes e fluxos controlados.
A mesma versão do motor, com as mesmas entradas, estado, regras e sementes, deve produzir o mesmo resultado.
O estado oficial do motor não pode depender de aproximações numéricas não determinísticas.
Pontos de recuperação, registros reproduzíveis, versões e assinaturas de integridade permitem retomar, comparar e investigar execuções.
6.2 Autoridade do servidor
O cliente nunca decide placar, posse, atributos, recursos, validade de uma ação ou resultado. O cliente envia intenção e apresenta o estado autorizado recebido. Qualquer reconexão deve recuperar o estado oficial do servidor, não continuar a partir de uma suposição local.
6.3 Sequência e recuperação ao vivo
Cada partida possui identidade, versão de execução e sequência própria.
Atualizações ao vivo são ordenadas por sequência e podem ser enviadas como estado completo ou diferenças incrementais.
O cliente detecta lacunas, solicita resincronização e recebe um retrato de estado válido antes de continuar.
A reinicialização da conexão não reinicia a partida.
Uma nova versão do executor de partida pode receber novas partidas enquanto a versão anterior conclui as partidas já iniciadas.
6.4 Resultado oficial e correção
A finalização precisa comprovar a versão de execução, a sequência final e a integridade do estado.
Duas execuções não podem oficializar resultados concorrentes para a mesma versão da partida.
Uma repetição com o mesmo resultado deve ser idempotente.
Um resultado divergente para a mesma versão constitui incidente de integridade.
Correções preservam versão anterior, versão corrigida, motivo e ator responsável.
7. Inteligência artificial e narrativa
7.1 Estrutura da inteligência artificial
A inteligência artificial será hierárquica. Ela combina objetivos, avaliação de utilidade, planejamento, políticas, memória e contexto. As decisões devem respeitar os mesmos limites e recursos aplicados ao usuário humano.
7.2 Separação entre decisão e linguagem
A lógica que altera o estado oficial não depende de modelos de linguagem.
Modelos generativos podem ser usados para narrativa, diálogo, explicação, notícias e variação textual.
A narrativa não pode inventar fatos incompatíveis com o estado oficial.
Decisões competitivas devem ser reproduzíveis, rastreáveis e explicáveis por seus dados de entrada e regras.
8. Estado oficial, histórico, eventos e projeções
8.1 Camadas de informação
Estado atual: representação oficial mais recente de cada agregado ou processo.
Histórico imutável: fatos, lançamentos, resultados, transições e registros que não podem ser reescritos silenciosamente.
Projeções: visões derivadas para telas, pesquisa, painéis, classificações e consultas rápidas.
Retratos de estado: pontos de recuperação e reprodução de estados complexos.
Artefatos extensos: registros reproduzíveis, exportações e retratos de estado grandes armazenados fora do banco transacional, com metadados e integridade registradas.
8.2 Estado relacional e documentos versionados
Identidades, relações, estados, sequências, tempos, valores financeiros, atributos oficiais, contratos, inscrições, transferências e classificações devem permanecer estruturados e sujeitos a regras de integridade. Documentos flexíveis são permitidos somente quando possuem fronteira, tipo e versão claros, como eventos, configurações publicadas, retratos de estado e metadados limitados.
Campos usados em busca, ordenação ou regras principais não podem ficar escondidos em documentos genéricos.
Todo documento relevante deve ser validado antes de ser persistido, publicado, consumido, importado ou migrado.
Eventos históricos preservam a versão em que foram publicados.
Documentos determinísticos possuem representação canônica e assinatura de integridade.
Documentos grandes não devem circular integralmente em mensagens; as mensagens carregam referências e assinaturas de integridade.
8.3 Projeções reconstruíveis
Projeções não são a fonte oficial do estado.
Podem ser apagadas, recriadas, trocadas por versão e reconstruídas a partir das fontes oficiais.
Uma projeção atrasada não deve bloquear a evolução do domínio oficial.
Registros de remoção e versões impedem que mensagens antigas recriem informações já removidas.
A autorização final de dados sensíveis continua sendo feita com base na fonte oficial.
9. Identificadores, versões e sequências
9.1 Identidade global
Entidades e processos oficiais utilizam identificadores globais, geráveis antes da persistência e aproximadamente ordenáveis pelo momento de criação. A identidade permanece estável durante importações, restaurações e migrações entre partições físicas.
9.2 Tipos distintos de controle
Identificador responde qual entidade ou processo está sendo tratado.
Versão do agregado controla concorrência e evolução do estado atual.
Sequência do fluxo define a posição de um evento dentro de um fluxo.
Sequência da partida define a ordem oficial das atualizações daquela execução.
Sequências locais podem existir para paginação, manutenção ou processamento físico, mas não se tornam identidade pública.
9.3 Regras de exposição
Identificadores podem aparecer em endereços, eventos, logs, auditoria e tempo real.
Conhecer um identificador não concede acesso ao recurso.
Códigos amigáveis, identificadores legíveis e referências de suporte são auxiliares e não substituem a identidade oficial.
Identificadores externos de provedores permanecem separados da identidade interna.
10. Integridade numérica e economia
10.1 Dinheiro
Valores monetários são representados em unidades mínimas inteiras e sempre carregam uma moeda explícita.
Operações básicas de soma, subtração e comparação devem ser exatas.
Moedas diferentes nunca são somadas silenciosamente.
Conversões, quando existirem, usam taxa versionada e preservam a taxa aplicada à operação histórica.
O saldo oficial deriva do livro financeiro e não de métricas ou projeções.
10.2 Livro de partidas dobradas
Cada transação financeira deve equilibrar débitos e créditos por moeda.
A equivalência é exata e não utiliza tolerância de arredondamento.
Correções são registradas como lançamentos compensatórios e novos lançamentos corretos.
Obrigações, liquidações e saldos materializados devem ser reconciliáveis com o histórico de lançamentos.
10.3 Percentuais, probabilidades e atributos
Percentuais financeiros e contratuais usam escala inteira padronizada.
Probabilidades oficiais usam escala inteira fixa, com zero e máximo representados sem ambiguidade.
Atributos oficiais e multiplicadores determinísticos usam valores inteiros em escala conhecida.
A escala interna dos atributos pode oferecer precisão superior à exibição pública; inicialmente, a referência é uma escala de zero a dez mil pontos.
A interface pode mostrar uma forma arredondada ou uma faixa percebida sem revelar a precisão oficial interna.
10.4 Arredondamento e conservação
Toda operação que descarte precisão declara a regra de arredondamento.
Arredondamentos devem ocorrer apenas no ponto definido pela regra de negócio.
Resíduos de divisão são distribuídos de forma determinística e nunca são perdidos ou criados silenciosamente.
Critérios oficiais de classificação preservam numeradores e denominadores quando possível, evitando arredondamento prematuro.
Estados oficiais rejeitam valores inválidos, indefinidos ou infinitos.
11. Ausência de dados, estados incompletos e validação
11.1 Presença obrigatória como padrão
Dados necessários para interpretar uma entidade devem estar sempre presentes. A ausência somente é permitida quando possui um significado de domínio claro e documentado, como “não possui avatar”, “a notificação ainda não foi lida” ou “o processo ainda não foi concluído”.
11.2 Proibições
Não utilizar zero, valor negativo, data artificial, identificador vazio ou texto vazio para representar ausência.
Não usar múltiplos booleanos contraditórios para representar uma máquina de estados.
Não inferir o estado atual apenas pela presença ou ausência de um campo; o estado deve ser explícito e coerente com os dados relacionados.
Não tratar informação desconhecida, privada, não aplicável, removida ou pendente de cálculo como a mesma coisa.
11.3 Coerência por estado
Campos de início, conclusão, aceitação, rejeição, entrega ou cancelamento devem existir somente nos estados correspondentes.
Conjuntos de campos que surgem juntos podem ser separados em entidades próprias para evitar estruturas cheias de ausências ambíguas.
Campos calculados possuem estado de cálculo, resultado, momento de conclusão e erro quando aplicável.
A omissão de um campo em uma atualização significa “não alterar”; a ausência explícita só remove o valor quando essa operação é permitida.
12. Relações, isolamento por mundo e consistência referencial
12.1 Isolamento por mundo
Entidades pertencentes a um mundo carregam o identificador do mundo de forma explícita.
Relações oficiais devem comprovar que todas as entidades relacionadas pertencem ao mesmo mundo.
Um contrato não pode ligar clube e jogador de mundos diferentes; uma competição não pode registrar participante de outro mundo; uma partida não pode misturar clubes de escopos distintos.
A redundância do identificador do mundo é aceita para segurança, consulta, migração e futura distribuição, desde que seja protegida contra inconsistência.
12.2 Referências fortes e referências lógicas
Relações oficiais dentro da mesma base física devem ter proteção referencial forte.
A remoção física de um registro oficial é bloqueada enquanto existirem dependências relevantes.
Cascatas automáticas são limitadas a filhos temporários, estritamente pertencentes e sem valor histórico independente.
Projeções, eventos históricos, provedores externos e referências entre bancos podem usar referências lógicas com validação, catálogo e reconciliação explícitos.
Toda referência sem proteção física deve declarar o destino, a justificativa, o responsável pela validação e o comportamento quando o destino não existe.
13. Ciclo de vida, arquivamento, exclusão e anonimização
13.1 Estratégia por categoria
Não existe uma regra universal de exclusão. Cada categoria de dado recebe uma política compatível com seu papel no produto.
Registros oficiais e imutáveis
Lançamentos financeiros, transações, resultados oficiais, inscrições históricas, contratos assinados, transferências concluídas, eventos publicados, auditorias, versões de regras e manifestos de versão publicada não são apagados por operações comuns.
Correções ocorrem por compensação, nova versão ou novo registro ligado ao anterior.
Entidades arquiváveis ou recuperáveis
Podem ser ocultadas do fluxo principal, restauradas durante uma janela definida e posteriormente eliminadas quando a política permitir.
Exclusão lógica registra estado, momento, ator, motivo e prazo de eliminação.
Dados pessoais
Podem exigir remoção, anonimização, pseudonimização, revogação e retenção por finalidade.
A exclusão de uma conta humana não elimina automaticamente jogadores, clubes, partidas ou históricos fictícios do mundo.
Credenciais e sessões são revogadas; o histórico esportivo pode ser preservado sem identificação pessoal.
Projeções e dados técnicos
Projeções reconstruíveis podem ser apagadas fisicamente.
Sessões expiradas, credenciais temporárias, recibos, tarefas concluídas e envios de arquivos abandonados e registros técnicos possuem retenção e limpeza próprias.
Tabelas volumosas podem ser eliminadas em lotes ou por períodos, sem bloquear a operação principal.
Registros de remoção
Quando necessário, permanece um registro mínimo de que a entidade ou documento existiu e foi removido.
Registros de remoção preservam identidade, tipo, versão, momento e motivo, sem manter o conteúdo original.
Eles evitam ressurreição por mensagens atrasadas e mantêm referências históricas compreensíveis.
13.2 Mundos e exclusões de alto impacto
Um mundo não pode ser eliminado por uma requisição simples ou por uma cadeia automática de exclusões.
A desativação de mundo é um processo coordenado de pausa, conclusão ou cancelamento de processos, retrato final de estado, exportação, retenção, remoção de projeções, anonimização e eliminação definitiva por categoria.
Exclusões sensíveis podem exigir dupla aprovação, retenção temporária e verificação posterior em todos os armazenamentos.
Investigações, disputas, incidentes e auditorias podem aplicar bloqueio temporário de remoção.
14. Mensageria, tarefas, agendamento e idempotência
14.1 Comunicação durável
Mudanças de estado e fatos correspondentes são registrados de forma atômica antes da publicação assíncrona.
Se a publicação falhar, o fato permanece pendente e pode ser retomado sem perder a mudança já confirmada.
Consumidores registram o recebimento para impedir que a mesma mensagem produza o mesmo efeito duas vezes.
Mensagens possuem tipo, versão, correlação, causa e identidade próprias.
14.2 Tarefas e reivindicações
Tarefas concorrentes são reivindicadas por um único processo de execução por vez.
Trabalhos curtos podem ser concluídos dentro de uma operação local; trabalhos longos utilizam reserva temporária de execução, expiração, sinal de atividade, ponto de recuperação e retomada.
A expiração da reserva temporária de execução permite que outro processo de execução continue o trabalho.
Tarefas e consumidores devem ser idempotentes e possuir limites de tentativas, atraso progressivo e fila de falhas permanentes.
14.3 Idempotência de comandos
Comandos externos podem carregar uma chave de idempotência persistente.
A mesma chave e a mesma intenção retornam o resultado já produzido.
A mesma chave com conteúdo diferente é rejeitada.
A proteção cobre o efeito de negócio, não apenas uma resposta em dado temporário de desempenho.
14.4 Sem transação distribuída
A plataforma não tentará transformar banco oficial, mensageria, dado temporário de desempenho, pesquisa, armazenamento de arquivos, autenticação e provedores externos em uma única transação. A consistência entre esses componentes será alcançada por eventos, idempotência, processos persistentes, compensações, reconciliação e estados intermediários explícitos.
15. Interfaces, contratos e clientes
15.1 Contratos versionados
Comandos, consultas, eventos, tarefas e protocolo em tempo real possuem contratos explícitos e versionados.
Entradas são validadas estritamente nas fronteiras.
Modelos internos de persistência não são devolvidos diretamente aos clientes.
Mudanças incompatíveis exigem nova versão e período de compatibilidade.
15.2 Web e dispositivos móveis
Clientes em navegador e dispositivos móveis compartilham contratos, cliente de acesso, conceitos de dados temporários de desempenho, protocolo em tempo real e identidade visual.
Estado vindo do servidor e estado local da interface permanecem separados.
Clientes antigos podem permanecer abertos durante uma atualização; por isso, a plataforma mantém compatibilidade durante a transição.
Mudanças nativas e atualizações de conteúdo móvel seguem fluxos de publicação distintos.
15.3 Pesquisa
Pesquisa textual e preenchimento automático utilizam uma projeção separada do estado oficial.
A projeção contém apenas campos seguros para indexação.
Resultados são reidratados e autorizados pela fonte oficial antes da entrega quando necessário.
O índice pode ser reconstruído, trocado por versão e corrigido sem alterar os dados oficiais.
16. Identidade, sessão e autorização
16.1 Camadas de identidade
Um provedor de identidade externo autentica o usuário.
O jogo mantém suas próprias sessões, dispositivos, participações em mundos e poderes sobre clubes.
Autenticação não implica automaticamente autorização para um mundo, clube, recurso ou ação.
Cada comando, consulta e assinatura em tempo real valida o usuário, a sessão, o mundo, o clube e a visibilidade aplicável.
16.2 Tempo real
Conexões em tempo real utilizam credenciais curtas e específicas.
Cada assinatura é autorizada separadamente.
Reconexão exige nova validação e recuperação de sequência.
Credenciais longas ou segredos de acesso não são expostos em canais públicos ou armazenamentos de interface.
16.3 Dados e privacidade
Dados pessoais, segredos e informações competitivas ocultas não podem aparecer em logs, documentos genéricos ou índices de pesquisa.
A plataforma registra finalidade, retenção, anonimização e remoção de dados pessoais.
A auditoria preserva rastreabilidade sem expor mais dados do que o necessário.
17. Arquivos, registros reproduzíveis, retratos de estado e cópias de segurança
17.1 Armazenamento de objetos
Arquivos extensos, registros reproduzíveis, exportações, retratos de estado grandes e cópias de segurança são armazenados fora da base transacional desde a implantação inicial.
O banco mantém identidade, categoria, chave, integridade, tamanho, versão, estado e autorização do objeto.
Objetos privados usam acesso temporário; chaves públicas só são usadas quando a categoria permitir.
Nomes e caminhos são versionados e imutáveis quando o artefato representa histórico ou versão publicada.
17.2 Remoção coordenada
A remoção de um arquivo é registrada como processo: marcar para exclusão, remover, confirmar e finalizar.
O banco não declara o objeto definitivamente removido antes da confirmação no armazenamento.
Arquivos temporários e envios de arquivos incompletos podem ser eliminados automaticamente por política.
Registros reproduzíveis e retratos de estado oficiais não podem desaparecer por uma regra genérica de limpeza.
17.3 Cópias de segurança e recuperação
Cópias de segurança da base oficial são enviadas para armazenamento externo.
A capacidade de restaurar deve ser testada, não apenas a capacidade de gerar cópias.
Manifestos, assinaturas de integridade e versões e registros de implantação permitem relacionar a cópia de segurança ao estado da plataforma.
Uma camada adicional independente de cópias de segurança pode ser adicionada conforme a maturidade operacional.
18. Notificações
18.1 Caixa oficial e canais
A plataforma mantém uma caixa de notificações oficial e persistente. Canais externos, notificação em dispositivo e atualizações em tempo real são formas de entrega, não a fonte única da notificação.
18.2 Modelo funcional
A notificação e cada tentativa de entrega são entidades separadas.
Usuários possuem preferências por categoria, canal e horário de silêncio.
Notificações podem ser agrupadas para evitar excesso de mensagens.
Ações vinculadas à notificação são tipadas e autorizadas.
Tentativas possuem estado, repetição, deduplicação e falha permanente.
Notificações de segurança podem ter retenção e prioridade diferentes de notificações comuns.
19. Configuração, controles de ativação, regras e balanceamento
19.1 Categorias de configuração
Segredos de infraestrutura são separados das configurações operacionais.
Configurações de processo são validadas antes de um serviço iniciar.
Configurações operacionais mutáveis são persistidas, auditadas e podem ter escopo por plataforma, partição física, mundo, serviço ou fila.
Controles de ativação de funcionalidades são avaliadas por um mecanismo interno compatível com padrões abertos.
Conjuntos de regras e pacotes de balanceamento publicados são imutáveis e versionados.
19.2 Regras competitivas
Um controle de ativação individual não pode alterar silenciosamente regras competitivas para apenas alguns usuários.
Mudanças competitivas são atribuídas explicitamente ao mundo, temporada, competição ou partida, conforme o caso.
Operações críticas registram um retrato da configuração aplicada.
Publicação de regras exige validação, compatibilidade, assinatura de integridade e teste no laboratório de simulação.
Interrupções de emergência podem usar controles de interrupção emergencial auditados, com motivo, escopo e prazo de expiração.
20. Observabilidade, auditoria e integridade
20.1 Observabilidade unificada
Logs, métricas e rastreamentos devem compartilhar correlação, serviço, versão publicada, mundo e fluxo operacional quando aplicável.
Eventos, comandos, tarefas e chamadas externas preservam a cadeia de causa e correlação.
Identificadores individuais não devem ser usados como dimensões de alta cardinalidade em métricas agregadas.
20.2 Auditoria
Ações administrativas, mudanças sensíveis, exclusões, correções, publicação de regras e operações de recuperação são auditadas.
Auditoria registra ator, ação, recurso, mundo, momento, motivo e alterações relevantes.
Segredos, credenciais de acesso e dados pessoais excessivos são filtrados antes do registro.
20.3 Verificadores de integridade
O sistema verifica saldos contra o livro financeiro, projeções contra fontes oficiais, arquivos contra metadados, índices de pesquisa contra projeções e referências lógicas entre bancos.
Resultados de verificação distinguem integridade saudável, destino ausente, escopo incompatível, referência desatualizada, duplicidade e impossibilidade de resolução.
Falhas graves podem pausar somente o escopo afetado e abrir um incidente operacional.
21. Resiliência, pausa segura e recuperação
21.1 Criticidade por componente
A política de recuperação varia conforme a criticidade. O motor de partida, o financeiro, a agenda do mundo, a identidade e o estado oficial recebem proteção mais forte que projeções, pesquisa ou relatórios reconstruíveis.
21.2 Comportamento diante de falhas
Interrupções não podem avançar silenciosamente um estado incompleto.
Processos persistem pontos de recuperação e podem ser retomados.
Partidas preservam sequência, versão de execução e estado suficiente para recuperação.
Projeções podem atrasar sem corromper a fonte oficial.
Filas e mensagens suportam repetição e deduplicação.
A plataforma oferece pausa segura por mundo, competição, partida, fila ou processo quando necessário.
21.3 Recuperação e alternância de contingência
A recuperação considera banco, mensagens pendentes, tarefas, objetos, projeções e índices.
Falhas ambíguas são reconciliadas antes de repetir efeitos.
A retomada valida versões, sequências, assinaturas de integridade e propriedade.
Cópias de segurança, restaurações, migrações e alternância de contingência são exercitados em ambiente controlado.
22. Testes, simulação e qualidade
22.1 Camadas de teste
Testes unitários das regras de domínio.
Testes de propriedades para invariantes numéricas, financeiras, probabilísticas e de conservação.
Testes de integração com os componentes reais de persistência e comunicação.
Testes de contrato para comandos, consultas, eventos, tarefas e tempo real.
Testes determinísticos e testes de referência para o motor.
Testes ponta a ponta para fluxos críticos do usuário e da administração.
Testes de carga, latência, reconexão, reivindicações concorrentes e recuperação.
Simulações extensas de temporadas, economia, distribuição de resultados e balanceamento.
Testes de restauração, migração, reversão de aplicação e reconstrução de projeções.
22.2 Laboratório de simulação
Conjuntos de regras, pacotes de balanceamento e novas versões do motor são avaliados em cenários controlados.
O laboratório compara distribuições, tendências, regressões, resultados extremos e estabilidade econômica.
Uma mudança não é publicada somente porque passou em testes unitários; ela precisa demonstrar comportamento sistêmico aceitável.
22.3 Proteção arquitetural
O núcleo de domínio e simulação não pode depender de componentes de persistência, comunicação, interface ou infraestrutura.
Fronteiras entre camadas e domínios são verificadas automaticamente.
Dependências circulares, acessos internos indevidos, código sem uso e dependências não declaradas são tratados como falhas.
O projeto adota tipagem estrita, ausência de novos alertas de qualidade e exceções justificadas e limitadas.
Decisões arquiteturais relevantes são registradas e mudanças críticas exigem revisão compatível com o seu risco.
23. Publicação, versões e operação inicial
23.1 Implantação inicial
A plataforma será implantada inicialmente em uma infraestrutura gerenciada e simplificada, possivelmente em um único servidor, mas os processos permanecerão separados. Banco, armazenamento de arquivos, comunicação e demais componentes críticos devem poder ser externalizados progressivamente sem alterar o domínio do jogo.
23.2 Artefatos imutáveis
A validação e a construção ocorrem fora do ambiente de produção.
Produção executa artefatos previamente aprovados e identificados de forma imutável.
O mesmo artefato validado em homologação é promovido para produção, sem nova reconstrução.
A versão implantada registra o identificador da versão publicada, revisão, componentes, contratos, migração necessária e aprovação.
Produção não depende de um rótulo genérico ou de reconstrução para realizar reversão.
23.3 Migrações e preenchimentos retroativos
Mudanças estruturais são executadas em etapa exclusiva e nunca automaticamente por cada serviço ao iniciar.
Mudanças destrutivas seguem expansão, compatibilidade, preenchimento, validação e contração em publicações separadas.
Preenchimentos extensos são processos persistentes em lotes, com ponto de recuperação, limite de velocidade, pausa, retomada e auditoria.
A reversão preferencial de banco é uma correção para frente; restauração de cópia de segurança é reservada a perda ou corrupção grave.
23.4 Estratégias de atualização
Serviços sem estado podem ser substituídos após aprovação de saúde.
Conexões em tempo real entram em drenagem, orientam reconexão e preservam resincronização.
Processos de execução param de buscar novas tarefas, concluem ou devolvem as tarefas ativas e salvam pontos de recuperação.
Executores de partida antigos deixam de receber novas partidas e concluem as já iniciadas.
Novas versões podem ser liberadas progressivamente por mundos ou escopos controlados.
Reversão de aplicação reutiliza artefatos anteriores, sem recompilação.
23.5 Governança de desenvolvimento e ambientes
A linha principal de desenvolvimento deve permanecer integrável e implantável.
Ambientes não são mantidos por linhas permanentes de desenvolvimento divergentes; são promovidos por artefato aprovado.
Correções urgentes continuam passando por construção, validação, registro e retorno à linha principal.
Ambientes temporários usam dados sintéticos, credenciais isoladas, expiração e limites de recursos.
24. Regras físicas de dados convertidas em requisitos funcionais
24.1 Organização e nomenclatura
Dados são organizados por domínio proprietário e capacidade transversal.
Ambientes e partições físicas não são simulados como simples divisões lógicas dentro da mesma base.
A mesma estrutura de domínios deve poder ser reproduzida em futuras partições físicas.
Objetos globais de referência, como países, moedas e idiomas, permanecem separados das entidades operacionais.
Cópias temporárias de migração precisam de proprietário, finalidade e prazo de remoção.
24.2 Paginação e consultas
Coleções extensas usam cursor estável, nunca deslocamento profundo como estratégia principal.
Toda ordenação possui critério de desempate determinístico.
Interfaces de consulta possuem limites máximos; exportações grandes são processos assíncronos e geram arquivos.
Consultas críticas são desenhadas a partir de padrões de acesso conhecidos e possuem orçamento de desempenho.
A plataforma monitora consultas lentas, frequentes, regressivas e repetitivas.
24.3 Índices e particionamento
Índices existem para sustentar integridade, filtros, ordenação, relações, reivindicações, retenção ou consultas documentadas.
Índices redundantes são revisados com base em uso, sazonalidade e função de integridade.
Particionamento somente é adotado quando volume, retenção ou manutenção demonstram necessidade real.
Não haverá uma partição por mundo como substituto de distribuição física.
Dados temporais e de alto volume são os primeiros candidatos a particionamento por período real.
Particionamento não elimina a necessidade de índices e restrições locais.
24.4 Integridade antes da conveniência
Restrições de estado, unicidade, faixa, moeda, escopo e relação permanecem no nível mais próximo possível da fonte oficial.
Uma chave global não substitui a unicidade natural do negócio.
Uma coluna de referência sem proteção exige justificativa e verificador.
Modelos flexíveis, coleções simples ou documentos não podem substituir relações com identidade, ciclo de vida e metadados próprios.
25. Fluxos críticos consolidados
25.1 Alteração de um agregado
1. Receber uma intenção com identidade, ator, mundo e dados validados.
2. Autorizar a ação no contexto correto.
3. Carregar o estado oficial e verificar sua versão.
4. Aplicar a regra de domínio sem dependência de infraestrutura.
5. Persistir o novo estado e os fatos correspondentes de forma atômica.
6. Publicar os fatos de maneira recuperável.
7. Atualizar projeções, pesquisa, notificações e integrações de forma assíncrona.
8. Retornar ao cliente um resultado autorizado e versionado.
25.2 Execução de uma partida
1. Preparar a partida com regras, elenco, contexto, versão do motor e sementes definidas.
2. Atribuir uma execução autorizada e registrar sua versão.
3. Avançar o estado por sequência determinística.
4. Distribuir atualizações ao vivo e retratos de recuperação.
5. Salvar pontos de recuperação conforme a criticidade.
6. Finalizar com sequência, integridade e resultado comprovados.
7. Registrar resultado oficial e fatos derivados.
8. Atualizar competição, finanças, histórico e projeções pelos fluxos proprietários.
25.3 Publicação de regra ou balanceamento
1. Criar uma versão em rascunho separada das versões já publicadas.
2. Validar estrutura, compatibilidade e integridade.
3. Executar simulações e comparar regressões.
4. Publicar como versão imutável.
5. Atribuir explicitamente a um escopo futuro ou controlado.
6. Registrar a versão aplicada em operações competitivas.
7. Preservar versões antigas enquanto existirem partidas, temporadas, registros reproduzíveis ou históricos dependentes.
25.4 Exclusão de usuário
1. Registrar a solicitação e validar identidade, escopo, retenções e bloqueios.
2. Revogar credenciais, sessões, dispositivos e canais de entrega.
3. Encerrar participações e controles de clube de forma segura.
4. Anonimizar ou remover dados pessoais conforme a finalidade.
5. Preservar histórico esportivo não pessoal e registros oficiais necessários.
6. Remover projeções, pesquisa, dados temporários de desempenho e objetos sujeitos à política.
7. Verificar todos os armazenamentos e concluir o processo de forma auditável.
25.5 Recuperação de processo
1. Identificar a última versão, sequência, ponto de recuperação e reserva temporária de execução válidos.
2. Verificar se a etapa anterior foi confirmada ou ficou ambígua.
3. Reconciliar efeitos já produzidos antes de repetir qualquer ação.
4. Retomar a partir do ponto de recuperação com a mesma identidade de processo.
5. Reaplicar operações idempotentes e compensar efeitos incompatíveis.
6. Validar a integridade final e registrar o incidente ou recuperação.
26. Decisões pendentes ou ainda não fechadas
Os itens desta seção foram mencionados ou apresentados, mas não receberam aprovação definitiva nesta conversa. Eles não devem ser tratados como regra final até nova decisão.
26.1 Política definitiva de transações e concorrência
Ainda precisa ser aprovada a combinação final de controle de concorrência para operações simultâneas. A proposta apresentada, mas ainda não confirmada, combina isolamento transacional comum como padrão, versionamento otimista para agregados, bloqueios seletivos para seções críticas, serialização apenas em invariantes complexas, reivindicações concorrentes para filas internas e processos persistentes para operações longas.
26.2 Prazos concretos de retenção
As categorias de retenção, arquivamento, recuperação, anonimização, eliminação definitiva e bloqueio legal foram definidas, mas os períodos concretos por categoria ainda deverão ser aprovados em etapa específica.
26.3 Particionamento físico de tabelas específicas
Foi decidido que o particionamento será orientado por evidência. A lista definitiva de tabelas, a chave de partição e os limiares de adoção permanecem dependentes de medições de volume, retenção, manutenção e desempenho.
26.4 Refinamento das escalas internas
A representação fixa e determinística de atributos, probabilidades e multiplicadores está aprovada. O catálogo definitivo de escalas por tipo de atributo e os limites específicos de cada valor ainda podem ser refinados, sem permitir mistura silenciosa de unidades ou mudança de escala sem versionamento.
26.5 Contradições identificadas
Não foram identificadas contradições materiais entre as decisões aprovadas consolidadas neste documento. Quando uma regra futura alterar uma decisão aqui registrada, a nova versão deverá substituir explicitamente a anterior e documentar o impacto sobre mundos, temporadas, partidas, dados históricos e compatibilidade.
27. Critério de aceite do escopo
Uma implementação, especificação complementar ou decisão futura estará alinhada a este documento somente quando:
preservar a autoridade do servidor e o determinismo competitivo;
respeitar os limites e a propriedade dos módulos;
manter o estado oficial separado de projeções, dados temporários de desempenho e documentos derivados;
preservar histórico, rastreabilidade e capacidade de recuperação;
garantir isolamento entre mundos e consistência das relações;
usar representação numérica exata e escalas explícitas para valores oficiais;
tratar ausência, ciclo de vida, exclusão e anonimização de forma semanticamente correta;
versionar contratos, regras, balanceamento, eventos, retratos de estado e versões publicadas;
permitir implantação progressiva, reversão de aplicação e recuperação de processos;
não reduzir o escopo a uma solução temporária que viole as regras estruturais aprovadas.
