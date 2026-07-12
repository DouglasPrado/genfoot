# Estádio, Região e Clima

> **Status:** Rascunho consolidado · **Fontes:** chats/decisao-escopo-do-jogo.md · **Revisão:** 2026-07-10

O estádio no **Grinta** é tratado como um ativo com vida própria — esportivo, financeiro e emocional — e não como um mero número de capacidade. Este documento consolida as decisões sobre o estádio como entidade, sua economia (bilheteria, custos, preço de ingresso), qualidade estrutural e manutenção, upgrades por obras, licenciamento e interdição, gramado e dimensão do campo, o mecanismo de mando de campo e — a partir da seção 10 — a **região/localização do clube**, a **logística e viagens** e o **clima** e seu impacto em partida e gramado. As decisões de origem (IDs 1801–1873) são citadas ao lado de cada regra.

## Sumário

1. [Filosofia e entidade do estádio](#1-filosofia-e-entidade-do-estádio)
2. [Capacidade, ocupação e economia](#2-capacidade-ocupação-e-economia)
3. [Qualidade, manutenção e deterioração](#3-qualidade-manutenção-e-deterioração)
4. [Upgrades e obras](#4-upgrades-e-obras)
5. [Dimensionamento: grande e pequeno demais](#5-dimensionamento-grande-e-pequeno-demais)
6. [Licenciamento, interdição e campo alternativo](#6-licenciamento-interdição-e-campo-alternativo)
7. [Estádio próprio vs. alugado](#7-estádio-próprio-vs-alugado)
8. [Gramado e dimensão do campo](#8-gramado-e-dimensão-do-campo)
9. [Mando de campo](#9-mando-de-campo)
10. [Região e localização do clube](#10-região-e-localização-do-clube)
11. [Logística e viagens](#11-logística-e-viagens)
12. [Clima](#12-clima)
13. [Segurança, punições e valor comercial do estádio](#13-segurança-punições-e-valor-comercial-do-estádio)
14. [Pendências](#14-pendências)

---

## 1. Filosofia e entidade do estádio

**O estádio é um ativo esportivo, financeiro e emocional** (Decisão 1801). Ele não deve ser apenas um número de capacidade: impacta bilheteria, mando de campo, torcida, manutenção, identidade, licenciamento, calendário, obras, gramado, eventos e reputação do clube.

**O estádio é uma entidade separada do clube** (Decisão 1802). Isso é o que viabiliza mecânicas de obra, interdição e campo alternativo. Como entidade própria, o estádio carrega os seguintes atributos:

| Atributo | Descrição |
| --- | --- |
| Nome | Identificação do estádio |
| Localização | Onde está situado |
| Capacidade | Lotação máxima |
| Condição estrutural | Estado físico atual |
| Qualidade do gramado | Estado do campo |
| Custo de manutenção | Despesa recorrente |
| Nível de conforto | Experiência do torcedor |
| Nível comercial | Potencial de patrocínio/eventos |
| Status operacional | Ativo, em obra, interditado etc. |
| Histórico de obras | Registro de intervenções |
| Dono/uso | Reservado para uso futuro (próprio vs. alugado) |

---

## 2. Capacidade, ocupação e economia

### Capacidade limita receita e presença

**A capacidade limita a receita e a presença da torcida** (Decisão 1803).

| Cenário | Efeitos |
| --- | --- |
| Capacidade baixa | Reduz bilheteria máxima; aumenta pressão por expansão; pode gerar estádio lotado; melhora atmosfera em jogos menores |
| Capacidade alta | Aumenta o potencial de receita; aumenta a manutenção; pode gerar estádio vazio se a torcida for pequena |

### Setores do estádio

O estádio não é só uma capacidade agregada: ele é dividido em **setores** (def-simulador §7.4), cada um com **capacidade, preço de ingresso e ocupação próprios**. Isso permite políticas de preço por setor (arquibancada, cadeiras, camarotes, visitante) e influencia bilheteria, hospitalidade e atmosfera de forma diferenciada. O estádio ainda considera, além dos setores: **capacidade autorizada** (a licenciada pode ser menor que a física — ver §6), condição do gramado, segurança, acessos, hospitalidade, iluminação, vestiários, comunicação e operação em dias de partida.

> **Recomendação (a ratificar — R-89):** setores-padrão do estádio, capacidades relativas e preço por setor — proposta de 1ª passada (ex.: Arquibancada/Cadeira/Camarote/Visitante com multiplicadores de preço 1.0/1.8/4.0/0.9), a calibrar.

### Ocupação depende de demanda, preço e contexto

**A ocupação não é fixa** (Decisão 1804): resulta de demanda, preço e contexto. Fatores considerados: tamanho da torcida, fase do time, rivalidade, competição, horário, clima, preço do ingresso, conforto, segurança, campanha, jogadores populares e objetivo da temporada.

### Preço de ingresso é decisão estratégica

**O preço do ingresso é uma decisão estratégica do usuário** (Decisão 1805), com trade-offs claros:

| Preço | Efeitos |
| --- | --- |
| Alto | Aumenta receita por pessoa; pode reduzir público; irrita a torcida popular; afeta sócios |
| Baixo | Aumenta ocupação; melhora o ambiente; reduz receita unitária; útil em jogo decisivo |

### Bilheteria no ledger

**A receita de bilheteria entra no ledger financeiro** (Decisão 1806). O cálculo considera público pagante, preço médio, ocupação, competição, divisão, custos operacionais, divisão de renda (em copa/final) e punições ou campo neutro.

### Jogo em casa também gera custo

**Todo jogo em casa gera custo operacional** (Decisão 1807) — evitando que o mando seja lucro bruto simples. Custos: operação do estádio, segurança, limpeza, equipe, iluminação, gramado, logística, taxas da competição e manutenção pós-jogo.

> Nota de ligação: o detalhamento de como bilheteria (receita) e custos operacionais entram no balanço do clube está em [`./03-economia.md`](./03-economia.md).

---

## 3. Qualidade, manutenção e deterioração

### Qualidade estrutural

**O estádio tem qualidade estrutural** (Decisão 1808), que afeta conforto, ocupação, licenciamento, custo de manutenção, patrocinadores, eventos, imagem do clube e risco de interdição.

### Manutenção recorrente obrigatória

**A manutenção é um custo recorrente obrigatório** (Decisão 1809):

| Manutenção paga | Manutenção negligenciada |
| --- | --- |
| Estrutura se preserva | Condição cai |
| Gramado melhora ou estabiliza | Custos futuros sobem |
| Risco de interdição cai | Torcida reclama; risco de punição/interdição aumenta |

### Deterioração por tempo e uso

**O estádio deteriora com tempo e uso** (Decisão 1810), criando necessidade de investimento contínuo. A deterioração depende de idade, número de jogos, clima, manutenção, obras anteriores, qualidade base e eventos extras.

---

## 4. Upgrades e obras

**O estádio evolui por projetos de obra** (Decisão 1811). Cada obra tem custo, tempo e risco. Obras possíveis: expansão de capacidade, melhoria de conforto, melhoria comercial, reforma estrutural, melhoria do gramado, iluminação, segurança, acessos/logística e modernização geral.

**Obras não são instantâneas** (Decisão 1812): levam tempo e afetam a operação. Durante uma obra pode haver capacidade reduzida, custo recorrente, risco de atraso, queda de conforto, jogos em campo alternativo e irritação ou expectativa da torcida.

**Expandir capacidade só compensa com demanda** (Decisão 1813):

| Expandir cedo demais | Expandir tarde demais |
| --- | --- |
| Manutenção sobe | Clube perde receita |
| Estádio fica vazio | Torcida fica sem ingresso |
| Dívida aumenta | Crescimento trava |
| Retorno demora | — |

---

## 5. Dimensionamento: grande e pequeno demais

**O estádio superdimensionado vira peso financeiro** (Decisão 1814), o que evita expansão automática sem planejamento. Problemas: custo alto, baixa ocupação, ambiente frio, manutenção cara e pressão por resultados.

**O estádio pequeno demais limita o crescimento** (Decisão 1815). Problemas: bilheteria limitada, sócios frustrados, licenciamento pode travar, jogos grandes perdem receita e patrocinador paga menos.

---

## 6. Licenciamento, interdição e campo alternativo

### Padrão mínimo por divisão

**Competições e divisões podem exigir um padrão mínimo de estádio** (Decisão 1816). Critérios possíveis: capacidade mínima, segurança, iluminação, gramado, vestiários, transmissão, acessibilidade abstrata e condição estrutural. Se o clube falhar, ele entra em plano de adequação ou joga em campo alternativo.

### Interdição

**O estádio pode ser interditado em casos graves** (Decisão 1817). Motivos: manutenção crítica, segurança, gramado impraticável, punição disciplinar, obra, evento climático e licenciamento não cumprido. A interdição gera custo, perda de mando e crise com a torcida.

### Campo alternativo e aluguel

**O clube pode mandar jogos em campo alternativo** (Decisão 1818), por obra, interdição, punição, final neutra, clima ou exigência da competição. Impactos: menor mando, receita diferente, torcida deslocada, custo logístico e comunicação necessária.

**O campo alternativo pode ter custo de aluguel** (Decisão 1819): o clube paga aluguel, operação, logística extra e possível divisão de renda. Pode ser necessário, mas reduz margem.

---

## 7. Estádio próprio vs. alugado

**A modelagem deve suportar estádio próprio e alugado** (Decisão 1820). No core o modelo pode começar simples, mas o schema deve permitir ambos.

| Estádio próprio | Estádio alugado |
| --- | --- |
| Mais controle | Menos investimento inicial |
| Mais custo | Menos controle |
| Mais ativo | Custo por jogo |
| Obras próprias | Restrições de calendário |

---

## 8. Gramado e dimensão do campo

### Qualidade do gramado

**O gramado tem qualidade própria** (Decisão 1821), que afeta velocidade da bola, passes, risco de lesão, estilo de jogo, adaptação, clima e manutenção. Gramado ruim pode favorecer o jogo direto/físico e prejudicar a posse técnica.

**O gramado exige manutenção específica** (Decisão 1822). Se negligenciado: qualidade cai, lesões aumentam, imprensa critica, a competição pode punir e times técnicos sofrem.

### Tipo de gramado

**O tipo de gramado pode ser natural ou sintético/futuro** (Decisão 1823). Para o core: natural padrão. Suporte futuro: sintético, híbrido, gramado pesado e gramado rápido. O tipo afeta estilo e lesão de forma moderada.

**O clube pode adaptar o estilo ao próprio campo** (Decisão 1824), sem que isso seja determinante:

- Campo pequeno / gramado pesado favorece jogo físico.
- Gramado bom favorece posse.
- Campo rápido favorece transição.
- Estádio grande favorece amplitude.

### Dimensão do campo

**A dimensão do campo existe como atributo simples** (Decisão 1825), em três categorias:

| Categoria | Efeito |
| --- | --- |
| Estreito | Reduz amplitude; favorece compactação |
| Padrão | Neutro |
| Largo | Favorece pontas; exige físico |

> Nota de ligação: o modo como qualidade do gramado, tipo, dimensão e estilo influenciam a simulação da partida está detalhado em [`./05-motor-de-partida.md`](./05-motor-de-partida.md).

---

## 9. Mando de campo

**O mando de campo é a soma de torcida, familiaridade e logística** (Decisão 1826) — não um bônus fixo universal. Ele considera público, rivalidade, distância do visitante, gramado, estádio, pressão, fase, comunicação e torcida organizada/intensa.

**O mando é moderado e explicável, e não garante vitória** (Decisão 1827). Ele afeta moral, pressão, arbitragem levemente, confiança, intensidade e familiaridade — mas um time inferior não vence automaticamente só por jogar em casa.

**Público baixo reduz o efeito de mando** (Decisão 1828). Mesmo em casa, com o estádio vazio: a pressão sobre o adversário cai, a receita cai, a imprensa pode criticar e os jogadores sentem apatia.

**Estádio lotado aumenta atmosfera e receita** (Decisão 1829). Efeitos: mais mando, moral, pressão sobre o adversário, receita e narrativa — mas também aumenta a pressão sobre o próprio time em jogos decisivos.

> Nota de ligação: a forma exata como o mando de campo entra no cálculo da partida está em [`./05-motor-de-partida.md`](./05-motor-de-partida.md).

---

## 10. Região e localização do clube

**A região é um atributo importante do clube** (Decisão 1830). Ela impacta torcida local, rivalidades, viagens, captação de jovens, clima, custos, identidade, patrocinadores regionais e calendário regional.

**A região influencia o contexto, não o destino** (Decisão 1831): não define uma grandeza fixa. Um clube de região pequena pode crescer muito, mas precisa lidar com torcida inicial menor, receita local menor, logística, captação e estrutura. Com títulos e identidade, pode expandir a torcida.

### Mercado regional

**A região influencia patrocínio e receita local** (Decisão 1832):

| Região maior / mais rica | Região menor |
| --- | --- |
| Patrocínio maior | Menos receita inicial |
| Público potencial maior | Identidade forte |
| Custo também maior | Menor custo; espaço para crescimento orgânico |

### Rivalidade e captação regionais

**Clubes próximos têm maior chance de rivalidade** (Decisão 1833). Fatores: distância, divisão, histórico, torcida, disputa por jovens, confronto em finais e mercado.

**A região influencia a base e o scouting** (Decisão 1834). Clubes locais têm vantagem para conhecer talentos, convencer famílias, adaptação e identidade. Clubes maiores de fora podem disputar com um projeto melhor.

### Região, custo de vida e adaptação

**A região pode afetar os custos operacionais** (Decisão 1867). Regiões maiores/caras: salários de staff podem subir, manutenção mais cara, patrocínio maior, logística diferente. Regiões menores: custo menor, receita local menor.

**O jogador pode se adaptar melhor ou pior à região** (Decisão 1868), com impacto moderado na moral e permanência. Fatores: distância cultural, clima, idioma/região, família, tamanho da cidade, pressão e torcida.

### Escolha e mudança de região

**A mudança de cidade do clube deve ser rara e sensível** (Decisão 1869) — possível expansão futura, com impactos enormes sobre torcida, identidade, rivalidade, estádio, região e licenciamento. Não deve ser uma ação comum no core.

**Um clube recém-criado escolhe região/cidade dentro de regras** (Decisão 1870). A escolha impacta torcida inicial, rivalidades, clima, base, custos, patrocinadores e identidade, sem permitir região "quebrada" que gere vantagem absurda.

**A região não pode virar exploit** (Decisão 1871): se uma região tem mais patrocínio, também pode ter mais custo, concorrência, pressão, preço de staff e torcida mais exigente; se tem menos receita, tende a ter custo menor, identidade local e captação subexplorada.

> Nota de ligação: os efeitos de patrocínio, receita e custo regional entram no balanço do clube em [`./03-economia.md`](./03-economia.md).

---

## 11. Logística e viagens

**As viagens afetam custo, fadiga e preparação** (Decisão 1835). A viagem considera distância, região, calendário, estrutura do clube, orçamento, competição, frequência de jogos e clima.

**A viagem gera despesa no ledger** (Decisão 1836), dependente de distância, divisão, tamanho da delegação, qualidade da logística, calendário, competição e urgência. Clubes com gestão ruim podem gastar mal ou preparar pior.

**A viagem aumenta a fadiga e reduz a preparação** (Decisão 1837), com impacto sobre energia, recuperação, risco de lesão, foco, treino perdido e adaptação ao clima. Quanto maior a distância e menor a estrutura, maior o impacto.

### Distância e desgaste

| Viagem curta — derby regional (Decisão 1838) | Viagem longa (Decisão 1839) |
| --- | --- |
| Menor custo | Custo maior |
| Menor desgaste | Fadiga |
| Maior torcida visitante | Planejamento de elenco e rotação |
| Rivalidade maior | Treino, desempenho e retorno afetados |

A viagem longa é um fator estratégico e um calendário ruim amplifica seus efeitos.

**A gestão/diretoria influencia a eficiência logística** (Decisão 1840). Gestão boa reduz custo, melhora recuperação, planeja viagens e evita erros; gestão ruim aumenta fadiga, perde preparação e gera custo extra.

### Sequências de mando

**A sequência de jogos fora pesa mais** (Decisão 1841): fadiga acumulada, moral pode cair, custo sobe, treino reduz, torcida sente a ausência e o elenco profundo ganha valor.

**A sequência em casa pode gerar vantagem financeira e esportiva** (Decisão 1842), mas também aumenta a pressão por pontos, faz a torcida cobrar mais em caso de resultados ruins e exige manutenção do estádio.

### Torcida visitante e campo neutro

**A torcida visitante existe em intensidade variável** (Decisão 1843), dependendo de distância, rivalidade, fase do time, tamanho da torcida, competição, disponibilidade de ingressos e segurança/estádio. Pode reduzir um pouco o mando adversário.

**O campo neutro remove parte do mando, mas não todo o contexto** (Decisão 1844). Considera a distância para cada torcida, o tamanho das torcidas, a importância do jogo, o estádio escolhido, o clima e a logística — uma final "neutra" pode favorecer a torcida mais próxima.

**A final em campo neutro terá regra própria de renda e torcida** (Decisão 1845), definindo divisão de ingressos, renda, custos, mando administrativo, viagem, clima e torcida de cada lado.

### Viagem, divisões e calendário

**Divisões inferiores podem ser mais regionalizadas** (Decisão 1872): menor custo, mais rivalidade, mais identidade e melhor entrada de clubes novos; divisões maiores podem ter viagens mais longas.

**O calendário pode reduzir viagens em divisões baixas** (Decisão 1873), especialmente para divisão de expansão, regionais, base e clubes pequenos, ajudando na sustentabilidade.

> Nota de ligação: fadiga de viagem e sua influência no desempenho em campo entram no cálculo da partida em [`./05-motor-de-partida.md`](./05-motor-de-partida.md).

---

## 12. Clima

**O clima deve ser moderado, não um protagonista constante** (Decisão 1846). Pode afetar ritmo, fadiga, lesão, passes, finalização, público, gramado e estilo de jogo — mas só em eventos mais fortes deve ser decisivo.

**Usam-se categorias simples de clima** (Decisão 1847), sem simular meteorologia complexa: normal, calor, frio, chuva, chuva forte, vento, tempo seco e clima extremo raro.

**O clima extremo deve ser raro** (Decisão 1848) — um evento especial, não rotina. Pode causar adiamento, gramado ruim, maior risco de lesão, público menor e jogo mais caótico.

### Efeitos por tipo de clima

| Clima | Efeitos principais |
| --- | --- |
| Chuva (Decisão 1849) | Passes mais difíceis, escorregões, mais erro, bola parada mais perigosa, público menor (conforme o estádio); **gramado deteriora mais** |
| Calor (Decisão 1850) | Aumenta fadiga; afeta energia, intensidade, risco de lesão/desidratação abstrata, ritmo e necessidade de rotação. Clubes locais podem sofrer menos, mas não são imunes |
| Frio (Decisão 1851) | Começo de jogo mais travado, risco muscular, público em regiões não acostumadas, **gramado pesado se combinado com chuva** |
| Vento (Decisão 1852) | Afeta cruzamentos, lançamentos, goleiros, bolas paradas e finalização de longe |

### Adaptação, torcida e calendário

**Jogadores e clubes podem se adaptar parcialmente ao clima** (Decisão 1853), com impacto leve/moderado. Fatores: região de origem, tempo no clube, preparação física, experiência, viagem e calendário.

**O clima ruim reduz o público, salvo em jogo grande** (Decisão 1854): em jogo decisivo/clássico o público cai pouco; em jogo comum cai mais. Um estádio confortável reduz o impacto.

**O clima pode gerar adiamento, raramente** (Decisão 1855) — apenas se extremo, gramado impraticável, segurança comprometida e se a competição permitir. O adiamento segue as regras já fechadas.

### Região define o clima; infraestrutura reduz o impacto

**A região define as probabilidades climáticas** (Decisão 1856), sem depender de clima real. Cada região tem um perfil (mais quente, mais chuvosa, mais fria, mais seca ou equilibrada), dando identidade sem dados externos.

**Um estádio melhor reduz os problemas de clima** (Decisão 1857): drenagem boa reduz o impacto da chuva, estrutura coberta melhora o público, gramado bem cuidado suporta melhor a sequência e boa iluminação/estrutura melhora os jogos noturnos.

> Nota de ligação: como cada condição climática altera ritmo, passes, finalização e lesão dentro da simulação está em [`./05-motor-de-partida.md`](./05-motor-de-partida.md).

---

## 13. Segurança, punições e valor comercial do estádio

### Segurança e punições de mando

**Problemas disciplinares podem gerar punição de mando** (Decisão 1858), usados com moderação. Eventos possíveis: protesto grave, invasão abstrata, objetos em campo, reincidência e falta de segurança. Punições: multa, portões fechados, perda de mando e campo neutro.

**Jogo sem torcida (portões fechados) é uma punição possível** (Decisão 1859): sem bilheteria, mando reduzido, moral diferente, torcida insatisfeita e imprensa negativa.

**A perda de mando desloca a partida para campo alternativo/neutro** (Decisão 1860), com receita menor, logística, torcida frustrada, impacto na competitividade e na reputação disciplinar.

### Valor comercial e marcos

**Um estádio bom melhora o valor comercial** (Decisão 1861), afetando patrocínio, naming rights futuro, camarotes/áreas premium abstratas, eventos e imagem do clube.

**Naming rights pode existir como expansão econômica** (Decisão 1862), gerando receita recorrente mas afetando a identidade — a torcida tradicional pode reagir conforme a comunicação.

**O estádio pode gerar receita extra moderada com eventos** (Decisão 1863): visitas, museu, jogos de base, amistosos e eventos comerciais. No core, mantido abstrato para não virar gestão de arena pesada.

**O estádio deve registrar marcos no record book** (Decisão 1864): maior público, primeiro jogo, final histórica, maior renda, reforma concluída e despedida de ídolo.

### Obras, torcida e dívida

**A torcida reage a obras conforme necessidade e impacto** (Decisão 1865). Reage bem se o clube cresceu, o estádio lota, a obra é planejada e a comunicação é boa; reage mal se o clube está endividado, a obra reduz o desempenho financeiro, o time está ruim ou o preço sobe.

**A obra pode gerar dívida estrutural** (Decisão 1866): de longo prazo, com juros próprios e impacto no orçamento — pode ser boa se gerar receita ou virar peso se mal planejada.

> Nota de ligação: dívida de estádio, receita de naming rights, eventos e patrocínio entram no balanço em [`./03-economia.md`](./03-economia.md).

---

## 14. Pendências

> **Recomendação (a ratificar — R-90):** valores concretos de estádio/região (capacidade por divisão, deterioração, custo de manutenção, bônus de mando, elasticidade preço×ocupação, custo/fadiga por distância) como calibração inicial; ajuste fino no lote de simulação.

> **Nota (reconciliação):** as Decisões 1867–1873 (região, custo de vida, adaptação, mudança de cidade, clube novo, balanceamento regional, regionalização do calendário) são compartilhadas com economia e jogadores; os números vivem nas recomendações de economia (R-41..R-49) e no catálogo técnico, sem duplicação aqui.
