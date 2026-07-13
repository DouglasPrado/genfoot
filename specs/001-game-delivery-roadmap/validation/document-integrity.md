# Integridade documental

**Executado em:** 2026-07-13T20:07:01Z  
**Revisão base:** `9d639f209faf27a47bde4ec8fdf19032c65b68be`  
**Escopo:** roadmap mestre, pacotes `002`–`035`, scripts do roadmap e link de navegação em `docs/README.md`.

## Resultados

| Check          | Comando                                                                                                                                           | Exit | Resultado                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---: | -------------------------------------------------------- |
| Formatação     | `pnpm exec prettier --check specs scripts/roadmap docs/README.md`                                                                                 |    0 | PASS — todos os arquivos correspondem ao estilo Prettier |
| Links internos | `node scripts/roadmap/validate-internal-links.mjs specs/001-game-delivery-roadmap specs/002-domain-kernel-simulator … specs/035-financial-crisis` |    0 | PASS — 333 referências verificadas                       |

O validador de links percorre os arquivos Markdown, resolve destinos locais relativamente ao arquivo de origem e falha para qualquer caminho inexistente. Links externos e âncoras internas ao mesmo documento ficam fora desta checagem de existência de arquivo.

## Resultado agregado

`PASS`: os 35 diretórios Spec Kit estão formatados e não possuem destino local de Markdown ausente no escopo verificado.
