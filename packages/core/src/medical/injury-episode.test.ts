import { describe, expect, it } from "vitest";

import {
  InjuryCause,
  InjurySeverity,
  InjuryType,
  MedicalEpisodeState,
  RETURN_TO_TRAINING_STAGE,
  TreatmentOption,
  type InjuryEpisodeSnapshot,
} from "./injury-episode-types.js";
import {
  advanceRehabStage,
  dischargePlayer,
  diagnoseInjury,
  forceReturn,
  openInjuryEpisode,
  orderMedicalExam,
  recoveryRangeFor,
  relapseRiskScore,
  retireMedically,
  reviseDiagnosis,
  setMedicalPlan,
  treatmentOptionsFor,
} from "./injury-episode.js";

const OPEN_INPUT = {
  gameWorldId: "11111111-1111-7111-8111-111111111111",
  clubId: "22222222-2222-7222-8222-222222222222",
  playerId: "33333333-3333-7333-8333-333333333333",
  worldSeed: "seed-medical",
  occurredOn: "2026-07-22",
  injuryType: InjuryType.MUSCULAR,
  cause: InjuryCause.TRAINING,
  region: "coxa-direita",
} as const;

const openEpisode = (): InjuryEpisodeSnapshot => {
  const result = openInjuryEpisode(OPEN_INPUT);
  if (!result.ok) throw new Error("abertura devia ter sucedido");
  return result.value.episode;
};

/** Leva o episódio até `DIAGNOSIS` com a gravidade pedida. */
const diagnosed = (
  severity: InjurySeverity = InjurySeverity.MODERATE,
): InjuryEpisodeSnapshot => {
  const exams = orderMedicalExam(openEpisode(), { occurredOn: "2026-07-22" });
  if (!exams.ok) throw new Error("MED-2 devia ter sucedido");
  const diagnosis = diagnoseInjury(exams.value.episode, {
    occurredOn: "2026-07-24",
    severity,
    returnRiskScore: 40,
  });
  if (!diagnosis.ok) throw new Error("MED-3 devia ter sucedido");
  return diagnosis.value.episode;
};

/** Leva até `REHAB` no estágio pedido, pelo caminho oficial (sem pular). */
const inRehab = (
  stage: number,
  severity: InjurySeverity = InjurySeverity.MODERATE,
): InjuryEpisodeSnapshot => {
  const started = setMedicalPlan(diagnosed(severity), {
    occurredOn: "2026-07-24",
    option: TreatmentOption.STANDARD,
  });
  if (!started.ok) throw new Error("MED-4 devia ter sucedido");
  let episode = started.value.episode;
  for (let target = 2; target <= stage; target += 1) {
    const advanced = advanceRehabStage(episode, { occurredOn: "2026-07-25" });
    if (!advanced.ok) throw new Error(`MED-5 devia avançar até S${target}`);
    episode = advanced.value.episode;
  }
  return episode;
};

describe("MED-1 · abertura do episódio", () => {
  it("abre em EVALUATION emitindo InjurySuspected", () => {
    const result = openInjuryEpisode(OPEN_INPUT);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.episode.state).toBe(MedicalEpisodeState.EVALUATION);
    expect(result.value.episode.rehabStage).toBeNull();
    expect(result.value.episode.diagnosis).toBeNull();
    expect(result.value.episode.relapseCount).toBe(0);
    expect(result.value.events.map((event) => event.type)).toEqual([
      "InjurySuspected",
    ]);
  });

  it("gera id determinístico — mesma entrada, mesmo id", () => {
    const first = openInjuryEpisode(OPEN_INPUT);
    const second = openInjuryEpisode(OPEN_INPUT);

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.value.episode.id).toBe(second.value.episode.id);
  });

  it("recusa região vazia — a região alimenta o 'recorrente' de R-21", () => {
    const result = openInjuryEpisode({ ...OPEN_INPUT, region: "  " });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("MEDICAL_PLAN_INVALID");
  });
});

