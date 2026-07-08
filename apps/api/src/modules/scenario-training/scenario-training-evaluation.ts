export interface ScenarioAttemptEvaluationInput {
  moveUci: string;
  referenceBestMoveUci: string | null | undefined;
  originalUserMoveUci: string | null | undefined;
  sessionBaselineUserEvalCp: number | null | undefined;
  submittedBaselineUserEvalCp: number | null | undefined;
  afterUserEvalCp: number | null | undefined;
  passToleranceCp: number;
}

export interface ScenarioAttemptEvaluation {
  baselineUserEvalCp: number | null;
  deltaCp: number | null;
  passed: boolean;
}

function sameUciMove(a: string | null | undefined, b: string | null | undefined): boolean {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

export function evaluateScenarioAttempt(input: ScenarioAttemptEvaluationInput): ScenarioAttemptEvaluation {
  const baselineUserEvalCp = input.sessionBaselineUserEvalCp ?? input.submittedBaselineUserEvalCp ?? null;
  const afterUserEvalCp = input.afterUserEvalCp ?? null;
  const deltaCp = baselineUserEvalCp !== null && afterUserEvalCp !== null
    ? baselineUserEvalCp - afterUserEvalCp
    : null;
  const passedByEval = baselineUserEvalCp !== null && afterUserEvalCp !== null
    ? afterUserEvalCp >= baselineUserEvalCp - input.passToleranceCp
    : false;
  const passedByReference = sameUciMove(input.moveUci, input.referenceBestMoveUci);
  const repeatsOriginalGameMove = sameUciMove(input.moveUci, input.originalUserMoveUci);

  return {
    baselineUserEvalCp,
    deltaCp,
    passed: passedByReference || (!repeatsOriginalGameMove && passedByEval),
  };
}
