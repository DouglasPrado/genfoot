# Quickstart: validar narrativa

## Prerequisites

Contratos C3/C8/C9/X-001/X-002 e PostgreSQL de teste.

```bash
pnpm test -- --run narrative
```

1. Reproduzir fixture de resultados/expectativas e comparar snapshots/hash.
2. Entregar cada fact duas vezes e provar ausência de efeito adicional.
3. Criar promessa, cumprir/quebrar em fixtures distintas e reexecutar o avaliador.
4. Abrir/recuperar crise e provar timeline/causas.
5. Auditar que C10 nunca emite escrita competitiva e que gerador indisponível não muda efeitos.

**Expected**: determinismo, bounds 0–100, terminais únicos e zero autoridade externa. Testes são trabalho futuro; ausência mantém status PLANNED.
