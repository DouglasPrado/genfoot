# Quickstart: validar automação e IA

## Prerequisites

M1 domain contracts congelados; Node 22/PNPM 10; manifest com ruleset e seed streams.

## Validation

```bash
pnpm test -- --run automation
pnpm simulator automation:season --seed ai-001 --ruleset-version <version>
```

1. Executar o mesmo manifest duas vezes e comparar decisions, commands, explanations e state hash.
2. Remover uma permissão e provar que proposta/retry não contornam o guard.
3. Injetar projeção stale e decisão humana concorrente; provar revalidação e precedência.
4. Auditar inputs para campos ocultos.
5. Avançar 20 temporadas com todos os clubes automatizados e entregar relatório a VAL-001.

**Expected**: igualdade bit a bit, zero escrita direta/knowledge leak, commands rejeitados sem efeito e invariantes verdes. O cenário CLI é saída futura; ausência mantém evidência pendente.