describe("MED-2/MED-3 · exames e diagnóstico", () => {
  it("EVALUATION → EXAMS emite MedicalExamOrdered", () => {
    const result = orderMedicalExam(openEpisode(), {
      occurredOn: "2026-07-22",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.episode.state).toBe(MedicalEpisodeState.EXAMS);
    expect(result.value.events.map((event) => event.type)).toEqual([
      "MedicalExamOrdered",
    ]);
  });

  it("não pede exame duas vezes — EXAMS não é origem de MED-2", () => {
    const exams = orderMedicalExam(openEpisode(), { occurredOn: "2026-07-22" });
    if (!exams.ok) throw new Error("MED-2 devia ter sucedido");

    const again = orderMedicalExam(exams.value.episode, {
      occurredOn: "2026-07-23",
    });

    expect(again.ok).toBe(false);
    if (again.ok) return;
    expect(again.error.code).toBe("MEDICAL_PLAN_INVALID");
  });

  it("EXAMS → DIAGNOSIS grava a faixa de recuperação da gravidade", () => {
    const episode = diagnosed(InjurySeverity.SERIOUS);

    expect(episode.state).toBe(MedicalEpisodeState.DIAGNOSIS);
    expect(episode.diagnosis).not.toBeNull();
    expect(episode.diagnosis?.severity).toBe(InjurySeverity.SERIOUS);
    expect(episode.diagnosis?.minimumDays).toBe(
      recoveryRangeFor(InjurySeverity.SERIOUS).minimumDays,
    );
    expect(episode.diagnosis?.revisions).toBe(0);
  });

  it("recusa risco de retorno fora de 0–100", () => {
    const exams = orderMedicalExam(openEpisode(), { occurredOn: "2026-07-22" });
    if (!exams.ok) throw new Error("MED-2 devia ter sucedido");

    const result = diagnoseInjury(exams.value.episode, {
      occurredOn: "2026-07-24",
      severity: InjurySeverity.LIGHT,
      returnRiskScore: 140,
    });

    expect(result.ok).toBe(false);
  });
});

describe("MED-9 · a estimativa pode mudar", () => {
  it("revisa o diagnóstico no lugar e conta a revisão", () => {
    const result = reviseDiagnosis(diagnosed(InjurySeverity.LIGHT), {
      occurredOn: "2026-07-26",
      severity: InjurySeverity.MODERATE,
      returnRiskScore: 55,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.episode.state).toBe(MedicalEpisodeState.DIAGNOSIS);
    expect(result.value.episode.diagnosis?.severity).toBe(
      InjurySeverity.MODERATE,
    );
    expect(result.value.episode.diagnosis?.revisions).toBe(1);
    expect(result.value.events.map((event) => event.type)).toEqual([
      "DiagnosisRevised",
    ]);
  });
});

describe("MED-4 · plano de tratamento", () => {
  it("DIAGNOSIS → REHAB_S1 emitindo MedicalPlanSet e RehabStarted", () => {
    const result = setMedicalPlan(diagnosed(), {
      occurredOn: "2026-07-24",
      option: TreatmentOption.STANDARD,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.episode.state).toBe(MedicalEpisodeState.REHAB);
    expect(result.value.episode.rehabStage).toBe(1);
    expect(result.value.episode.treatment?.option).toBe(
      TreatmentOption.STANDARD,
    );
    expect(result.value.events.map((event) => event.type)).toEqual([
      "MedicalPlanSet",
      "RehabStarted",
    ]);
  });

  it("prazo do tratamento intensivo é menor que o do conservador", () => {
    const intensive = setMedicalPlan(diagnosed(), {
      occurredOn: "2026-07-24",
      option: TreatmentOption.INTENSIVE,
    });
    const conservative = setMedicalPlan(diagnosed(), {
      occurredOn: "2026-07-24",
      option: TreatmentOption.CONSERVATIVE,
    });

    expect(intensive.ok && conservative.ok).toBe(true);
    if (!intensive.ok || !conservative.ok) return;
    const intensiveReturn = intensive.value.episode.treatment?.estimatedReturnOn;
    const conservativeReturn =
      conservative.value.episode.treatment?.estimatedReturnOn;
    expect(String(intensiveReturn) < String(conservativeReturn)).toBe(true);
  });

  it("recusa cirurgia em lesão leve — TREATMENT_NOT_RECOMMENDED", () => {
    const result = setMedicalPlan(diagnosed(InjurySeverity.MINOR), {
      occurredOn: "2026-07-24",
      option: TreatmentOption.SURGERY,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("TREATMENT_NOT_RECOMMENDED");
  });

  it("só oferece opções recomendadas para a gravidade", () => {
    const minor = treatmentOptionsFor(InjurySeverity.MINOR).map(
      (profile) => profile.option,
    );
    const critical = treatmentOptionsFor(InjurySeverity.CRITICAL).map(
      (profile) => profile.option,
    );

    expect(minor).not.toContain(TreatmentOption.SURGERY);
    expect(critical).toContain(TreatmentOption.SURGERY);
  });

  it("não define plano sem diagnóstico fechado", () => {
    const result = setMedicalPlan(openEpisode(), {
      occurredOn: "2026-07-22",
      option: TreatmentOption.STANDARD,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("MEDICAL_PLAN_INVALID");
  });
});

describe("MED-5/6/7 · reabilitação em 7 estágios", () => {
  it("avança um estágio por vez, sem pular", () => {
    const episode = inRehab(3);

    expect(episode.state).toBe(MedicalEpisodeState.REHAB);
    expect(episode.rehabStage).toBe(3);
  });

  it("a entrada em S4 é o retorno ao treino", () => {
    const advanced = advanceRehabStage(inRehab(3), {
      occurredOn: "2026-07-30",
    });

    expect(advanced.ok).toBe(true);
    if (!advanced.ok) return;
    expect(advanced.value.episode.rehabStage).toBe(RETURN_TO_TRAINING_STAGE);
    expect(advanced.value.events.map((event) => event.type)).toEqual([
      "RehabStageAdvanced",
      "ReturnedToTraining",
    ]);
  });

  it("concluir S7 leva a COMPETITIVE_RETURN com MedicallyCleared", () => {
    const advanced = advanceRehabStage(inRehab(7), {
      occurredOn: "2026-08-20",
    });

    expect(advanced.ok).toBe(true);
    if (!advanced.ok) return;
    expect(advanced.value.episode.state).toBe(
      MedicalEpisodeState.COMPETITIVE_RETURN,
    );
    expect(advanced.value.episode.rehabStage).toBeNull();
    expect(advanced.value.events.map((event) => event.type)).toEqual([
      "MedicallyCleared",
    ]);
  });
});

describe("MED-8 · alta", () => {
  it("COMPETITIVE_RETURN → DISCHARGE emitindo PlayerRecovered", () => {
    const cleared = advanceRehabStage(inRehab(7), {
      occurredOn: "2026-08-20",
    });
    if (!cleared.ok) throw new Error("MED-7 devia ter sucedido");

    const result = dischargePlayer(cleared.value.episode, {
      occurredOn: "2026-08-21",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.episode.state).toBe(MedicalEpisodeState.DISCHARGE);
    expect(result.value.episode.dischargedOn).toBe("2026-08-21");
    expect(result.value.events.map((event) => event.type)).toEqual([
      "PlayerRecovered",
    ]);
  });

  it("episódio com alta não aceita mais transição", () => {
    const cleared = advanceRehabStage(inRehab(7), {
      occurredOn: "2026-08-20",
    });
    if (!cleared.ok) throw new Error("MED-7 devia ter sucedido");
    const discharged = dischargePlayer(cleared.value.episode, {
      occurredOn: "2026-08-21",
    });
    if (!discharged.ok) throw new Error("MED-8 devia ter sucedido");

    const result = advanceRehabStage(discharged.value.episode, {
      occurredOn: "2026-08-22",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("PLAYER_NOT_INJURED");
  });
});

describe("RELAPSE · o retorno forçado tem consequência real", () => {
  it("risco de recaída cai conforme o estágio avança", () => {
    const early = relapseRiskScore(inRehab(1));
    const late = relapseRiskScore(inRehab(6));

    expect(early).toBeGreaterThan(late);
  });

  it("liberado em S7 e sem recaída: vai a COMPETITIVE_RETURN", () => {
    const result = forceReturn(inRehab(7), {
      occurredOn: "2026-08-20",
      relapseRoll: 0.99,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.episode.state).toBe(
      MedicalEpisodeState.COMPETITIVE_RETURN,
    );
    expect(result.value.episode.relapseCount).toBe(0);
  });

  it("forçar em S2 com sorteio ruim recai e volta um estágio", () => {
    const result = forceReturn(inRehab(2), {
      occurredOn: "2026-07-28",
      relapseRoll: 0.0,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.episode.state).toBe(MedicalEpisodeState.REHAB);
    expect(result.value.episode.rehabStage).toBe(1);
    expect(result.value.episode.relapseCount).toBe(1);
    expect(result.value.events.map((event) => event.type)).toEqual([
      "InjuryRelapsed",
    ]);
  });

  it("a recaída pode agravar a lesão", () => {
    const result = forceReturn(inRehab(2, InjurySeverity.LIGHT), {
      occurredOn: "2026-07-28",
      relapseRoll: 0.0,
      aggravationRoll: 0.0,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.episode.diagnosis?.severity).toBe(
      InjurySeverity.MODERATE,
    );
  });

  it("recaída de S1 reentra em EVALUATION — não existe S0", () => {
    const result = forceReturn(inRehab(1), {
      occurredOn: "2026-07-25",
      relapseRoll: 0.0,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.episode.state).toBe(MedicalEpisodeState.EVALUATION);
    expect(result.value.episode.rehabStage).toBeNull();
  });

  it("mesmo sorteio, mesmo desfecho — a decisão é determinística", () => {
    const first = forceReturn(inRehab(3), {
      occurredOn: "2026-07-29",
      relapseRoll: 0.2,
    });
    const second = forceReturn(inRehab(3), {
      occurredOn: "2026-07-29",
      relapseRoll: 0.2,
    });

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.value.episode).toEqual(second.value.episode);
  });
});

describe("aposentadoria médica · terminal absoluto", () => {
  it("exige rito de confirmação explícito", () => {
    const result = retireMedically(inRehab(2, InjurySeverity.CRITICAL), {
      occurredOn: "2026-08-01",
      confirmed: false,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("MEDICAL_PLAN_INVALID");
  });

  it("só a partir de lesão grave", () => {
    const result = retireMedically(inRehab(2, InjurySeverity.LIGHT), {
      occurredOn: "2026-08-01",
      confirmed: true,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("TREATMENT_NOT_RECOMMENDED");
  });

  it("confirmada, fecha o episódio em MEDICAL_RETIREMENT", () => {
    const result = retireMedically(inRehab(2, InjurySeverity.CRITICAL), {
      occurredOn: "2026-08-01",
      confirmed: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.episode.state).toBe(
      MedicalEpisodeState.MEDICAL_RETIREMENT,
    );
    expect(result.value.events.map((event) => event.type)).toEqual([
      "MedicalRetirement",
    ]);
  });
});

describe("continuidade e concorrência", () => {
  it("cada transição incrementa a versão do agregado", () => {
    const episode = openEpisode();
    const exams = orderMedicalExam(episode, { occurredOn: "2026-07-22" });

    expect(exams.ok).toBe(true);
    if (!exams.ok) return;
    expect(exams.value.episode.version).toBe(episode.version + 1);
  });

  it("a data da lesão não muda ao longo do episódio (atravessa a virada)", () => {
    expect(inRehab(5).occurredOn).toBe(OPEN_INPUT.occurredOn);
  });
});
