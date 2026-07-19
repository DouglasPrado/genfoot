import { DomainError } from "@grinta/shared";

import { SeededRandom } from "../foundation/seeded-random.js";
import { CREST_TEMPLATES, KIT_TEMPLATES } from "./visual-identity-catalog.js";

/**
 * A paleta canônica dos clubes gerados.
 *
 * Cores fechadas em vez de hex aleatório: sorteio livre no espaço RGB produz
 * bege, lodo e pastel lavado — cores que ninguém escolheria para um clube, e
 * que num escudo de 42px viram borrão. A lista é curta e saturada de propósito.
 */
export const CLUB_PALETTE: readonly string[] = [
  "#C81E1E", // vermelho
  "#1D4ED8", // azul
  "#15803D", // verde
  "#F5F5F5", // branco
  "#0A0B0D", // preto
  "#EAB308", // amarelo
  "#7E22CE", // roxo
  "#EA580C", // laranja
  "#0E7490", // petróleo
  "#BE185D", // grená
] as const;

export interface GeneratedVisualIdentity {
  readonly crestTemplateId: string;
  readonly homeKitTemplateId: string;
  readonly awayKitTemplateId: string;
  readonly primaryColor: string;
  readonly secondaryColor: string;
  readonly tertiaryColor: string;
}

/**
 * A identidade visual de um clube gerado — determinística por `(seed, índice)`.
 *
 * Mora no domínio, não no cliente: se o mobile sorteasse as cores localmente,
 * dois aparelhos mostrariam escudos diferentes para o mesmo clube, e o replay
 * do mundo não reproduziria o que o jogador viu. O cliente RENDERIZA o template;
 * quem decide qual é o mundo.
 *
 * É ponto de partida, não sentença: o jogador sobrescreve ao personalizar
 * (BC-003) — `crestTemplateId` e as cores continuam colunas anuláveis, e a
 * gênese só as preenche para o clube não nascer sem cara.
 */
export function generateClubVisualIdentity(
  worldSeed: string,
  clubIndex: number,
): GeneratedVisualIdentity {
  if (!Number.isInteger(clubIndex) || clubIndex < 0) {
    throw new DomainError(
      "INVALID_CLUB_INDEX",
      "clubIndex deve ser inteiro não negativo para gerar identidade visual.",
    );
  }

  // `SeededRandom` valida seed vazio e mantém a stream isolada por contexto —
  // gerar escudo não pode consumir a stream que gera jogador, senão mudar a
  // paleta mudaria o elenco.
  const random = new SeededRandom({
    worldSeed,
    context: `club-visual-identity:${clubIndex}`,
  });

  const template = CREST_TEMPLATES[random.nextInt(0, CREST_TEMPLATES.length)]!;

  // Kits distintos para casa e fora: dois desenhos iguais tornam o jogo
  // ilegível quando os times se enfrentam. Sorteio sem reposição garante isso
  // sem laço de re-tentativa (que quebraria o determinismo se mudasse de forma).
  const kits = [...KIT_TEMPLATES];
  const homeKit = kits.splice(random.nextInt(0, kits.length), 1)[0]!;
  const awayKit = kits.splice(random.nextInt(0, kits.length), 1)[0]!;

  // Sorteio SEM reposição: três slots, três cores distintas. Repetir cor apaga o
  // desenho do escudo — as listras somem no fundo.
  const disponiveis = [...CLUB_PALETTE];
  const escolher = (): string => {
    const indice = random.nextInt(0, disponiveis.length);
    return disponiveis.splice(indice, 1)[0]!;
  };

  return {
    crestTemplateId: template.id,
    homeKitTemplateId: homeKit.id,
    awayKitTemplateId: awayKit.id,
    primaryColor: escolher(),
    secondaryColor: escolher(),
    tertiaryColor: escolher(),
  };
}
