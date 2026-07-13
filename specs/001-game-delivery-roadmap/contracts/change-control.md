# Controle de mudanças do portfólio

## Precedência

1. Atos ratificados em `docs/99-decisoes/`.
2. Baseline técnica/GDD canônica em `docs/`.
3. Catálogo, source map e manifests desta spec.
4. Pacotes filhos e evidências.
5. Código/projeções; divergência abre análise, não reescreve a norma silenciosamente.

## Versionamento e IDs

- ID publicado nunca é reutilizado ou muda de significado.
- Correção compatível atualiza versão minor do contrato e preserva consumidores.
- Mudança incompatível cria nova versão; divisão de escopo cria novo ID e mantém links `supersedes/supersededBy`.
- Nova capacidade/owner/golden path exige análise de cobertura 12/3/16 e DAG.
- Alteração de status exige Evidence IDs; DELIVERED não é rebaixado apagando histórico.

## Impact analysis obrigatória

Registrar fonte/decisão alterada, IDs alcançados, owners, commands/queries/events, schema/migrations, ruleset, seeds/golden files, clientes, segurança/operação e evidências tornadas stale. A mudança só segue quando o DAG continua acíclico e não há ownership duplicado.

## Fluxo

`PROPOSED → IMPACT_ASSESSED → APPROVED → IMPLEMENTED → EVIDENCED → RELEASED`.

Rejeição/rollback preserva decisões e observations anteriores. Mudança emergencial recebe ID e revisão retroativa; não autoriza SQL direto ou alteração de fato histórico.

## Critérios para novo ID

Novo ID é obrigatório quando muda owner autoritativo, resultado demonstrável, marco principal, compatibilidade pública ou unidade independente de promoção. Ajuste textual, evidência nova e implementação interna compatível não criam ID.
