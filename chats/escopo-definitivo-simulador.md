



DOCUMENTO DEFINITIVO DE ESCOPO FUNCIONAL
Jogo persistente de gestão e simulação de futebol

Versão consolidada: 10 de julho de 2026
Natureza: Escopo integral de produto e regras do jogo
Estado: Consolidação das decisões aprovadas ao longo do planejamento
Documento funcional sem código, modelos de dados ou detalhes de implementação técnica.

Apresentação
Este documento consolida o escopo funcional completo do jogo de gestão e simulação de futebol planejado para um mundo online persistente. Ele substitui a necessidade de consultar as conversas originais e reúne, em linguagem de produto, as regras, entidades, sistemas, fluxos, consequências e exceções já aprovadas.
Foram removidos códigos, modelos de banco, estruturas de implementação, nomes técnicos de estados, alternativas rejeitadas, perguntas intermediárias e repetições. Quando decisões posteriores alteraram entendimentos anteriores, prevalece a decisão mais recente.
O documento não representa uma versão reduzida do produto. O escopo descrito é o modelo completo pretendido para o jogo, ainda que sua construção possa ocorrer em etapas internas.
Princípios gerais do produto
O jogo será um simulador de futebol online, persistente e compartilhado, no qual cada clube possui continuidade histórica e cada jogador é único dentro do mundo.
O usuário assume a gestão de um clube e participa de um ambiente que continua evoluindo mesmo durante sua ausência.
O jogo não reinicia clubes, jogadores, contratos, dívidas, lesões, reputações ou relações ao final de cada temporada. A temporada seguinte é continuação direta da anterior.
O usuário nunca será demitido do clube por desempenho esportivo ou administrativo. Resultados ruins poderão reduzir orçamento, autonomia e confiança, além de impor supervisão e planos de recuperação.
O usuário não é tratado como proprietário absoluto do clube. A diretoria, a governança, as regras competitivas e as limitações financeiras continuam existindo e podem restringir decisões.
O mundo deve permanecer equilibrado sem eliminar diferenças construídas por boa gestão. Equilíbrio significa oportunidades, regras comuns e economia sustentável, não igualdade artificial entre clubes veteranos e novos.
Clubes começam pequenos e equilibrados. O crescimento ocorre por decisões, tempo, estrutura, desempenho, formação, reputação, torcida, finanças e capacidade administrativa.
Os clubes gerados no início recebem o mesmo valor-base de caixa e condições iniciais equivalentes, admitindo pequenas diferenças de identidade e perfil que não produzam vantagem estrutural oculta.
A economia será dinâmica e proporcional à quantidade de clubes, jogadores, dinheiro em circulação, aposentadorias, geração de novos atletas e capacidade das competições.
O motor de partidas, a economia, o mercado e as decisões oficiais seguem regras comuns para usuários e clubes controlados pelo jogo.
Informações conhecidas pelo usuário serão separadas da realidade interna do mundo. Potencial, personalidade, condição, interesse e atributos não observados não serão revelados sem uma fonte válida.
Toda decisão relevante deve possuir causa, consequência, prazo, responsável e histórico compreensível.
O jogo será concebido prioritariamente para uso em dispositivos móveis, com acesso rápido a ações urgentes e aprofundamento progressivo quando o usuário desejar.
Índice geral
Visão do jogo e experiência central
Mundo persistente, tempo e sincronização
Usuários, entrada no mundo e controle de clubes
Clube, identidade, crescimento e governança
Central, agenda, decisões e retorno ao jogo
Funcionários, departamentos e responsabilidades
Estrutura e infraestrutura do clube
Finanças, contabilidade e economia do mundo
Comercial, patrocínios, marca, torcida e imprensa
Jogadores, identidade, carreira e vida pessoal
Elenco, hierarquia e dinâmica de grupo
Treinamento, desenvolvimento e formação
Medicina, desempenho físico e recuperação
Escalação, funções e sistema tático
Preparação para partidas
Partida ao vivo e intervenções do usuário
Pós-jogo e consequências
Competições, calendário e organização esportiva
Mercado, observação e recrutamento
Transferências, empréstimos e contratos
Final de temporada e transição entre temporadas
História, recordes, estatísticas e memória do mundo
Notificações, delegações e automações
Integridade competitiva, privacidade, segurança e moderação
Experiência de uso e fluxos integrados
Regras transversais de consistência
Decisões pendentes, limites e pontos ainda não fechados
1. Visão do jogo e experiência central
1.1 Proposta do jogo
O jogo oferece a experiência de construir um clube pequeno até transformá-lo em uma instituição relevante dentro de um mundo persistente. O progresso não será restrito ao desempenho em campo. O usuário deverá administrar simultaneamente:
Elenco profissional e categorias de formação.
Comissão técnica, departamentos e responsabilidades.
Treinamento, preparação, medicina e desempenho.
Mercado, observação, contratos, empréstimos e transferências.
Finanças, caixa, orçamento, dívidas e compromissos futuros.
Estádio, centro de treinamento, equipamentos e demais instalações.
Patrocínios, bilheteria, marca, torcida e comunicação.
Relação com diretoria, objetivos e limites de autonomia.
Competições, inscrições, calendário e consequências sazonais.
História, reputação, rivalidades, recordes e legado.
A experiência central combina planejamento de longo prazo com decisões contextuais. O usuário não deverá navegar por dezenas de telas apenas para descobrir o que exige atenção. A Central apresentará riscos, prazos, oportunidades e decisões, sempre ligada ao sistema original responsável pelo assunto.
1.2 Fantasia de progressão
O clube cresce de forma orgânica. Um time que começa com estrutura básica poderá, ao longo de várias temporadas:
Formar uma identidade esportiva.
Desenvolver jogadores próprios.
Melhorar departamentos.
Construir ou ampliar instalações.
Aumentar torcida e receita.
Conquistar acessos e títulos.
Tornar-se referência de formação, negociação, desempenho ou gestão.
Criar rivalidades e uma história própria.
O tempo favorece clubes bem administrados, mas não garante crescimento automático. Decisões ruins, dívidas, contratos desequilibrados, estruturas deterioradas, elenco envelhecido e perda de confiança poderão provocar estagnação ou regressão.
1.3 Papel do usuário
O usuário exerce o controle gerencial do clube, com capacidade de decidir ou delegar diferentes áreas. Esse controle é amplo, mas não absoluto. A diretoria e a governança podem:
Definir objetivos.
Aprovar ou limitar orçamentos.
Exigir autorizações para compromissos relevantes.
Reduzir autonomia em períodos de crise.
Impor planos corretivos.
Bloquear decisões incompatíveis com a situação do clube.
O usuário permanece no clube mesmo em temporadas ruins. A consequência de desempenho insuficiente será sentida dentro da gestão, e não pela interrupção forçada da experiência.
1.4 Mundo compartilhado
Os clubes de usuários coexistem nas mesmas competições, mercados e ciclos econômicos. As decisões de um clube podem afetar outros por meio de:
Transferências e empréstimos.
Concorrência por jogadores e funcionários.
Resultados e classificações.
Disputas por acesso, permanência e títulos.
Receitas e distribuição econômica.
Rivalidades, narrativas e reputação.
Escassez de posições ou profissionais.
O jogo também possuirá clubes sem usuário ativo, administrados pelas mesmas regras gerais e pela inteligência do jogo.
1.5 Ausência do usuário
O mundo continuará durante a ausência. Partidas, prazos, contratos, treinamentos, pagamentos e eventos não ficarão congelados individualmente. Para impedir perda injusta de controle, o usuário poderá estabelecer políticas, delegações e limites de atuação para funcionários e para a inteligência do clube.
Ao retornar, receberá um resumo organizado por importância, distinguindo:
O que aconteceu.
O que foi decidido automaticamente.
O que expirou.
O que continua pendente.
O que exige ação imediata.
O que mudou na situação geral do clube.
2. Mundo persistente, tempo e sincronização
2.1 Tempo oficial do mundo
Cada mundo possui um relógio oficial. Esse relógio determina:
Datas de partidas.
Prazos de propostas e contratos.
Treinos e recuperação.
Pagamentos e vencimentos.
Janelas de transferência.
Inscrições.
Obras e manutenções.
Fim de competições e temporadas.
O horário do aparelho do usuário não altera o tempo oficial. A interface poderá converter horários para o fuso local, mas sempre mostrará a referência oficial quando existir risco de confusão.
2.2 Continuidade
O mundo persiste independentemente de usuários específicos estarem conectados. A ausência não interrompe:
Partidas programadas.
Recuperação de jogadores.
Execução de treinos previamente aprovados.
Obrigações financeiras.
Término de contratos.
Retorno de empréstimos.
Processos de competição.
Evolução de obras.
2.3 Ritmo do mundo
O ritmo deverá permitir planejamento real, acompanhamento de partidas e convivência entre usuários com rotinas diferentes. A passagem de tempo será organizada em eventos, datas e janelas compreensíveis, evitando depender de ações contínuas durante todo o dia.
O sistema deve informar antecipadamente:
Próximas partidas.
Prazos críticos.
Fechamentos de inscrição.
Vencimentos financeiros.
Decisões de mercado.
Etapas de transição da temporada.
2.4 Pausas e manutenção
Quando uma manutenção ou falha impedir o acesso, os prazos afetados deverão seguir uma política oficial. Conforme o impacto, poderão ser mantidos, congelados, prorrogados ou reabertos. Partidas e decisões competitivas não poderão ser prejudicadas por indisponibilidade não atribuível ao usuário.
2.5 Processos atrasados
Se o mundo ficar temporariamente atrasado, as etapas pendentes deverão ser processadas na ordem correta. O jogo não poderá pular obrigações, concluir duas vezes a mesma ação ou avançar uma temporada sem encerrar os processos anteriores.
2.6 Versões de regras
Uma temporada, competição, contrato ou partida permanece ligada às regras válidas em seu período. Mudanças futuras não reescrevem automaticamente o passado. Quando uma regra nova exigir transição, o jogo deverá informar:
Quando começa a valer.
Quais competições ou contratos afeta.
Quais direitos anteriores continuam protegidos.
Quais decisões precisam ser adaptadas.
3. Usuários, entrada no mundo e controle de clubes
3.1 Participação no mundo
A conta do usuário e sua participação em um mundo são conceitos diferentes. Um mesmo usuário poderá participar de mundos distintos, respeitando as regras de cada um. Dentro de um mesmo mundo, controlará no máximo um clube ativo.
3.2 Formas de entrada
A entrada poderá ocorrer por:
Assunção de um clube disponível sem controlador ativo.
Criação de novo clube em uma expansão organizada do mundo.
Entrada em nova divisão ou estrutura competitiva criada para expansão.
Processo excepcional de substituição de controlador, respeitando continuidade e histórico.
A entrada não poderá alterar o mundo de forma improvisada depois que calendários e competições estiverem oficialmente fechados. Novos clubes serão inseridos em janelas apropriadas, normalmente entre temporadas.
3.3 Clubes iniciais
Os clubes gerados para o início do mundo serão pequenos e equilibrados. Receberão:
Caixa inicial equivalente.
Elencos de valor e capacidade comparáveis.
Estrutura básica suficiente para operar.
Pequenas diferenças de perfil, identidade e composição sem vantagem estrutural dominante.
Nenhum usuário deverá começar com um clube já consolidado como potência.
3.4 Entrada tardia
Um usuário que entrar muitas temporadas depois não receberá um clube artificialmente equiparado aos maiores. Em vez disso, o mundo deverá oferecer caminhos reais de crescimento, como:
Novas vagas em divisões inferiores.
Expansões programadas.
Clubes disponíveis em diferentes situações.
Estruturas mínimas compatíveis com a competição de entrada.
Economia inicial suficiente para operar sem garantia de sucesso.
Oportunidades de formação, mercado e ascensão.
A entrada tardia não apaga a vantagem construída por clubes antigos, mas também não deve condenar o novo usuário a um clube inviável.
3.5 Reserva e ativação do clube
A escolha de clube poderá gerar uma reserva temporária enquanto o usuário conclui o processo de entrada. A ativação deverá confirmar:
Elegibilidade.
Ausência de outro clube ativo no mundo.
Situação oficial do clube.
Autoridade concedida.
Data efetiva do controle.
Políticas herdadas e decisões pendentes.
3.6 Continuidade de controle
A troca de controlador não reinicia o clube. Permanecem:
Contratos.
Dívidas.
Elenco.
Funcionários.
Obras.
Objetivos institucionais.
Histórico.
Sanções.
Reputação.
Relações.
Automações pessoais do controlador anterior não serão herdadas ativamente. Políticas institucionais e obrigações do clube continuam válidas.
3.7 Onboarding
Ao assumir o clube, o usuário deverá receber uma análise inicial contendo:
Situação esportiva.
Elenco e principais lacunas.
Contratos e prazos.
Caixa, orçamento e dívidas.
Funcionários e departamentos.
Estrutura e manutenções.
Objetivos da diretoria.
Próximas partidas e inscrições.
Ações urgentes.
Decisões já delegadas.
O onboarding não deverá esconder problemas existentes nem oferecer vantagem por meio de informações que o clube não deveria conhecer.
4. Clube, identidade, crescimento e governança
4.1 Clube como entidade permanente
O clube possui identidade própria e continuidade histórica. Mudanças de nome, cidade, escudo, estádio, proprietário ou controlador não criam automaticamente um novo clube.
O clube poderá ser encerrado, fundido, substituído ou sucedido, mas esses processos deverão indicar claramente:
Continuidade jurídica.
Continuidade esportiva.
Direitos históricos.
Títulos reconhecidos.
Dívidas assumidas.
Patrimônio.
Torcida e identidade cultural.
4.2 Identidade
A identidade inclui:
Nome oficial e nome curto.
Cores.
Escudo.
Cidade e região.
Apelidos.
Uniformes.
Estádio principal.
História institucional.
Cada alteração será registrada por período. Partidas antigas continuarão mostrando a identidade utilizada na época.
4.3 Crescimento do clube
O nível real do clube emerge da combinação de:
Divisão e desempenho.
Elenco.
Funcionários.
Estrutura.
Finanças.
Torcida.
Reputação.
Marca.
Formação de jogadores.
Governança.
O clube não terá um único nível que substitua todos esses sistemas.
4.4 Diretoria e governança
A diretoria representa os interesses institucionais e acompanha:
Resultado esportivo.
Sustentabilidade financeira.
Qualidade do elenco.
Funcionários.
Estrutura.
Formação.
Comercial.
Torcida.
Integridade.
A governança poderá variar entre clubes por composição, perfil, mandato, tolerância a risco e estratégia, sem criar poderes arbitrários fora das regras do mundo.
4.5 Objetivos
Os objetivos poderão ser:
Esportivos.
Financeiros.
Estruturais.
De formação.
Comerciais.
Institucionais.
De reputação.
Cada objetivo deverá informar:
Resultado esperado.
Prazo.
Prioridade.
Critério de avaliação.
Consequência provável.
Responsável.
A avaliação poderá reconhecer cumprimento parcial, superação, cancelamento por mudança externa ou impossibilidade contextual.
4.6 Autonomia
A autonomia do usuário poderá variar por área:
Mercado.
Contratos.
Finanças.
Infraestrutura.
Funcionários.
Comunicação.
Formação.
Uma temporada ruim, crise financeira ou quebra de política pode gerar:
Aprovação obrigatória para gastos.
Limites mais baixos.
Intervenção de determinado departamento.
Exigência de vendas.
Bloqueio de novas obrigações.
Plano de recuperação.
Uma boa gestão pode ampliar autonomia, orçamento e confiança, mas não cria dinheiro sem origem econômica.
4.7 Usuário nunca demitido
A permanência do usuário é uma regra central. Mesmo em rebaixamento, crise ou insolvência:
O usuário continua no clube.
A diretoria pode restringir suas decisões.
Determinadas áreas podem passar a exigir aprovação.
Metas corretivas podem ser impostas.
A reconstrução do clube torna-se parte da experiência.
4.8 Reputação do clube
A reputação será multidimensional:
Esportiva.
Financeira.
Institucional.
Comercial.
De formação.
Regional e internacional.
Uma dimensão não substitui as outras. Um clube pode ser esportivamente respeitado e financeiramente arriscado, ou forte em formação e fraco comercialmente.
4.9 Políticas institucionais
O clube poderá adotar políticas sobre:
Perfil de contratação.
Uso da base.
Limites salariais.
Endividamento.
Infraestrutura.
Comunicação.
Risco médico.
Delegações.
Essas políticas orientam funcionários e automações, mas continuam subordinadas às regras do mundo e à capacidade real do clube.
5. Central, agenda, decisões e retorno ao jogo
5.1 Central como área principal
A Central será orientada por decisões e não apenas por mensagens não lidas. Ela deverá apresentar:
Ações críticas.
Prazos de hoje.
Pendências da semana.
Processos aguardando terceiros.
Decisões delegadas.
Mudanças materiais.
Resultados recentes.
5.2 Notificação e tarefa
Uma notificação informa. Uma tarefa representa uma obrigação ou decisão. Marcar uma notificação como lida não conclui a tarefa.
Uma mesma tarefa pode produzir várias atualizações, como:
Negociação aberta.
Contraproposta.
Mudança de prazo.
Recomendação do funcionário.
Aviso de expiração.
Essas atualizações serão agrupadas em um único assunto.
5.3 Prioridade
A prioridade considera:
Prazo.
Gravidade.
Reversibilidade.
Impacto esportivo.
Impacto financeiro.
Probabilidade.
Confiança da informação.
Dependências.
Autoridade exigida.
Urgência e importância serão separadas. Uma decisão estratégica pode ser importante e ainda distante; uma ação rotineira pode se tornar urgente por ter prazo de minutos.
5.4 Agenda
Todo item com data ou prazo poderá aparecer na Agenda, incluindo:
Partidas.
Treinos.
Reuniões.
Vencimentos.
Inscrições.
Contratos.
Obras.
Avaliações médicas.
Amistosos.
Eventos comerciais.
A Agenda abrirá o mesmo objeto da Central e do módulo de origem.
5.5 Dependências
Uma tarefa poderá estar bloqueada por:
Relatório.
Exame.
Aprovação.
Resposta de outro clube.
Pagamento.
Licença.
Decisão disciplinar.
O usuário deverá saber por que não pode avançar e quem possui a próxima responsabilidade.
5.6 Lembretes
O usuário poderá criar lembretes:
Em data específica.
Antes de um prazo.
Antes de uma partida.
Quando uma condição ocorrer.
De forma recorrente.
O sistema não permitirá adiar silenciosamente uma decisão para depois de seu prazo oficial.
5.7 Retorno após ausência
O retorno será proporcional ao tempo ausente.
Ausência breve:
Mudanças materiais.
Próximo prazo.
Resultado recente.
Ausência de vários dias:
Partidas.
Mercado.
Elenco.
Finanças.
Decisões automáticas.
Pendências.
Ausência longa:
Evolução do mundo.
Situação do clube.
Temporadas concluídas.
Acessos ou rebaixamentos.
Mudanças de elenco.
Obras.
Finanças.
Ações urgentes.
5.8 Prazos perdidos
Quando um prazo expirar durante a ausência, o resumo deverá informar:
O que expirou.
Qual política foi aplicada.
Qual consequência ocorreu.
Se ainda existe alguma forma de correção.
6. Funcionários, departamentos e responsabilidades
6.1 Papel dos funcionários
Funcionários não serão apenas bônus percentuais. Cada profissional possui:
Identidade.
Carreira.
Função.
Competências.
Especialidades.
Reputação.
Contrato.
Relações.
Disponibilidade.
Carga de trabalho.
Responsabilidades.
6.2 Departamentos
O clube poderá possuir departamentos como:
Diretoria esportiva.
Comissão técnica.
Preparação física.
Medicina.
Desempenho e análise.
Observação e recrutamento.
Formação.
Finanças.
Jurídico e contratos.
Comunicação.
Comercial.
Operações e infraestrutura.
6.3 Qualidade departamental
A qualidade de um departamento resulta de:
Competência das pessoas.
Número de profissionais.
Estrutura disponível.
Processos.
Tecnologia.
Carga de trabalho.
Liderança.
Um departamento não melhora apenas porque um número de nível foi aumentado.
6.4 Efeitos funcionais
Exemplos aprovados de impacto:
Equipe médica fraca aumenta a probabilidade de avaliações incompletas, prevenção insuficiente e maior exposição a lesões evitáveis.
Comunicação forte administra melhor insatisfação da torcida, crises e narrativas públicas.
Diretoria pouco qualificada tende a negociar contratos piores, contratar profissionais de menor nível e possuir menor capacidade de planejamento.
Observação qualificada melhora precisão, profundidade e velocidade dos relatórios.
Comissão técnica qualificada identifica melhores pontos de decisão durante partidas e produz recomendações mais relevantes.
6.5 Cargo e responsabilidade
Cargo e responsabilidade serão separados. Um funcionário poderá ocupar um cargo e receber responsabilidades específicas com limites definidos.
Exemplo:
O diretor esportivo prepara negociações.
O usuário aprova compromissos acima de determinado valor.
O analista produz recomendações, mas não altera a tática sozinho.
6.6 Delegação
A delegação poderá envolver:
Preparar.
Recomendar.
Monitorar.
Executar dentro de limites.
Aprovar ações de baixo risco.
Delegar não significa perder visibilidade. O usuário deverá conhecer:
Quem recebeu a tarefa.
Qual autoridade possui.
O que foi realizado.
Qual regra foi usada.
Qual resultado ocorreu.
6.7 Sobrecarga e ausência
Funcionários podem ficar sobrecarregados, indisponíveis ou ausentes. Isso poderá causar:
Atraso.
Menor qualidade de análise.
Falta de acompanhamento.
Necessidade de substituto.
Escalonamento ao usuário.
Áreas críticas não poderão permanecer sem responsável sem que o jogo sinalize a lacuna.
6.8 Desenvolvimento de funcionários
Funcionários poderão:
Ganhar experiência.
Melhorar competências.
Obter qualificações.
Mudar de função.
Ser promovidos.
Perder desempenho por idade, contexto ou desatualização.
Aposentar-se.
O desenvolvimento dependerá de trabalho, formação, ambiente e oportunidade, e não de progressão automática idêntica.
7. Estrutura e infraestrutura do clube
7.1 Representação física
A infraestrutura será composta por instalações, módulos, equipamentos, capacidades e condições reais. Não será reduzida a uma lista genérica de níveis.
Principais áreas:
Estádio.
Centro de treinamento.
Medicina e reabilitação.
Desempenho e análise.
Academia e formação.
Administração.
Tecnologia e dados.
Comercial e hospitalidade.
Transporte e logística.
7.2 Propriedade e acesso
Uma instalação poderá ser:
Própria.
Alugada.
Concedida.
Compartilhada.
Utilizada por acordo temporário.
Propriedade, direito de uso e capacidade operacional serão tratados separadamente.
7.3 Qualidade, condição e capacidade
Cada estrutura possuirá dimensões distintas:
Qualidade funcional.
Condição física.
Capacidade nominal.
Capacidade operacional.
Disponibilidade.
Conformidade.
Uma instalação de alta qualidade pode operar mal se estiver deteriorada, sem manutenção ou sem funcionários suficientes.
7.4 Estádio
O estádio deverá considerar:
Setores.
Capacidade autorizada.
Condição do gramado.
Segurança.
Acessos.
Hospitalidade.
Iluminação.
Vestiários.
Comunicação.
Operação em dias de partida.
A capacidade licenciada pode ser menor que a capacidade física.
7.5 Centro de treinamento
O centro de treinamento influencia:
Qualidade das sessões.
Disponibilidade de campos.
Recuperação.
Desenvolvimento técnico.
Preparação física.
Integração de grupos.
Capacidade de treinar categorias diferentes.
Conflitos de agenda e indisponibilidade de áreas deverão ser possíveis.
7.6 Medicina e desempenho
Instalações médicas e de desempenho influenciam:
Qualidade de diagnóstico.
Prevenção.
Tratamento.
Reabilitação.
Avaliação física.
Análise de carga.
Retorno ao jogo.
Estrutura não substitui profissionais qualificados e profissionais não substituem estrutura adequada.
7.7 Formação
A estrutura de base influencia:
Quantidade de jovens atendidos.
Qualidade de desenvolvimento.
Capacidade de alojamento.
Integração educacional abstrata.
Captação regional.
Segurança e proteção de menores.
7.8 Manutenção e deterioração
Instalações se deterioram com:
Uso.
Tempo.
Clima.
Falta de manutenção.
Incidentes.
Sobrecarga.
A manutenção preventiva reduz risco, mas possui custo e ocupa recursos.
7.9 Inspeções e licenças
Determinadas instalações precisarão de:
Inspeção.
Certificação.
Licença.
Capacidade mínima.
Plano de adequação.
Falhas podem gerar:
Restrição de uso.
Redução de capacidade.
Necessidade de estádio alternativo.
Impedimento de acesso a divisão superior.
Multa ou prazo de correção.
7.10 Projetos de infraestrutura
Um projeto passa por:
Estudo de viabilidade.
Aprovação.
Financiamento.
Contratação.
Preparação.
Execução.
Inspeção.
Entrega.
Entrada em operação.
Projetos podem sofrer:
Atrasos.
Aumento de custo.
Mudança de escopo.
Falha de fornecedor.
Entrega parcial.
Problemas de licença.
7.11 Obras durante a temporada
Obras podem afetar:
Capacidade do estádio.
Treinos.
Rotina médica.
Amistosos.
Receita.
Disponibilidade de instalações.
O fim de uma temporada não conclui automaticamente obras. Elas continuam de acordo com seus prazos reais.
7.12 Patrimônio e sustentabilidade
A infraestrutura possui valor, custo de manutenção, vida útil e impacto operacional. O clube poderá comprar, vender, alugar, ampliar, substituir ou desativar ativos, respeitando contratos e aprovações.
Medidas de eficiência, consumo e adaptação climática poderão reduzir custos e riscos, sem gerar vantagens mágicas.
8. Finanças, contabilidade e economia do mundo
8.1 Princípios financeiros
O jogo separará claramente:
Caixa disponível.
Saldo bancário.
Valores restritos.
Orçamento autorizado.
Compromissos assumidos.
Contas a pagar.
Contas a receber.
Dívidas.
Patrimônio.
Resultado econômico.
Projeções futuras.
Possuir dinheiro em caixa não significa possuir autorização orçamentária. Possuir orçamento aprovado não significa que o dinheiro já esteja disponível.
8.2 Fonte dos valores
Nenhum valor surgirá ou desaparecerá sem origem. As principais entradas poderão vir de:
Bilheteria.
Patrocínios.
Direitos de transmissão.
Premiações.
Transferências.
Empréstimos financeiros.
Contribuições de proprietários ou diretoria.
Produtos e hospitalidade.
Formação e mecanismos de compensação.
Uso de instalações.
As principais saídas poderão vir de:
Salários.
Bônus.
Transferências.
Comissões e taxas.
Manutenção.
Obras.
Viagens.
Funcionários.
Medicina.
Formação.
Operações de partida.
Dívidas e juros.
Penalidades.
Seguros.
8.3 Contabilidade e caixa
Receitas e despesas serão reconhecidas quando forem economicamente geradas, e os pagamentos poderão ocorrer em datas diferentes. O usuário deverá distinguir:
Receita já conquistada e ainda não recebida.
Despesa já assumida e ainda não paga.
Pagamento antecipado.
Parcela futura.
Obrigação condicionada.
O histórico financeiro não poderá ser corrigido apagando valores anteriores. Erros serão tratados por ajustes e reversões identificadas.
8.4 Orçamento
O orçamento poderá ser dividido por áreas:
Folha salarial.
Transferências.
Funcionários.
Infraestrutura.
Formação.
Operações.
Comercial.
Reserva de emergência.
A diretoria poderá permitir realocação entre áreas, negar alterações ou exigir aprovação.
8.5 Cenários
O planejamento deverá trabalhar com cenários como:
Esperado.
Conservador.
Otimista.
Com acesso.
Com permanência.
Com rebaixamento.
Receitas incertas não deverão ser tratadas como dinheiro garantido.
8.6 Folha salarial
A projeção da folha incluirá:
Jogadores.
Funcionários.
Aumentos automáticos.
Bônus recorrentes.
Encargos abstratos aplicáveis.
Contratos futuros já assinados.
Retornos de empréstimo.
Reduções por rebaixamento previstas em contrato.
8.7 Transferências na contabilidade
O valor esportivo acordado, o cronograma de pagamento e o impacto contábil serão separados. A compra de um jogador poderá gerar:
Pagamento imediato.
Parcelas.
Bônus condicionais.
Comissão.
Participação em venda futura.
Compromissos ainda não ativados.
A venda poderá gerar lucro ou prejuízo econômico diferente do caixa recebido no momento.
8.8 Reservas
Ao avançar em decisões relevantes, o clube poderá reservar recursos para impedir que o mesmo orçamento seja comprometido duas vezes.
Uma reserva poderá ser:
Consumida.
Parcialmente consumida.
Liberada.
Expirada.
8.9 Crédito e dívida
Formas possíveis:
Empréstimo bancário.
Linha de crédito.
Antecipação de recebíveis.
Financiamento de infraestrutura.
Empréstimo de proprietário.
Renegociação de obrigações.
Cada dívida poderá possuir:
Valor.
Juros.
Taxas.
Garantias.
Vencimentos.
Carência.
Condições.
Penalidades por inadimplência.
Não haverá crédito ilimitado. A capacidade depende de receita, ativos, estabilidade, histórico, endividamento e risco.
8.10 Inadimplência
Um clube poderá atrasar:
Salários.
Parcelas de transferência.
Fornecedores.
Impostos abstratos.
Dívidas.
Consequências possíveis:
Insatisfação.
Juros e multas.
Perda de confiança.
Bloqueio de mercado.
Sanções competitivas.
Intervenção da diretoria.
Renegociação.
Venda de ativos.
8.11 Crise e insolvência
A situação financeira poderá evoluir de estável para atenção, pressão, crise, insolvência e reestruturação.
Em crise, o clube poderá sofrer:
Redução orçamentária.
Congelamento de contratações.
Obrigação de vender.
Renegociação de dívidas.
Intervenção financeira.
Perda de licença.
Rebaixamento administrativo conforme regulamento.
O usuário continuará no clube, mas trabalhará sob restrições mais severas.
8.12 Diretoria e aportes
A diretoria ou propriedade poderá aportar recursos ou conceder empréstimos, conforme seu perfil e capacidade. Não haverá resgate automático sempre que o usuário gastar mal.
Aportes poderão vir com:
Condições.
Metas.
Limites.
Participação em decisões.
Exigência de recuperação.
8.13 Economia do mundo
A economia será calibrada considerando:
Quantidade de clubes.
Número de jogadores.
Distribuição de qualidade.
Dinheiro circulando.
Salários.
Transferências.
Aposentadorias.
Novos jogadores.
Receitas por divisão.
Dívida total.
Inflação.
Transferências entre clubes redistribuem dinheiro. Premiações, patrocínios e outras receitas externas introduzem recursos conforme regras calibradas. Taxas, comissões, manutenção e operações retiram dinheiro do circuito.
8.14 Inflação e índices
O mundo poderá possuir índices distintos para:
Preços gerais.
Salários.
Transferências.
Construção.
Crédito.
Custos regionais.
Mudanças futuras não reescrevem contratos já assinados.
8.15 Clubes controlados pelo jogo
Clubes sem usuário seguem as mesmas limitações financeiras. Não poderão criar dinheiro para contratar, ignorar dívidas ou manter folhas impossíveis apenas para sustentar dificuldade artificial.
9. Comercial, patrocínios, marca, torcida e imprensa
9.1 Sistema comercial
A área comercial transforma atenção, torcida, desempenho, reputação e ativos do clube em receitas e relacionamentos.
Principais atividades:
Patrocínios.
Fornecedores.
Bilheteria.
Hospitalidade.
Produtos.
Programas de associação.
Direitos de nome.
Campanhas.
Uso de imagem e conteúdo.
9.2 Ativos comerciais
O clube poderá oferecer ativos específicos, como:
Espaços do uniforme.
Placas e mídia do estádio.
Nome do estádio ou instalação.
Conteúdo digital.
Patrocínio de treino.
Patrocínio de base.
Camarotes.
Experiências.
Campanhas temáticas.
Direitos exclusivos não poderão ser vendidos simultaneamente a parceiros incompatíveis.
9.3 Patrocinadores
O interesse e o valor de um patrocinador dependerão de:
Alcance.
Torcida.
Divisão.
Reputação.
Desempenho.
Mercado regional.
Compatibilidade de marca.
Histórico do clube.
Entregas prometidas.
O contrato poderá prever:
Valor fixo.
Bônus.
Metas.
Exclusividade.
Direitos.
Obrigações.
Penalidades.
Renovação.
9.4 Entregas comerciais
Assinar um patrocínio cria obrigações. O clube poderá precisar:
Exibir marca.
Realizar campanha.
Disponibilizar espaço.
Produzir conteúdo.
Participar de evento.
Entregar hospitalidade.
Falhas podem reduzir pagamento, impedir renovação ou gerar conflito.
9.5 Bilheteria
A demanda por ingressos considerará:
Tamanho da torcida.
Momento esportivo.
Adversário.
Rivalidade.
Competição.
Horário.
Preço.
Capacidade.
Conforto.
Clima.
Segurança.
Aumentar preços pode elevar receita por ingresso e reduzir público, satisfação ou acessibilidade.
9.6 Hospitalidade
Camarotes, áreas especiais e experiências possuem capacidade, custo e público próprios. Dependem de estrutura, operação e mercado.
9.7 Produtos e estoque
Produtos poderão possuir:
Produção.
Estoque.
Custo.
Preço.
Demanda.
Sazonalidade.
Campanhas.
Obsolescência.
Uma temporada histórica, contratação popular ou novo uniforme pode aumentar demanda. Estoque excessivo gera custo e risco.
9.8 Marca
A marca do clube cresce por:
História.
Torcida.
Identidade.
Resultados.
Jogadores marcantes.
Comunicação.
Presença regional.
Competição.
Consistência institucional.
Marca forte melhora oportunidades, mas não substitui desempenho, infraestrutura ou capacidade de entrega.
9.9 Torcida
A torcida não será uma barra única. Poderá ser dividida por:
Região.
Faixa de envolvimento.
Geração.
Poder de consumo.
Frequência ao estádio.
Expectativas.
Identidade.
Grupos organizados.
9.10 Sentimento
O sentimento da torcida poderá reagir a:
Resultados.
Expectativa.
Estilo de jogo.
Rivalidades.
Preços.
Vendas de jogadores.
Formação.
Dívidas.
Comunicação.
Mudanças de estádio ou identidade.
A torcida pode estar satisfeita esportivamente e preocupada financeiramente ao mesmo tempo.
9.11 Memória da torcida
A torcida lembrará:
Títulos.
Rebaixamentos.
Promessas.
Ídolos.
Traições percebidas.
Crises.
Grandes partidas.
Mudanças institucionais.
A passagem do tempo reduz algumas reações, mas não apaga automaticamente fatos marcantes.
9.12 Protestos e campanhas
Insatisfação elevada poderá produzir:
Protestos.
Queda de público.
Pressão sobre diretoria.
Campanhas.
Apoio a jogadores ou causas do clube.
A comunicação pode administrar a situação, mas não eliminar consequências de decisões reais.
9.13 Imprensa
A imprensa produzirá:
Notícias.
Perguntas.
Análises.
Rumores.
Narrativas.
Comparações.
Pressão.
A informação poderá ser oficial, provável, incerta, falsa ou corrigida.
9.14 Narrativas
Narrativas surgem da interpretação dos fatos, como:
Clube favorito.
Projeto em ascensão.
Crise.
Dependência de um jogador.
Técnico pressionado.
Geração promissora.
Gestão responsável.
Narrativa não altera diretamente a realidade, mas pode influenciar torcida, reputação, moral, mercado e pressão.
9.15 Comunicação do clube
O clube poderá:
Emitir comunicados.
Responder a crises.
Apresentar projetos.
Defender jogadores.
Reconhecer erros.
Promover campanhas.
Declarações públicas criam memória e podem ser tratadas como promessas.
9.16 Qualidade da comunicação
Uma equipe de comunicação melhor:
Identifica riscos mais cedo.
Recomenda respostas mais adequadas.
Controla inconsistências.
Reduz dano de rumores falsos.
Organiza entregas.
Não poderá transformar uma decisão impopular em sucesso sem mudança concreta.
10. Jogadores, identidade, carreira e vida pessoal
10.1 Jogador único
Cada jogador será único dentro do mundo. Não haverá cópias do mesmo atleta em clubes diferentes.
O jogador possui:
Identidade.
Data de nascimento.
Nacionalidade e origem.
Formação.
Perfil técnico.
Perfil físico.
Perfil mental.
Personalidade.
Potencial.
Relações.
Contratos.
Carreira.
História fora de campo.
10.2 Pessoa e carreira
O jogador é uma pessoa persistente. Após encerrar a carreira, poderá futuramente tornar-se funcionário, mantendo a mesma identidade e história.
10.3 Geração de jogadores
A geração considerará:
Quantidade de clubes.
Necessidade de elencos.
Distribuição etária.
Posições.
Aposentadorias.
Regiões.
Academias.
Economia.
A geração não criará atletas de elite apenas para resolver escassez imediata.
10.4 Origem e história pessoal
A origem, nacionalidade e acontecimentos de vida influenciam a formação inicial de maneira probabilística e sutil.
Exemplos de influências possíveis:
Infância de privação pode contribuir para garra, perseverança ou insegurança.
Ambiente estável pode favorecer aprendizado e equilíbrio, sem garantir superioridade.
Exposição a violência pode influenciar força, agressividade, medo ou instabilidade.
Perda familiar pode afetar maturidade, moral, vínculos e reação à pressão.
Esses fatores não serão deterministas nem estereótipos fixos. A história cria tendências e conflitos, não destinos obrigatórios.
10.5 Desenvolvimento posterior
Após surgir no mundo, o jogador é moldado por:
Treino.
Clube.
Minutos.
Funções.
Funcionários.
Estrutura.
Lesões.
Relações.
Moral.
Ambiente.
Decisões pessoais.
Um jogador poderá desenvolver características diferentes das sugeridas por sua origem.
10.6 Atributos reais e conhecimento
O jogador possui um estado real interno. O clube conhece apenas parte dele por meio de:
Observação.
Treino.
Partidas.
Exames.
Relações.
Informação pública.
Relatórios poderão conter incerteza e erro. Atributos ocultos não serão mostrados automaticamente.
10.7 Potencial
Potencial representa possibilidades, não destino garantido. Seu aproveitamento depende de:
Idade.
Ambiente.
Formação.
Minutos.
Saúde.
Personalidade.
Qualidade da comissão.
Continuidade.
Escolhas de carreira.
10.8 Personalidade
A personalidade poderá influenciar:
Treino.
Ambição.
Adaptação.
Profissionalismo.
Lealdade.
Reação a críticas.
Liderança.
Gestão de pressão.
Negociações.
Ela não será revelada em um número exato sem conhecimento adequado.
10.9 Vida fora de campo
A vida pessoal poderá gerar eventos relacionados a:
Família.
Adaptação.
Moradia.
Relacionamentos.
Estudos abstratos.
Luto.
Mudanças de cidade.
Exposição pública.
Problemas pessoais.
Esses eventos influenciam disponibilidade, moral, integração e decisões, respeitando privacidade e evitando exploração sensacionalista.
10.10 Nacionalidade e convocação
A nacionalidade pode ter influência pequena na formação inicial e grande relevância em:
Adaptação cultural.
Idioma.
Regras de inscrição.
Mercado.
Possíveis convocações.
Convocações e competições externas ao clube, quando presentes, poderão afetar:
Disponibilidade.
Fadiga.
Reputação.
Moral.
Risco de lesão.
10.11 Carreira
A carreira preservará:
Formação.
Clubes.
Contratos.
Empréstimos.
Partidas.
Estatísticas.
Títulos.
Prêmios.
Lesões.
Transferências.
Funções.
Liderança.
Aposentadoria.
10.12 Idade e envelhecimento
A idade muda no aniversário real dentro do calendário do mundo. A virada de temporada não adiciona um ano simultaneamente a todos.
O envelhecimento poderá afetar:
Recuperação.
Velocidade.
Resistência.
Experiência.
Consistência.
Liderança.
Risco de lesão.
Motivação.
10.13 Aposentadoria
A aposentadoria será contextual. Considerará:
Idade.
Condição física.
Lesões.
Motivação.
Contrato.
Papel.
Família.
Propostas.
Objetivos pessoais.
Jogadores da mesma idade poderão decidir de maneira diferente.
A aposentadoria poderá ser:
Considerada.
Anunciada.
Adiada.
Confirmada.
Imposta por decisão médica excepcional.
10.14 Aposentadoria médica
Uma lesão grave não encerra automaticamente a carreira. A aposentadoria médica exigirá avaliação, diagnóstico, risco e confirmação.
11. Elenco, hierarquia e dinâmica de grupo
11.1 Elenco como grupo social
O elenco não será apenas uma lista de jogadores. Ele possuirá:
Hierarquia.
Lideranças.
Grupos.
Relações.
Papéis.
Expectativas.
Conflitos.
Mentorias.
Cultura.
11.2 Papel no elenco
O papel esperado poderá incluir:
Jogador-chave.
Titular.
Rotação.
Reserva.
Desenvolvimento.
Liderança.
Mentor.
O papel deverá ser coerente com contrato, comunicação e utilização real.
11.3 Promessas
Promessas poderão envolver:
Minutos.
Posição.
Papel.
Renovação.
Transferência.
Reforços.
Competição.
Desenvolvimento.
Cada promessa terá prazo, contexto e estado. Uma promessa impossível por evento externo poderá ser renegociada e não será tratada automaticamente como quebra deliberada.
11.4 Moral
A moral individual poderá reagir a:
Resultados.
Minutos.
Desempenho.
Papel.
Contrato.
Relações.
Promessas.
Comunicação.
Vida pessoal.
Mercado.
A moral do elenco emerge das morais individuais e do ambiente coletivo.
11.5 Liderança
O clube poderá definir:
Capitão.
Vice-capitão.
Conselho de jogadores.
Líderes informais.
Mentores.
A liderança depende de personalidade, tempo, reputação, relação e comportamento, e não apenas de atributo técnico.
11.6 Grupos e relações
Jogadores podem formar grupos por:
Idioma.
Nacionalidade.
Idade.
Formação.
Tempo de clube.
Amizade.
Função.
Grupos podem ajudar integração ou gerar divisão. O sistema não tratará toda afinidade como problema.
11.7 Conflitos
Conflitos poderão surgir por:
Disputa de posição.
Promessa quebrada.
Declaração pública.
Diferença salarial percebida.
Liderança.
Transferência.
Conduta.
Falta de minutos.
O usuário poderá conversar, mediar, alterar papéis ou aceitar consequências.
11.8 Jogadores insatisfeitos
A insatisfação poderá produzir:
Queda de moral.
Pedido de conversa.
Pedido de saída.
Menor renovação.
Influência no grupo.
Reação pública.
Não causará perda técnica instantânea obrigatória, mas poderá afetar comportamento e ambiente.
11.9 Integração
Novos jogadores precisam se adaptar a:
Clube.
Cidade.
Idioma.
Tática.
Grupo.
Treino.
Expectativa.
Pré-temporada, líderes, compatriotas e funcionários podem ajudar.
11.10 Jovens no elenco principal
A promoção de um jovem deverá considerar:
Nível atual.
Potencial.
Minutos disponíveis.
Ambiente.
Treino.
Proteção física.
Papel.
Pressão.
Promover não garante desenvolvimento. Manter um jovem sem jogar pode prejudicar sua trajetória.
12. Treinamento, desenvolvimento e formação
12.1 Objetivo do treinamento
O treinamento prepara para partidas, desenvolve capacidades e administra carga. Ele deverá equilibrar:
Desempenho imediato.
Desenvolvimento futuro.
Familiaridade tática.
Condição física.
Recuperação.
Prevenção.
12.2 Planejamento
O clube poderá organizar:
Ciclos de treinamento.
Semanas.
Sessões.
Grupos.
Planos individuais.
Recuperação.
Preparação específica.
12.3 Tipos de foco
Exemplos:
Técnica.
Tática.
Físico.
Finalização.
Defesa.
Posse.
Pressão.
Bola parada.
Recuperação.
Integração.
Desenvolvimento de função.
12.4 Carga
A carga será influenciada por:
Intensidade.
Duração.
Tipo de exercício.
Condição do jogador.
Minutos recentes.
Idade.
Lesões.
Clima.
Estrutura.
Carga alta pode acelerar preparação ou desenvolvimento em determinados contextos, mas aumenta fadiga e risco.
12.5 Participação individual
Jogadores poderão:
Participar integralmente.
Participar parcialmente.
Realizar treino adaptado.
Fazer recuperação.
Ser dispensados.
Estar indisponíveis.
12.6 Qualidade da sessão
Depende de:
Funcionários.
Estrutura.
Número de participantes.
Planejamento.
Ambiente.
Motivação.
Continuidade.
12.7 Desenvolvimento
O desenvolvimento não ocorrerá como aumento automático no fim da temporada. Resulta da acumulação de:
Treino.
Minutos.
Qualidade da competição.
Idade.
Potencial.
Saúde.
Moral.
Continuidade.
Função.
Ambiente.
12.8 Regressão
A regressão poderá ocorrer por:
Idade.
Lesão.
Inatividade.
Falta de treino.
Condição crônica.
Ambiente inadequado.
Mudança de função mal conduzida.
12.9 Funções e posições
O jogador poderá aprender:
Nova posição.
Nova função.
Comportamentos táticos.
Uso diferente do pé.
Responsabilidades.
A adaptação exige tempo e pode gerar perda temporária de desempenho.
12.10 Desenvolvimento individual
O plano individual poderá priorizar:
Fraqueza.
Potencial específico.
Nova função.
Recuperação.
Preparação física.
Tomada de decisão.
Um plano inadequado pode desperdiçar tempo ou aumentar carga sem benefício.
12.11 Categorias de formação
A formação deverá possuir:
Captação.
Grupos por etapa.
Treino.
Competições.
Avaliação.
Promoção.
Empréstimo.
Liberação.
12.12 Geração e captação
Jovens poderão surgir em academias, regiões, projetos e sistemas de captação. A estrutura e os funcionários aumentam a probabilidade de bons talentos, mas não garantem estrelas.
12.13 Proteção de menores
O jogo deverá tratar menores com:
Regras de movimentação.
Responsabilidade institucional.
Alojamento adequado quando necessário.
Educação abstrata.
Privacidade.
Limites de carga.
12.14 Promoção
Geração e promoção são processos diferentes. Um jogador pode existir na base por anos antes de chegar ao profissional.
Um jovem não promovido poderá:
Permanecer na base.
Ser emprestado.
Mudar de clube.
Ser liberado.
Encerrar a busca por carreira profissional.
13. Medicina, desempenho físico e recuperação
13.1 Estado médico
Cada jogador poderá possuir:
Condição geral.
Fadiga.
Dor.
Lesão.
Restrição.
Tratamento.
Reabilitação.
Processo de retorno.
13.2 Lesões
O risco depende de:
Carga.
Fadiga.
Histórico.
Perfil físico.
Idade.
Condição do gramado.
Contato.
Clima.
Qualidade preventiva.
Decisões de uso.
Uma lesão não será um evento totalmente independente das decisões anteriores.
13.3 Diagnóstico
A equipe médica poderá trabalhar com:
Suspeita inicial.
Exames.
Diagnóstico.
Gravidade.
Faixa de recuperação.
Risco de retorno.
A estimativa poderá mudar com novas informações.
13.4 Confidencialidade
O diagnóstico real, a informação da comissão, a comunicação pública e o conhecimento de outros clubes serão diferentes.
13.5 Tratamento
Tratamentos poderão possuir:
Objetivo.
Duração.
Custo.
Responsável.
Risco.
Alternativas.
Impacto na carreira.
13.6 Reabilitação
A reabilitação será progressiva:
Controle da dor.
Recuperação de movimento.
Fortalecimento.
Treino individual.
Treino parcial.
Treino completo.
Liberação competitiva.
13.7 Retorno ao jogo
A liberação médica não garante ritmo ou confiança. O retorno deverá considerar:
Risco.
Condição.
Carga.
Minutos previstos.
Importância da partida.
Recomendação médica.
Decisão esportiva.
O usuário poderá assumir risco dentro de seus limites, mas a consequência deverá ser real.
13.8 Dor e fadiga sem lesão
Um jogador pode estar disponível e ainda apresentar:
Dor leve.
Fadiga acumulada.
Risco aumentado.
Necessidade de limite de minutos.
13.9 Responsabilidade durante empréstimo
Lesões em empréstimos deverão definir:
Quem trata.
Quem paga.
Onde ocorre a reabilitação.
Como o clube de origem recebe informações.
O que acontece no retorno.
13.10 Continuidade sazonal
Lesões e tratamentos não desaparecem na troca de temporada. Jogadores lesionados continuam seu processo normalmente.
14. Escalação, funções e sistema tático
14.1 Escalação
A escalação incluirá:
Titulares.
Reservas.
Capitão.
Formação.
Funções.
Instruções.
Bola parada.
Alternativas.
14.2 Elegibilidade
Antes de confirmar, o jogo validará:
Inscrição.
Suspensão.
Lesão e restrição.
Disponibilidade.
Limite de estrangeiros.
Regras de formação.
Número de jogadores.
Posição de goleiro.
14.3 Posição e função
A posição define a zona geral. A função define o comportamento esperado.
Um jogador pode atuar na mesma posição com funções diferentes, alterando:
Movimento.
Risco.
Participação.
Pressão.
Cobertura.
Construção.
14.4 Familiaridade
O desempenho tático depende de:
Familiaridade com formação.
Familiaridade com função.
Treino.
Continuidade.
Comunicação.
Relações.
Qualidade da comissão.
14.5 Sistema tático
O sistema poderá definir:
Estrutura com bola.
Estrutura sem bola.
Altura de linhas.
Intensidade de pressão.
Ritmo.
Direção de ataques.
Marcação.
Transições.
Risco.
Uso de largura.
14.6 Instruções individuais
Poderão orientar:
Pressionar mais.
Marcar jogador.
Avançar.
Ficar.
Arriscar passes.
Finalizar mais.
Proteger posição.
Limitar esforço.
Instruções incompatíveis com a capacidade ou função podem reduzir desempenho.
14.7 Bola parada
O clube poderá configurar:
Cobradores.
Alvos.
Posicionamento.
Cobertura.
Variações.
A bola parada exige treino, jogadores adequados e execução.
14.8 Plano alternativo
O usuário poderá preparar alternativas para:
Vantagem.
Desvantagem.
Expulsão.
Lesão.
Mudança de adversário.
Final de jogo.
14.9 Sugestões da comissão
A comissão poderá sugerir:
Escalação.
Mudança de função.
Ajuste de carga.
Marcação.
Substituição.
Mudança de postura.
A qualidade da sugestão depende dos funcionários e do conhecimento disponível. Sugestão melhor não significa certeza de resultado.
15. Preparação para partidas
15.1 Dossiê da partida
A preparação reunirá:
Adversário.
Forma recente.
Provável escalação.
Padrões táticos.
Pontos fortes.
Fragilidades.
Situação física do elenco.
Clima.
Gramado.
Viagem.
Importância.
Regulamento.
15.2 Conhecimento do adversário
O conhecimento depende de:
Observação.
Análise.
Partidas públicas.
Funcionários.
Tempo de preparação.
O jogo não revelará automaticamente a escalação real do adversário.
15.3 Treino específico
A semana poderá incluir:
Preparação para pressão adversária.
Defesa de bola parada.
Ataque a determinado setor.
Adaptação a gramado ou clima.
Simulação de cenários.
15.4 Viagem e logística
A preparação deverá considerar:
Distância.
Horário.
Hospedagem.
Transporte.
Descanso.
Clima.
Adaptação.
Economizar em logística pode aumentar fadiga e reduzir preparação.
15.5 Estado do elenco
Antes da partida, a comissão apresentará:
Disponíveis.
Em dúvida.
Restritos.
Suspensos.
Fatigados.
Sem ritmo.
Inscritos.
15.6 Reunião pré-jogo
O usuário poderá definir:
Mensagem.
Expectativa.
Abordagem emocional.
Prioridades.
Capitão.
O efeito depende do contexto, credibilidade e perfil do grupo.
15.7 Confirmação
A escalação será confirmada dentro do prazo. Se o usuário estiver ausente, a política definida e a comissão prepararão uma escalação válida.
16. Partida ao vivo e intervenções do usuário
16.1 Motor único
Partidas com usuário online e offline utilizarão o mesmo motor. Não haverá um resultado simplificado separado que ignore as regras da simulação.
16.2 Fatores da simulação
A partida considerará:
Qualidade e características dos jogadores.
Funções.
Táticas.
Familiaridade.
Condição.
Fadiga.
Moral.
Relações.
Clima.
Gramado.
Vantagem de mando.
Decisões da comissão.
Eventos da partida.
Aleatoriedade controlada.
16.3 Acompanhamento
O usuário poderá acompanhar por:
Placar.
Linha do tempo.
Eventos.
Estatísticas.
Indicadores territoriais e de pressão.
Alertas da comissão.
Situação física.
Pontos de decisão.
16.4 Intervenções online
Quando conectado, o usuário poderá:
Fazer substituições.
Alterar formação.
Trocar funções.
Ajustar postura.
Marcar mais forte.
Pressionar.
Recuar.
Aumentar ou reduzir risco.
Mudar ritmo.
Proteger jogadores.
Reorganizar após expulsão.
As mudanças não produzem efeito instantâneo mágico. Dependem de comunicação, momento, familiaridade, perfil dos jogadores e contexto.
16.5 Pontos de decisão
A comissão apresentará decisões em momentos relevantes, como:
Lesão.
Expulsão.
Fadiga elevada.
Mudança tática do adversário.
Domínio adversário.
Vantagem ameaçada.
Necessidade de resultado.
Comissões melhores identificam situações mais cedo e sugerem alternativas mais impactantes.
16.6 Usuário offline
Sem o usuário, a inteligência do clube deverá realizar prioritariamente ações essenciais:
Substituir lesionado.
Reorganizar após expulsão.
Proteger atleta em risco médico.
Utilizar substituições necessárias.
Aplicar políticas previamente configuradas.
Mudanças estratégicas profundas serão mais limitadas e dependerão da qualidade da comissão e das políticas autorizadas.
16.7 Políticas offline
O usuário poderá estabelecer orientações como:
Preservar vantagem.
Buscar empate.
Buscar vitória.
Evitar risco médico.
Substituir jogadores acima de determinado nível de fadiga.
Priorizar determinada função.
16.8 Ritmo da partida
O ritmo deverá permitir intervenção sem transformar a partida em espera infinita. Decisões terão janelas claras e a simulação continuará quando o prazo terminar.
16.9 Validade das decisões
Uma ação pode ser rejeitada se:
A janela passou.
O jogador já saiu.
O limite de substituições acabou.
A partida mudou de estado.
A ordem entrou em conflito com ação anterior.
16.10 Eventos
A partida poderá produzir:
Gols.
Finalizações.
Defesas.
Cartões.
Lesões.
Substituições.
Mudanças de domínio.
Bola parada.
Interrupções.
Decisões de arbitragem abstratas.
16.11 Expulsão
Uma expulsão altera:
Estrutura tática.
Espaços.
Fadiga.
Risco.
Moral.
Necessidade de substituição.
O usuário ou a comissão deverá reorganizar a equipe.
16.12 Lesão durante a partida
A gravidade inicial poderá ser incerta. A comissão recomendará:
Continuar.
Limitar.
Substituir.
Retirar imediatamente.
Assumir risco pode agravar o problema.
16.13 Queda de conexão
A partida continua. Ao reconectar, o usuário recebe os acontecimentos perdidos e o estado atual. Uma ação enviada tarde não será aplicada retroativamente.
16.14 Conclusão
O resultado em campo poderá permanecer provisório até a validação de eventos e regras. Correções oficiais serão excepcionais, justificadas e históricas.
17. Pós-jogo e consequências
17.1 Encerramento esportivo
Após a partida, o sistema deverá consolidar:
Resultado.
Eventos.
Estatísticas.
Minutos.
Cartões.
Lesões.
Fadiga.
Suspensões.
Moral.
Reputação.
Receitas e despesas da partida.
17.2 Resultado provisório e oficial
O resultado pode passar por validação antes de se tornar oficial. Enquanto houver inconsistência, interrupção ou revisão relevante, a interface deverá indicar que a partida ainda não foi homologada.
17.3 Consequências físicas
A partida poderá alterar:
Condição.
Fadiga.
Dor.
Lesão.
Necessidade de recuperação.
Disponibilidade futura.
A avaliação médica posterior pode mudar a estimativa inicial.
17.4 Consequências disciplinares
Cartões e ocorrências poderão gerar:
Suspensão automática.
Acúmulo.
Investigação.
Recurso.
Penalidade.
A aplicação dependerá do regulamento da competição.
17.5 Consequências emocionais
O pós-jogo poderá afetar:
Moral individual.
Confiança do grupo.
Relação com o usuário.
Torcida.
Diretoria.
Imprensa.
Rivalidade.
O efeito dependerá da expectativa. Uma derrota honrosa contra um favorito pode ter consequência diferente de uma derrota evitável contra adversário inferior.
17.6 Análise técnica
A comissão poderá apresentar:
O que funcionou.
O que falhou.
Impacto das mudanças.
Desempenho por setor.
Jogadores em destaque.
Riscos físicos.
Recomendações de treino.
A qualidade da análise depende dos profissionais e dos dados disponíveis.
17.7 Conversas pós-jogo
O usuário poderá:
Elogiar.
Cobrar.
Proteger.
Conversar individualmente.
Responder à imprensa.
Tratar incidentes.
A reação depende de personalidade, credibilidade e contexto.
17.8 Finanças da partida
Poderão ser registrados:
Bilheteria.
Hospitalidade.
Custos de operação.
Viagem.
Segurança.
Bônus.
Premiação.
Penalidades.
17.9 Atualização competitiva
Após oficialização, a partida poderá atualizar:
Classificação.
Chaves.
Critérios de desempate.
Artilharia.
Suspensões.
Qualificações.
Recordes.
17.10 Preparação seguinte
O pós-jogo deverá alimentar:
Recuperação.
Próximo treino.
Próxima escalação.
Avaliações médicas.
Análise do adversário.
Gestão de minutos.
18. Competições, calendário e organização esportiva
18.1 Estrutura das competições
O mundo poderá possuir:
Ligas.
Copas.
Torneios regionais.
Playoffs.
Competições juvenis.
Competições especiais previstas pelo mundo.
Cada competição terá definição permanente e edições por temporada.
18.2 Formação das competições
A quantidade de clubes e divisões será compatível com a população do mundo. A organização poderá utilizar:
Pirâmide de divisões.
Grupos regionais.
Acessos.
Rebaixamentos.
Playoffs.
Expansões.
18.3 Participação
Um clube participa por:
Divisão.
Classificação.
Título.
Vaga regional.
Convite regulamentar.
Expansão.
Resultado de playoff.
18.4 Regulamento
Cada edição deverá possuir regras claras sobre:
Formato.
Pontuação.
Critérios de desempate.
Inscrição.
Elegibilidade.
Suspensões.
Premiações.
Acessos.
Rebaixamentos.
Recursos.
Licenciamento.
18.5 Calendário
O calendário deverá considerar:
Quantidade de partidas.
Estádios.
Compartilhamentos.
Viagens.
Descanso mínimo.
Copas.
Clima.
Obras.
Segurança.
Transmissão.
Competições externas quando existirem.
18.6 Justiça do calendário
O sistema buscará equilíbrio estrutural, mas não garantirá sequências idênticas para todos. Poderão existir:
Jogos difíceis consecutivos.
Viagens longas.
Períodos com descanso mínimo permitido.
Sequências de mandos diferentes.
18.7 Alterações
Partidas poderão ser adiadas ou alteradas por:
Clima.
Segurança.
Estádio.
Competição.
Transmissão.
Manutenção.
Autoridade.
Mudanças deverão atualizar agenda, preparação, ingressos e logística.
18.8 Inscrições
A inscrição será separada do contrato. A competição poderá limitar:
Quantidade de jogadores.
Estrangeiros.
Jovens.
Formados localmente.
Goleiros.
Trocas durante a edição.
18.9 Licenciamento
A participação ou acesso poderá exigir:
Estrutura.
Finanças.
Documentação.
Estádio.
Categorias de formação.
Segurança.
Um clube pode conquistar acesso em campo e ainda depender da licença para confirmação.
18.10 Acesso e rebaixamento
Podem ocorrer por:
Posição.
Playoff.
Decisão administrativa.
Falha de licença.
Insolvência.
Desistência.
Reestruturação.
A razão deverá ser sempre exibida.
18.11 Recursos
Um recurso poderá contestar:
Elegibilidade.
Resultado.
Punição.
Inscrição.
Licença.
Decisão administrativa.
O regulamento definirá se o recurso suspende os efeitos.
18.12 Sorteios
Sorteios deverão respeitar:
Cabeças de chave.
Potes.
Região.
Restrições.
Compartilhamento de estádio.
Regras da competição.
O resultado não será refeito apenas por insatisfação.
18.13 Expansão
Expansões deverão ocorrer em momentos organizados, normalmente entre temporadas. Poderão alterar:
Número de clubes.
Divisões.
Grupos.
Vagas.
Acessos.
Rebaixamentos.
Mudanças não serão anunciadas depois de os resultados esportivos relevantes estarem definidos.
19. Mercado, observação e recrutamento
19.1 Mercado de pessoas únicas
Como cada jogador é único, a contratação de um atleta retira uma possibilidade real dos demais clubes. O mercado não será uma loja com cópias infinitas.
19.2 Informação imperfeita
O clube não conhecerá automaticamente:
Valor real.
Potencial.
Interesse.
Personalidade.
Condição médica completa.
Exigência salarial.
Disponibilidade.
Essas informações serão descobertas por observação, relações, consultas e negociações.
19.3 Necessidades de recrutamento
O clube poderá definir necessidades por:
Posição.
Função.
Idade.
Qualidade.
Potencial.
Custo.
Prazo.
Situação contratual.
Nacionalidade ou inscrição.
19.4 Missões de observação
Uma missão poderá focar:
Jogador específico.
Competição.
Região.
Faixa etária.
Função.
Contratos terminando.
Oportunidades de empréstimo.
19.5 Qualidade do relatório
Depende de:
Competência do olheiro.
Tempo.
Acesso.
Número de observações.
Contexto das partidas.
Especialidade.
Familiaridade regional.
19.6 Conteúdo do relatório
Poderá incluir:
Avaliação atual.
Potencial estimado.
Pontos fortes.
Fraquezas.
Funções.
Personalidade percebida.
Adaptação provável.
Situação contratual conhecida.
Faixa de valor.
Recomendação.
Confiança.
19.7 Relatórios contraditórios
Dois olheiros podem discordar. O clube deverá comparar:
Fonte.
Confiança.
Data.
Especialidade.
Observações.
A discordância não será resolvida revelando automaticamente a verdade.
19.8 Envelhecimento da informação
Relatórios perdem atualidade. Um jogador pode:
Evoluir.
Lesionar-se.
Mudar de função.
Assinar contrato.
Perder espaço.
Alterar interesse.
19.9 Lista de observação
A lista deverá permitir:
Prioridade.
Motivo.
Responsável.
Próxima ação.
Prazo.
Último relatório.
Situação de mercado.
19.10 Recrutamento
O processo compara candidatos por:
Adequação esportiva.
Custo total.
Risco.
Idade.
Potencial.
Disponibilidade.
Adaptação.
Impacto no grupo.
Inscrição.
19.11 Valores de mercado
O valor será influenciado por:
Qualidade percebida.
Idade.
Potencial percebido.
Contrato.
Demanda.
Oferta.
Divisão.
Reputação.
Posição.
Economia do mundo.
Não haverá um preço absoluto imutável.
19.12 Jogadores livres
Jogadores sem contrato poderão:
Reduzir exigências com o tempo.
Buscar divisões inferiores.
Aceitar testes.
Mudar de região.
Considerar aposentadoria.
19.13 Mercado de funcionários
Funcionários também serão únicos e disputados. Reputação, projeto, salário, função, estrutura e autonomia influenciam o interesse.
20. Transferências, empréstimos e contratos
20.1 Transferência como processo
Uma transferência poderá passar por:
Consulta.
Proposta.
Contraproposta.
Acordo entre clubes.
Negociação com jogador.
Exame.
Registro.
Pagamento.
Conclusão.
Mudar apenas o clube atual do jogador não é suficiente para representar a operação.
20.2 Tipos de movimentação
Poderão existir:
Transferência definitiva.
Empréstimo.
Jogador livre.
Pré-contrato.
Troca envolvendo jogadores, quando permitida.
Retorno de empréstimo.
Promoção interna.
20.3 Propostas
A proposta poderá conter:
Valor fixo.
Parcelas.
Bônus.
Percentual de venda futura.
Recompra.
Preferência.
Prazo.
Condições.
Contrapropostas não apagarão versões anteriores.
20.4 Capacidade financeira
Antes de enviar ou aceitar, o clube deverá considerar:
Orçamento.
Caixa.
Reserva.
Parcelas futuras.
Folha.
Bônus.
Comissões.
Registro.
20.5 Negociação com o jogador
O jogador poderá avaliar:
Salário.
Duração.
Papel.
Projeto.
Divisão.
Cidade.
Minutos.
Reputação.
Competições.
Relações.
Promessas.
20.6 Contrato
O contrato poderá conter:
Duração.
Salário.
Bônus.
Papel.
Opções.
Gatilhos.
Multas.
Redução por rebaixamento.
Aumento por acesso.
Promessas.
Direitos de saída.
20.7 Opções e gatilhos
Poderão existir:
Opção do clube.
Opção do jogador.
Opção mútua.
Renovação automática.
Gatilho por partidas.
Gatilho por acesso.
Gatilho por permanência.
Cada opção terá prazo e regra para ausência de resposta.
20.8 Exame médico
O exame poderá:
Aprovar.
Aprovar com risco.
Solicitar avaliação adicional.
Reprovar.
Alterar termos.
O exame não revela necessariamente todo o histórico médico ao clube comprador sem as permissões aplicáveis.
20.9 Registro
Um acordo pode estar assinado e ainda depender de:
Janela.
Inscrição.
Vaga.
Licença.
Documentação.
Limites da competição.
20.10 Conclusão e falha
Uma negociação poderá falhar por:
Prazo.
Rejeição.
Contrato.
Exame.
Registro.
Falta de recursos.
Mudança de interesse.
Regra competitiva.
Etapas concluídas e compromissos deverão ser tratados conforme os acordos, sem desaparecer silenciosamente.
20.11 Empréstimos
O empréstimo definirá:
Duração.
Salário compartilhado.
Taxa.
Uso esperado.
Opção de compra.
Obrigação de compra.
Retorno.
Restrições.
Responsabilidade médica.
20.12 Uso prometido
Prometer minutos em empréstimo poderá influenciar a aceitação. O descumprimento afeta relações, reputação e futuras negociações, respeitando lesões e contexto.
20.13 Opção e obrigação de compra
A opção depende de exercício válido. A obrigação é acionada quando as condições são cumpridas. Falta de caixa não apaga uma obrigação já ativada.
20.14 Retorno
Ao fim do empréstimo, o jogador retorna ao clube de origem, salvo:
Compra.
Prorrogação.
Novo empréstimo.
Rescisão.
Cláusula específica.
Lesões, suspensões e tratamento continuam.
20.15 Rescisão
A rescisão poderá ser:
Acordada.
Unilateral quando permitida.
Por cláusula.
Por inadimplência.
Por aposentadoria.
Por decisão disciplinar.
Poderá gerar compensação e impacto financeiro.
20.16 Contratos de funcionários
Seguirão princípios equivalentes de:
Duração.
Salário.
Função.
Responsabilidade.
Bônus.
Renovação.
Rescisão.
Aposentadoria.
21. Final de temporada e transição entre temporadas
21.1 Final de competição e final de temporada
Uma competição pode encerrar antes da temporada administrativa. A temporada somente será fechada quando todos os processos obrigatórios estiverem prontos.
21.2 Homologação
Uma competição somente será homologada quando:
Partidas obrigatórias estiverem concluídas.
Resultados pendentes forem resolvidos.
Recursos relevantes forem tratados.
Punições forem aplicadas.
Critérios de desempate forem calculados.
Classificação estiver consistente.
21.3 Títulos provisórios e oficiais
O jogo poderá celebrar um campeão em campo, mas o registro histórico oficial aguarda homologação.
21.4 Correções
Antes da homologação, uma correção pode alterar tabela, prêmio e classificação. Depois da homologação, a mudança será excepcional e deverá:
Reabrir formalmente o processo necessário.
Criar nova versão.
Preservar a anterior.
Recalcular consequências.
Comunicar os afetados.
21.5 Acessos e rebaixamentos
A posição esportiva poderá depender de licença, recursos e decisões administrativas antes da confirmação final.
21.6 Prêmios
Poderão existir:
Campeão e vice.
Artilheiro.
Líder de assistências.
Melhor jogador.
Melhor goleiro.
Melhor jovem.
Melhor técnico.
Seleção da temporada.
Fair play.
Prêmios objetivos e subjetivos terão critérios próprios.
21.7 Premiações financeiras
A competição poderá gerar:
Recebimentos imediatos.
Parcelas.
Valores retidos.
Compensações de dívida.
Bônus contratuais.
21.8 Revisão do clube
A diretoria avaliará:
Objetivos.
Esporte.
Finanças.
Elenco.
Funcionários.
Estrutura.
Comercial.
Torcida.
Gestão.
O período anterior à entrada do usuário será separado de sua gestão.
21.9 Novo orçamento
O orçamento seguinte considerará:
Divisão.
Competições.
Receita prevista.
Contratos.
Folha.
Dívidas.
Obras.
Reservas.
Cenários de acesso ou rebaixamento.
21.10 Transição contratual
Serão processados:
Expirações.
Renovações.
Opções.
Gatilhos.
Aumentos.
Reduções.
Retornos de empréstimo.
Transferências futuras.
A virada da temporada não encerra todos os contratos na mesma data.
21.11 Desenvolvimento e idade
O progresso será consolidado pelo que ocorreu durante a temporada. Não haverá aumento genérico para todos.
A idade civil muda no aniversário.
21.12 Descanso
Fadiga não será zerada. O descanso dependerá de:
Minutos.
Competições.
Lesões.
Viagens.
Idade.
Seleções quando existirem.
21.13 Aposentadorias
Serão confirmadas no momento adequado, respeitando anúncios, adiamentos, contratos e decisões médicas.
21.14 População de jogadores
Após aposentadorias e mudanças de elenco, o mundo calculará a necessidade de novos jogadores, preservando:
Distribuição de idade.
Posições.
Qualidade.
Quantidade.
Sustentabilidade econômica.
21.15 Formação da nova temporada
A composição considerará:
Acessos.
Rebaixamentos.
Licenças.
Expansões.
Extinções.
Sanções.
Vagas.
21.16 Calendário seguinte
Somente será publicado após validação de participantes, estádios, restrições e descansos.
21.17 Pré-temporada
A pré-temporada incluirá:
Descanso.
Retorno.
Testes físicos.
Condicionamento.
Treino tático.
Amistosos.
Turnês.
Integração.
Mercado.
Inscrições.
Uma pré-temporada curta reduz preparação e familiaridade.
21.18 Ausência durante a transição
A inteligência do clube poderá processar efeitos automáticos, mas não deverá assumir grandes dívidas, vender jogadores-chave ou alterar a identidade sem autoridade.
22. História, recordes, estatísticas e memória do mundo
22.1 Memória permanente
A história incluirá:
Temporadas.
Competições.
Clubes.
Pessoas.
Partidas.
Transferências.
Títulos.
Acessos.
Rebaixamentos.
Obras.
Crises.
Governança.
Economia.
Rivalidades.
22.2 Fato, estatística e narrativa
O jogo diferenciará:
Fato oficial.
Fato provisório.
Estatística.
Recorde.
Narrativa.
Opinião.
Correção.
22.3 Livro da temporada
Cada temporada encerrada terá um resumo completo com:
Campeões.
Classificações.
Prêmios.
Artilheiros.
Transferências.
Recordes.
Economia.
Clubes criados ou encerrados.
Mudanças de regras.
Eventos marcantes.
22.4 Linha do tempo do clube
Poderá mostrar:
Fundação.
Identidades.
Divisões.
Títulos.
Estádios.
Controladores.
Jogadores.
Funcionários.
Crises.
Obras.
Rivalidades.
22.5 Carreira de pessoas
Jogadores e funcionários terão trajetória completa. Mudanças posteriores não reescrevem o papel exercido no passado.
22.6 Estatísticas desconhecidas
Dados não coletados serão mostrados como indisponíveis, não como zero.
22.7 Métricas versionadas
Quando uma fórmula mudar, a versão antiga permanece identificada. Comparações deverão indicar diferenças de metodologia.
22.8 Recordes
Cada recorde possuirá:
Definição.
Escopo.
Métrica.
Elegibilidade.
Política de empate.
Detentor.
Contexto.
Estado oficial.
22.9 Recordes compartilhados
Empates poderão gerar recordes compartilhados conforme a regra. Igualar e quebrar serão acontecimentos diferentes.
22.10 Recordes anulados
Uma partida anulada ou correção poderá retirar um recorde. O histórico preservará:
Ocorrência original.
Motivo.
Data.
Novo detentor.
22.11 Comparação entre eras
A interface deverá contextualizar diferenças de:
Formato.
Número de jogos.
Sistema de pontos.
Economia.
Medicina.
Treinamento.
Quantidade de clubes.
Valores normalizados não substituirão os números oficiais.
22.12 Ídolos e reconhecimento
O reconhecimento poderá considerar:
Tempo.
Títulos.
Desempenho.
Formação.
Liderança.
Lealdade.
Momentos decisivos.
Relação com torcida.
Diferentes grupos podem discordar sobre uma figura histórica.
22.13 Rivalidades
Rivalidades poderão surgir por:
Proximidade.
História.
Finais.
Acessos.
Rebaixamentos.
Disputas recorrentes.
Transferências.
Torcidas.
A intensidade cresce, diminui ou fica adormecida, sem apagar a memória.
22.14 Correção histórica
Toda correção deverá:
Identificar o problema.
Preservar a versão anterior.
Explicar o motivo.
Recalcular estatísticas, recordes e rankings afetados.
Evitar duplicidade.
22.15 Privacidade histórica
A história não exibirá automaticamente:
Dados pessoais.
Informações médicas confidenciais.
Mensagens privadas.
Evidências protegidas.
Estratégias secretas.
Atributos ocultos.
A conta de um usuário pode ser anonimizada sem apagar resultados e fatos competitivos.
23. Notificações, delegações e automações
23.1 Canais
Informações relevantes existirão sempre dentro do jogo. Push e e-mail serão complementares.
23.2 Agrupamento
Atualizações do mesmo assunto serão agrupadas, mas nenhuma ação crítica ou prazo ficará escondido.
23.3 Resumos
Poderão existir resumos:
Diários.
Semanais.
De partida.
De mercado.
Financeiros.
De transição.
De retorno.
Todo resumo informará o período coberto.
23.4 Silêncio e frequência
O usuário poderá limitar horários e frequência de avisos externos. Alertas de segurança, sanções e obrigações essenciais não poderão ser totalmente ocultados.
23.5 Delegação
Uma tarefa poderá ser atribuída a um funcionário para:
Preparar.
Recomendar.
Executar dentro de limite.
Monitorar.
23.6 Automação
Uma automação deverá possuir:
Gatilho.
Condições.
Ação.
Limites.
Prazo de validade.
Política de falha.
Responsável.
23.7 Níveis de automação
Poderá:
Apenas avisar.
Recomendar.
Preparar rascunho.
Executar ação de baixo risco.
Executar dentro de limites.
Delegar uma área operacional.
23.8 Ações de alto risco
Continuarão manuais ou exigirão aprovação reforçada:
Venda de jogador-chave.
Compra de alto valor.
Financiamento.
Grande obra.
Rescisão cara.
Contrato comercial estratégico.
Mudança de identidade.
Transferência de controle.
23.9 Validação no momento da execução
A regra será reavaliada quando disparar. Poderá falhar porque:
O orçamento mudou.
A autonomia foi reduzida.
O jogador saiu.
O prazo terminou.
O regulamento mudou.
O funcionário ficou indisponível.
23.10 Conflitos
Quando duas regras ordenarem ações incompatíveis:
Regras obrigatórias prevalecem.
Políticas institucionais limitam regras pessoais.
Regras específicas podem prevalecer sobre gerais.
Ações irreversíveis ambíguas serão bloqueadas para decisão manual.
23.11 Proteção contra repetição
Uma automação não poderá:
Executar a mesma ação duas vezes.
Criar ciclo infinito.
Gastar acima do limite.
Gerar lote descontrolado.
Ampliar sua própria autoridade.
23.12 Histórico
O usuário poderá revisar:
Regra utilizada.
Versão.
Gatilho.
Condições.
Ações.
Custos.
Falhas.
Responsáveis.
Aprovações.
23.13 Mudança de controlador
Automações pessoais do antigo controlador serão desativadas. Regras institucionais continuarão.
24. Integridade competitiva, privacidade, segurança e moderação
24.1 Integridade
Resultados, contratos, finanças, inscrições e propriedades de jogadores não poderão ser alterados por ações informais ou ocultas.
Toda correção relevante deverá possuir:
Motivo.
Autoridade.
Histórico.
Versão anterior.
Consequências.
Comunicação quando necessária.
24.2 Igualdade de regras
Clubes de usuários e clubes controlados pelo jogo seguem:
Mesma economia.
Mesmas regras de inscrição.
Mesmas limitações de contrato.
Mesmas regras de partida.
Mesmas consequências financeiras.
A inteligência do jogo não receberá conhecimento secreto indevido nem recursos artificiais.
24.3 Ações inválidas
O jogo deverá impedir:
Duplicação de pagamento.
Dois contratos principais incompatíveis.
Dois clubes possuírem o mesmo jogador.
Duas inscrições idênticas.
Duas decisões oficiais concorrentes.
Repetição de premiação.
Reprocessamento que duplique eventos.
24.4 Correções
Erros de apresentação podem ser corrigidos sem alterar fatos. Erros de fatos oficiais exigem processo reforçado.
Uma transferência inválida não será corrigida apenas movendo o jogador. O processo deverá tratar:
Contratos.
Valores.
Parcelas.
Inscrições.
Partidas.
Estatísticas.
Relações.
24.5 Privacidade
Serão protegidos:
Dados de conta.
Mensagens privadas.
Estratégias.
Relatórios de observação.
Diagnósticos médicos.
Contratos confidenciais.
Evidências de moderação.
24.6 Informação pública e privada
O jogo distinguirá:
Informação pública.
Informação interna do clube.
Informação confidencial.
Informação restrita.
A passagem do tempo não torna automaticamente todos os dados públicos.
24.7 Moderação
Canais sociais e interações entre usuários deverão possuir:
Regras.
Denúncia.
Investigação.
Sanção.
Recurso.
Proteção de evidências.
24.8 Sanções competitivas e sociais
Uma sanção social ou de conta não deve alterar resultados esportivos sem processo competitivo correspondente. Quando a retirada de um usuário afetar o controle do clube, o clube continua existindo e recebe uma política de continuidade.
24.9 Anonimização
Quando a conta for excluída ou anonimizada:
O nome pessoal poderá ser removido.
O período de controle continuará no histórico de forma anônima.
Partidas, contratos e resultados permanecem.
Mensagens e dados pessoais seguem a política de retenção.
24.10 Segurança de decisões
Ações irreversíveis deverão exigir revisão suficiente para evitar toque acidental, versão desatualizada ou falta de autoridade.
25. Experiência de uso e fluxos integrados
25.1 Princípios de experiência
A experiência será orientada por contexto. O usuário deverá conseguir responder rapidamente:
O que mudou?
O que exige ação?
Qual é o prazo?
Quem está responsável?
Qual é a recomendação?
Qual é a consequência de não agir?
A interface priorizará dispositivos móveis, com aprofundamento progressivo.
25.2 Navegação principal
As áreas centrais deverão permitir acesso a:
Central.
Agenda.
Clube.
Elenco.
Tática.
Partidas.
Competições.
Mercado.
Finanças.
Estrutura.
Funcionários.
História.
25.3 Painéis contextuais
Cada tela deverá apresentar apenas indicadores relevantes ao assunto.
Exemplos:
Perfil do jogador: condição, contrato, papel, moral, desenvolvimento e conhecimento.
Negociação: termos, orçamento, prazo, risco e responsáveis.
Partida: estado, opções, alertas e consequências.
Finanças: caixa, compromissos, orçamento e projeção.
25.4 Estados vazios
Quando não houver conteúdo, a interface deverá explicar:
O que aquele sistema representa.
Por que está vazio.
Qual próxima ação é possível.
25.5 Erros parciais
Falha em uma área não deverá esconder sistemas que continuam disponíveis. A interface deverá dizer:
O que está indisponível.
O que continua funcionando.
Se ações foram bloqueadas por segurança.
25.6 Informação desatualizada
Quando uma projeção ou conexão estiver atrasada, a interface mostrará a última atualização. Ações críticas serão revalidadas antes de confirmar.
25.7 Fluxo de criação e entrada em clube
O usuário escolhe um mundo.
O jogo verifica elegibilidade e vagas.
São apresentados clubes disponíveis ou processos de expansão.
O usuário consulta o estado inicial.
Uma vaga pode ser reservada por prazo curto.
O controle é ativado na data válida.
O usuário recebe revisão inicial, autoridade e objetivos.
Pendências e políticas herdadas são apresentadas.
25.8 Fluxo semanal de gestão
O usuário abre a Central.
Revisa urgências e agenda.
Avalia condição do elenco.
Ajusta treino e recuperação.
Trata contratos e mercado.
Revisa finanças e estrutura quando necessário.
Prepara a próxima partida.
Define escalação e políticas offline.
Acompanha ou recebe o resultado.
Processa consequências do pós-jogo.
25.9 Fluxo de preparação e partida
A partida entra na agenda.
A comissão prepara o dossiê.
O usuário analisa adversário e elenco.
Treinos específicos são definidos.
Logística e estado médico são confirmados.
A escalação é preparada.
O jogo valida elegibilidade.
A partida começa.
Eventos e pontos de decisão são apresentados.
O usuário ou a inteligência autorizada intervém.
O resultado é consolidado.
O pós-jogo alimenta os sistemas seguintes.
25.10 Fluxo de contratação de jogador
O clube identifica uma necessidade.
Cria missão de observação.
Recebe relatórios com confiança e incerteza.
Compara candidatos.
Consulta disponibilidade.
Envia proposta ao clube ou jogador.
Negocia termos esportivos e financeiros.
Reserva recursos.
Negocia contrato pessoal.
Realiza exame.
Valida inscrição e regras.
Conclui pagamentos e vínculo.
Integra o jogador ao elenco.
25.11 Fluxo de venda
Chega uma consulta ou proposta.
O clube avalia valor, papel e reposição.
Funcionários apresentam recomendação.
O usuário aceita, rejeita ou contrapropõe.
O jogador avalia o destino quando necessário.
O acordo é formalizado.
Registro, contrato e pagamentos são processados.
A saída afeta elenco, torcida, finanças e história.
25.12 Fluxo de empréstimo
Clube de origem e destino negociam duração, salário e uso.
O jogador aceita o projeto.
Regras de inscrição são validadas.
O jogador atua pelo destino, mantendo vínculo com a origem.
Minutos, condição e promessas são acompanhados.
Opção ou obrigação pode ser ativada.
Ao fim, ocorre compra, prorrogação ou retorno.
25.13 Fluxo de lesão
O evento ocorre em treino, partida ou contexto permitido.
Surge avaliação inicial.
Exames refinam diagnóstico e prazo.
O clube escolhe tratamento dentro das recomendações.
O jogador entra em reabilitação.
Restrições são reduzidas progressivamente.
A comissão avalia retorno ao treino.
A medicina avalia retorno competitivo.
O usuário administra minutos e risco.
25.14 Fluxo financeiro mensal
O clube recebe receitas e reconhece valores devidos.
Obrigações e parcelas entram na agenda.
Folha e custos são processados.
Reservas e orçamentos são atualizados.
A projeção de caixa é recalculada.
Riscos e desvios são apresentados.
A diretoria pode exigir correção.
O usuário ajusta gastos, vendas, crédito ou projetos.
25.15 Fluxo de infraestrutura
Surge uma necessidade.
O clube avalia capacidade, custo e impacto.
Realiza estudo de viabilidade.
Busca aprovação e financiamento.
Contrata fornecedor.
Programa obra e instalações alternativas.
Acompanha marcos, custo e atraso.
Realiza inspeção e licenciamento.
A instalação entra em operação.
Manutenção e deterioração passam a ser acompanhadas.
25.16 Fluxo de crise esportiva
Resultados ficam abaixo da expectativa.
Moral, torcida e imprensa reagem.
A diretoria revisa objetivos e confiança.
A comissão identifica causas.
O usuário pode ajustar tática, elenco, treino e comunicação.
Se a crise continuar, a diretoria pode reduzir autonomia ou exigir plano.
O usuário permanece no clube e conduz a recuperação.
25.17 Fluxo de crise financeira
Projeção indica falta de caixa ou descumprimento futuro.
O financeiro alerta prazos e obrigações.
Gastos discricionários podem ser congelados.
O usuário avalia vendas, renegociação, crédito ou cortes.
A diretoria aprova ou impõe medidas.
A inadimplência pode gerar sanções e perda de confiança.
Em insolvência, o clube entra em reestruturação sem remover o usuário.
25.18 Fluxo de final de temporada
Competições terminam suas partidas.
Recursos e pendências são resolvidos.
Resultados são homologados.
Acessos, rebaixamentos e títulos são confirmados.
Premiações e bônus são registrados.
Objetivos e gestão são avaliados.
Contratos, opções e empréstimos são processados.
Aposentadorias e população de jogadores são tratadas.
A economia do mundo é revisada.
A nova composição competitiva é formada.
O calendário é validado.
A pré-temporada é aberta.
25.19 Fluxo de retorno após ausência longa
O jogo identifica o período de ausência.
Consolida mudanças do mundo.
Consolida mudanças do clube.
Separa decisões automáticas e prazos perdidos.
Apresenta situação atual.
Lista ações urgentes.
Sugere uma ordem de recuperação e planejamento.
26. Regras transversais de consistência
26.1 Fonte única por assunto
Cada informação terá um sistema responsável.
Exemplos:
O contrato é a fonte do vínculo contratual.
A inscrição é a fonte da elegibilidade competitiva.
O sistema médico é a fonte das restrições de saúde.
O razão financeiro é a fonte dos valores contábeis.
A competição é a fonte da classificação oficial.
A notificação apenas representa o assunto.
26.2 Continuidade histórica
Nenhuma troca de temporada, controlador, nome ou divisão apaga:
Dívida.
Lesão.
Contrato.
Suspensão.
Promessa.
Obra.
Relação.
Reputação.
Histórico.
26.3 Separação de conceitos
As seguintes distinções são obrigatórias:
Clube e controlador.
Pessoa e carreira.
Contrato e inscrição.
Elenco e propriedade esportiva.
Caixa e orçamento.
Resultado em campo e resultado oficial.
Fato e narrativa.
Notificação e tarefa.
Recomendação e decisão.
Estrutura e funcionário.
Potencial e desenvolvimento realizado.
Informação real e conhecimento do clube.
26.4 Regras comuns
Usuários e inteligência do jogo seguem as mesmas regras. A diferença estará na qualidade das decisões, não na possibilidade de ignorar orçamento, contrato ou regulamento.
26.5 Não duplicação
O jogo deverá impedir repetição de:
Pagamentos.
Transferências.
Premiações.
Títulos.
Aposentadorias.
Geração de jogadores.
Partidas.
Contratos.
Ações automáticas.
26.6 Correções transparentes
Toda correção relevante preserva:
Estado anterior.
Motivo.
Data.
Autoridade.
Efeitos recalculados.
26.7 Informação incompleta
Quando um dado for desconhecido, o jogo deverá indicar incerteza. Não poderá substituir desconhecido por zero, certeza ou valor inventado.
26.8 Consequências proporcionais
Decisões não devem gerar bônus ou punições desconectadas. As consequências serão derivadas de:
Contexto.
Intensidade.
Duração.
Repetição.
Reputação.
Capacidade do clube.
Regras oficiais.
26.9 Sem vantagem oculta
O jogo não deverá conceder vantagens secretas por:
Ser usuário novo.
Ser clube controlado pelo jogo.
Estar offline.
Possuir interface diferente.
Participar de teste técnico.
A entrada tardia recebe viabilidade, não equiparação artificial.
26.10 Ausência e responsabilidade
A ausência não interrompe o mundo. Ao mesmo tempo, o sistema deve permitir:
Políticas.
Delegações.
Limites.
Alertas.
Resumos.
Grandes decisões não autorizadas devem permanecer pendentes quando possível.
26.11 Qualidade de profissionais
A competência de funcionários influencia:
Precisão.
Profundidade.
Tempo.
Recomendação.
Negociação.
Prevenção.
Identificação de riscos.
Não influencia a validade das regras nem permite violá-las.
26.12 Escopo integral
Os sistemas descritos são interdependentes. O jogo não deverá tratar mercado, partida, finanças, estrutura, torcida ou desenvolvimento como minijogos isolados sem consequência nos demais módulos.
27. Decisões pendentes, limites e pontos ainda não fechados
Esta seção reúne somente assuntos que não receberam decisão final suficiente ou que permanecem dependentes de definição futura. Não altera as regras já consolidadas.
27.1 Nome definitivo do jogo
O nome comercial ainda não foi formalmente encerrado. Entre os nomes explorados, “Grinta” recebeu avaliação positiva, mas não houve confirmação final acompanhada de verificação jurídica, disponibilidade de marca e domínio.
27.2 Título formal do papel do usuário
A função está definida: o usuário controla a gestão do clube, não é demitido e pode sofrer restrições da diretoria. Permanece pendente o nome apresentado na interface, como treinador, manager, gestor, dirigente ou outro título próprio do jogo.
27.3 Seleções e competições entre seleções
Convocações foram reconhecidas como eventos externos possíveis que afetam disponibilidade, fadiga, reputação e lesões. Ainda falta fechar o escopo completo de seleções, competições internacionais, elegibilidade e controle dessas equipes.
27.4 Escopo social entre usuários
Foram estabelecidas necessidades de canais, privacidade, moderação, denúncias e identificação de mensagens automáticas. Permanecem pendentes os formatos definitivos de amizade, grupos, federações de usuários, negociação direta por conversa e recursos sociais públicos.
27.5 Monetização comercial do produto
A economia fictícia do clube está definida e será separada de dinheiro real. Não foi encerrado o modelo comercial externo do produto, incluindo assinatura, itens cosméticos, planos ou outras formas de receita da plataforma.
27.6 Propriedade intelectual e conteúdo licenciado
O mundo foi planejado para clubes, jogadores e competições próprios. A utilização futura de nomes, escudos, atletas ou campeonatos reais dependerá de decisão de produto e licenciamento.
27.7 Direção artística, áudio e apresentação visual
A experiência funcional mobile-first está definida. Ainda faltam decisões finais sobre identidade visual, estilo gráfico, animações, narração, áudio de partidas e nível de representação visual do estádio e dos jogadores.
27.8 Ritmo numérico final do mundo
O tempo oficial, a persistência e os prazos estão definidos. Os valores exatos de duração de dia, semana, temporada, partidas e janelas deverão ser calibrados em testes de equilíbrio sem alterar os princípios funcionais deste documento.
27.9 Quantidades iniciais de conteúdo
O modelo completo de clubes, jogadores, funcionários, competições e divisões está definido. As quantidades iniciais por mundo deverão ser calculadas de acordo com capacidade, ritmo e testes econômicos.
27.10 Contradições identificadas
Não foi identificada contradição funcional insolúvel entre as decisões aprovadas. Os aparentes conflitos foram consolidados da seguinte forma:
O usuário controla o clube, mas não possui poder institucional absoluto.
O usuário nunca é demitido, mas pode perder autonomia e operar sob intervenção.
Clubes novos recebem condições viáveis, mas não são equiparados artificialmente a potências históricas.
Funcionários melhores oferecem decisões melhores, mas não alteram as regras fundamentais do jogo.
A inteligência do jogo pode agir durante a ausência, mas grandes decisões dependem de autoridade prévia.
A história pode ser corrigida, mas a versão anterior nunca é apagada.
O resultado em campo pode ser celebrado imediatamente, mas o registro oficial depende de homologação.
Encerramento
O escopo consolidado define um jogo de futebol persistente, sistêmico e historicamente contínuo. O núcleo da experiência não se limita a vencer partidas: consiste em construir uma instituição ao longo de temporadas, convivendo com pessoas únicas, recursos limitados, decisões imperfeitas, competição entre usuários, consequências econômicas e memória permanente.
O clube deverá ser compreendido como um organismo composto por esporte, pessoas, estrutura, finanças, torcida, governança e história. Nenhum desses sistemas funciona isoladamente. O valor do jogo nasce da interação entre eles e da capacidade de cada mundo produzir trajetórias que não poderiam ser repetidas exatamente em outro.

