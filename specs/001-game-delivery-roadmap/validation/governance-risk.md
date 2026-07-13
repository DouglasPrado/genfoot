# Risco de governança da constituição

**Data da auditoria:** 2026-07-13  
**Entrada:** `.specify/memory/constitution.md`  
**Resultado:** `BLOCKED` para ratificação constitucional; não bloqueia a documentação do portfólio, mas bloqueia qualquer alegação de conformidade com princípios ainda não definidos.

## Constatação

A constituição do projeto permanece no template do Spec Kit: nomes de princípios, descrições, seções, regras de governança, versão e datas ainda são placeholders. Não existe base legítima para inventar princípios ou declarar que os 34 pacotes estão constitucionalmente conformes.

## Risco

Sem ratificação explícita, decisões de arquitetura e gates continuam apoiados apenas na baseline canônica de `docs/`, nos contratos deste roadmap e nos testes executados. Uma futura constituição pode impor critérios adicionais e exigir análise de impacto ou atualização dos pacotes.

## Controle temporário

1. Tratar a baseline ratificada em `docs/99-decisoes/` como autoridade documental vigente.
2. Não preencher placeholders nem inferir aprovação constitucional.
3. Registrar decisões novas por ADR e manter rastreabilidade para fonte, requisito, evidência e revisão.
4. Marcar verificações constitucionais como `BLOCKED`, nunca como `PASS` ou `SKIP` silencioso.

## Handoff de ratificação

O responsável de produto e arquitetura deve executar o fluxo `speckit-constitution`, definir princípios verificáveis, regras de emenda, versão e datas, revisar impactos nos 34 pacotes e somente então substituir este bloqueio por evidência de conformidade. A ratificação é uma mudança de governança separada desta feature e não foi presumida.
