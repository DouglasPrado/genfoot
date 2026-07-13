# Quickstart: validar clientes

## Prerequisites

M2 verde, APIs/contracts congelados, Node 22/PNPM 10, emulador/device e browser.

```bash
pnpm --filter mobile test
pnpm --filter admin test
pnpm test -- --run client-contracts
pnpm test -- --run accessibility
```

1. Executar GP-001…GP-016 E2E e matriz de estados.
2. Desconectar/reconectar com duplicate/gap e comparar estado ao backend.
3. Enfileirar intent permitida, expirada e irreversível; somente a primeira válida segue após revalidação.
4. Trocar account/world/control e auditar cache/secure storage.
5. Rodar leitor de tela, teclado/foco, contraste, text scaling e reduced motion.
6. Executar admin por papéis, reauth e quatro-olhos.

**Expected**: 16 GPs verdes, zero autoridade/duplicação/vazamento, 138 telas cobertas e accessibility aprovada. Comandos são alvos futuros; ausência mantém PLANNED.
