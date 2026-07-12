# Marca Grinta — assets e tokens

> **Status:** v0.1 · **Base:** logotipo **B1** (gerado com Recraft V4.1 via Higgsfield, vetor) · **Paleta:** “vermelho + lima ácida” · **Revisão:** 2026-07-11

Assets vetoriais da marca **Grinta** e os tokens de cor que derivam deles. Direção visual “de jogo” (referências eFootball / Fortnite): cor saturada, gradiente no herói, glow e base escura. Complementa a decisão de nome em [`../02-identidade-e-nome.md`](../02-identidade-e-nome.md) e alimenta o design system em [`../../04-ui-ux/00-visao-geral-e-design-system.md`](../../04-ui-ux/00-visao-geral-e-design-system.md).

## Arquivos

| Arquivo | O que é | Usar quando |
| --- | --- | --- |
| `grinta-logo.svg` | Logotipo completo (símbolo “G” + wordmark). “G” em off-white; wordmark em gradiente. | **Fundo escuro/grafite** ou sobre a cor da marca. |
| `grinta-wordmark.svg` | Só a palavra GRINTA, em gradiente. | **Fundo claro** (o wordmark lê bem no branco) ou como assinatura reduzida. |
| `grinta-mark.svg` | Só o símbolo “G” com a bola (off-white + preto), transparente. | Selo/plate grafite, submarcas, base do ícone. |
| `grinta-icon.svg` | App icon quadrado full-bleed: “G” branco no gradiente. | iOS/base — o SO aplica a máscara. |
| `grinta-icon-rounded.svg` | App icon com cantos arredondados (raio ~22%). | Web, favicon, prévias. |
| `grinta-icon-foreground.svg` | “G” transparente com zona de segurança ampla. | **Foreground** de ícone adaptativo Android (fundo = `#FF1F3D` ou gradiente da marca). |

> **Regra-chave:** o logotipo completo (`grinta-logo.svg`) tem o “G” em off-white — **não** usar direto sobre fundo claro (o “G” some). Em fundo claro, use `grinta-wordmark.svg` ou coloque o logo sobre um plate grafite.

## Tokens de cor

| Token | Valor | Papel |
| --- | --- | --- |
| `color.brand` (gradiente) | `#FF1F3D → #FF6A00` | Herói. Ação primária, escudos, energia. |
| `color.brand.red` | `#FF1F3D` | Vermelho sólido (início do gradiente). |
| `color.brand.ember` | `#FF6A00` | Brasa (fim do gradiente). |
| `color.accent.lime` | `#CBFF2E` | Acento/faísca. Estado ativo, “novo”, XP, destaque. |
| `color.bg` (base) | `#0E0F12` | Fundo do app (tema escuro). |
| `color.surface` | `#15161B` · `#1C1E25` · `#262933` · `#31353F` | Escala de superfícies grafite. |
| `color.text` | `#F4F5F8` | Texto principal no escuro. |
| `color.danger` | `#FF1F3D` | Emergência/erro (coincide com o herói — o vermelho é urgência). |
| `color.warning` | `#FFB020` | Risco, atenção, prazo próximo. |
| `color.info` | `#3B9EFF` | Oportunidade, dica, neutro-destaque. |
| `color.success` | `#2FD07A` | Confirmação, saúde boa, meta batida. |

Cor semântica **sempre** acompanha ícone + texto, nunca só cor (acessibilidade AA — design system §7). Tema claro (admin web) inverte base/superfície/texto; marca e semânticos não mudam.

## Como os assets foram gerados

O logo B1 foi escolhido entre 4 direções e recolorido para esta paleta. Os SVGs são **vetor puro** (sem raster). O app icon foi recortado do “G” do B1, com margem de segurança e ajuste óptico. Para regenerar/ajustar, reabra a conversa de marca ou edite os `<path>` diretamente — as cores estão em `<linearGradient id="brand">` / `id="ibrand"`.

## Pendências herdadas

- Verificação de marca no **INPI** (classes de software/jogos) e de **domínios** antes da adoção definitiva — ver [`../02-identidade-e-nome.md`](../02-identidade-e-nome.md).
- Fontes ainda usam a stack do sistema (o CSP de artifacts bloqueia webfonts). Definir/licenciar uma display face para o produto é passo futuro.
