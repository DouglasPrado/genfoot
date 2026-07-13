# Grinta — Guia Oficial do Jogador (site)

Site do **Guia Oficial do Jogador** do Grinta. Renderiza os 42 capítulos (10 Partes)
da documentação em [`../../docs/03-guia-do-jogador/`](../../docs/03-guia-do-jogador/)
como um site navegável, com busca, tema claro/escuro, versão mobile e impressão/PDF.

## Fidelidade à documentação (garantida por construção)

O conteúdo **não é copiado**. No build, o site lê diretamente os arquivos
`docs/03-guia-do-jogador/parte-*.md` ([`src/lib/content.ts`](src/lib/content.ts)) e os
transforma em páginas. Não existe fonte duplicada para divergir: o que o guia mostra é
exatamente o que está na documentação. A cobertura é checada por
[`scripts/verify-fidelity.mjs`](#verificação), que confere capítulo a capítulo (presença,
contagem de blocos `REGRA/ATENÇÃO/EXEMPLO/COMO O JOGO AVALIA` e cobertura de todo o texto).

O que é filtrado da visão do jogador: a linha editorial `> **Status:… Fontes:…**` e os
blocos `## Sumário` de cada arquivo (metadados internos). Links internos `Cap. N` são
reescritos para as rotas reais do guia.

## Stack

- **Next.js 15** (App Router, TypeScript) com **`output: "export"`** → site 100% estático
  em `out/` (sem servidor Node), atendendo à especificação de distribuição do guia
  (site público, PWA, pacote offline/zip, embutido no jogo).
- **react-markdown + remark-gfm** para o conteúdo; CSS próprio (sem framework) com os
  *design tokens* do design system (`docs/04-ui-ux/00`) e a identidade de marca do
  protótipo (ink + vermelho→laranja + lima).
- Busca client-side (índice gerado no build, sem servidor).
- Fontes self-hosted via `next/font` (Archivo, Inter, JetBrains Mono).

## Rodar

```bash
npm install
npm run dev            # desenvolvimento em http://localhost:3000
npm run build          # gera o site estático em ./out
npm run serve          # serve ./out localmente (após o build)
```

## Verificação

Com o site servido em `http://localhost:4123` (`npm run serve -- -l 4123`):

```bash
node scripts/verify-fidelity.mjs
```

Saída esperada: `✅ 100% coverage` — 42 capítulos, 0 divergências de callout, 0 trechos
faltando.

## Estrutura

```
src/
├── app/
│   ├── layout.tsx                  # fontes, tema, chrome global
│   ├── page.tsx                    # página inicial (hero + áreas + partes + FAQ)
│   ├── guia/
│   │   ├── layout.tsx              # 3 colunas: sidebar · conteúdo · "nesta página"
│   │   ├── page.tsx                # índice de todas as regras
│   │   └── [part]/[chapter]/…      # 10 visões de Parte + 42 páginas de capítulo
│   └── globals.css                 # design system (tokens, callouts, layout, print)
├── components/                     # Header, Sidebar, Toc, Search, BlockRenderer…
└── lib/
    ├── content.ts                  # parser docs → capítulos/blocos/toc/índice de busca
    ├── guide.config.ts             # Partes, versão e áreas
    └── util.ts                     # slug, strip-markdown
```

## Deploy

`out/` é estático: sirva em qualquer host (ex.: subdomínio `docs.<domínio>`, conforme R-97),
compacte em `.zip` ou embarque em `guide/index.html` dentro da instalação do jogo.
