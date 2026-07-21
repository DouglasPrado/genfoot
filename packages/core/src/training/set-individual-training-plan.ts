import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import {
  deterministicUuidV7,
  timestampOf,
} from "../foundation/deterministic-uuid.js";
import {
  GOALKEEPING_ATTRIBUTES,
  MENTAL_ATTRIBUTES,
  PHYSICAL_ATTRIBUTES,
  TECHNICAL_ATTRIBUTES,
} from "../players/player-attributes.js";
import { recommendedAttributes } from "../players/position-attributes.js";

import { archetypeAttributes } from "./gk-archetypes.js";
import {
  MAX_INDIVIDUAL_PLAN_ATTRIBUTES,
  MAX_INTENSITY,
  MIN_INTENSITY,
  type IndividualTrainingPlanRepository,
  type IndividualTrainingPlanSnapshot,
  type IndividualTrainingTarget,
} from "./individual-training-plan-types.js";
import type { TrainingContextReader } from "./training-types.js";

/**
 * Definir o plano de treino INDIVIDUAL de um jogador — command
 * `training:set-individual-plan` (M-TRAINING-INDIV).
 *
 * Concorrência otimista por `expectedVersion` como o coletivo. Reusa o
 * `TrainingContextReader` (elenco + restrição médica): o plano individual é
 * CARGA de desenvolvimento, então o restrito médico é recusado — ele descansa
 * pela recuperação do plano coletivo, não por uma diretiva de evolução.
 */
export interface SetIndividualTrainingPlanInput {
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly playerId: string;
  readonly worldSeed: string;
  readonly occurredOn: string;
  readonly target: IndividualTrainingTarget;
  readonly intensity: number;
  readonly expectedVersion: number | null;
}

export interface SetIndividualTrainingPlanResult {
  readonly plan: IndividualTrainingPlanSnapshot;
}

const KNOWN_ATTRIBUTES: ReadonlySet<string> = new Set([
  ...TECHNICAL_ATTRIBUTES,
  ...PHYSICAL_ATTRIBUTES,
  ...MENTAL_ATTRIBUTES,
  ...GOALKEEPING_ATTRIBUTES,
]);

const invalid = (message: string, details?: Record<string, unknown>) =>
  fail(new DomainError("TRAINING_PLAN_INVALID", message, details));

export class SetIndividualTrainingPlan {
  public constructor(
    private readonly repository: IndividualTrainingPlanRepository,
    private readonly context: TrainingContextReader,
  ) {}

  public async execute(
    input: SetIndividualTrainingPlanInput,
  ): Promise<Result<SetIndividualTrainingPlanResult, DomainError>> {
    if (
      !Number.isInteger(input.intensity) ||
      input.intensity < MIN_INTENSITY ||
      input.intensity > MAX_INTENSITY
    ) {
      return invalid("Intensidade deve ser inteiro entre 0 e 100.", {
        intensity: input.intensity,
      });
    }

    // O alvo tem que existir de fato: atributo do catálogo, posição conhecida
    // (com recomendadas), ou arquétipo de goleiro conhecido. Alvo inválido não
    // vira plano.
    if (input.target.kind === "ATTRIBUTE") {
      const codes = input.target.attributeCodes;
      if (codes.length < 1 || codes.length > MAX_INDIVIDUAL_PLAN_ATTRIBUTES) {
        return invalid(
          `Escolha de 1 a ${MAX_INDIVIDUAL_PLAN_ATTRIBUTES} habilidades para o plano.`,
          { count: codes.length },
        );
      }
      if (new Set(codes).size !== codes.length) {
        return invalid("A mesma habilidade aparece duas vezes no plano.");
      }
      for (const attributeCode of codes) {
        if (!KNOWN_ATTRIBUTES.has(attributeCode)) {
          return fail(
            new DomainError(
              "ATTRIBUTE_NOT_APPLICABLE",
              "Atributo-alvo não existe no catálogo.",
              { attributeCode },
            ),
          );
        }
      }
    } else if (input.target.kind === "POSITION") {
      if (recommendedAttributes(input.target.position).length === 0) {
        return invalid("Posição-alvo desconhecida.", {
          position: input.target.position,
        });
      }
    } else if (archetypeAttributes(input.target.archetype).length === 0) {
      return invalid("Arquétipo de goleiro desconhecido.", {
        archetype: input.target.archetype,
      });
    }

    const elenco = new Set(
      await this.context.squadPlayerIds(input.gameWorldId, input.clubId),
    );
    if (!elenco.has(input.playerId)) {
      return fail(
        new DomainError(
          "PLAYER_NOT_IN_SQUAD",
          "Jogador não pertence ao elenco do clube.",
          { playerId: input.playerId },
        ),
      );
    }

    const restritos = new Set(
      await this.context.medicallyRestrictedPlayerIds(
        input.gameWorldId,
        input.clubId,
      ),
    );
    if (restritos.has(input.playerId)) {
      return fail(
        new DomainError(
          "PLAYER_UNDER_MEDICAL_RESTRICTION",
          "Jogador sob restrição médica não recebe plano de desenvolvimento; ponha-o em recuperação no plano coletivo.",
          { playerId: input.playerId },
        ),
      );
    }

    const existing = await this.repository.findByPlayer(
      input.gameWorldId,
      input.clubId,
      input.playerId,
    );
    const versaoAtual = existing?.version ?? null;
    if (versaoAtual !== input.expectedVersion) {
      return fail(
        new DomainError(
          "AGGREGATE_VERSION_CONFLICT",
          "O plano individual mudou desde a leitura; recarregue e reenvie.",
          {
            expectedVersion: input.expectedVersion,
            actualVersion: versaoAtual,
          },
        ),
      );
    }

    const plan: IndividualTrainingPlanSnapshot = {
      id:
        existing?.id ??
        deterministicUuidV7({
          worldSeed: input.worldSeed,
          context: `${input.gameWorldId}:individual-training-plan:${input.playerId}`,
          timestampMilliseconds: timestampOf(input.occurredOn),
        }),
      gameWorldId: input.gameWorldId,
      clubId: input.clubId,
      playerId: input.playerId,
      target: input.target,
      intensity: input.intensity,
      version: (versaoAtual ?? 0) + 1,
    };

    await this.repository.save(plan, versaoAtual);
    return succeed({ plan });
  }
}
