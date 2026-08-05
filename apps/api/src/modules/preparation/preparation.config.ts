import type { PreparationLane, PreparationStage } from './preparation.types';

export interface PreparationConfig {
  firstIndexBatchSize: number;
  indexContinuationBatchSize: number;
  firstAnalysisBatchSize: number;
  analysisTailBatchSize: number;
  maxNonTerminalBatches: number;
  maxQueuedTasks: number;
  maxQueuedAnalysisTasks: number;
}

export const DEFAULT_PREPARATION_CONFIG: Readonly<PreparationConfig> = {
  firstIndexBatchSize: 50,
  indexContinuationBatchSize: 50,
  firstAnalysisBatchSize: 3,
  analysisTailBatchSize: 10,
  maxNonTerminalBatches: 4,
  maxQueuedTasks: 200,
  maxQueuedAnalysisTasks: 40,
};

export const PREPARATION_LANE_PRIORITIES: Readonly<Record<Exclude<PreparationLane, 'RETRY'>, number>> = {
  FIRST_INDEX: 200,
  FIRST_ANALYSIS: 190,
  INDEX_CONTINUATION: 180,
  ANALYSIS_TAIL: 100,
};

export function readPreparationConfig(
  env: NodeJS.ProcessEnv = process.env,
): PreparationConfig {
  return {
    firstIndexBatchSize: positiveInteger(
      env['PREPARATION_FIRST_INDEX_BATCH_SIZE'],
      DEFAULT_PREPARATION_CONFIG.firstIndexBatchSize,
      'PREPARATION_FIRST_INDEX_BATCH_SIZE',
    ),
    indexContinuationBatchSize: positiveInteger(
      env['PREPARATION_INDEX_CONTINUATION_BATCH_SIZE'],
      DEFAULT_PREPARATION_CONFIG.indexContinuationBatchSize,
      'PREPARATION_INDEX_CONTINUATION_BATCH_SIZE',
    ),
    firstAnalysisBatchSize: positiveInteger(
      env['PREPARATION_FIRST_ANALYSIS_BATCH_SIZE'],
      DEFAULT_PREPARATION_CONFIG.firstAnalysisBatchSize,
      'PREPARATION_FIRST_ANALYSIS_BATCH_SIZE',
    ),
    analysisTailBatchSize: positiveInteger(
      env['PREPARATION_ANALYSIS_TAIL_BATCH_SIZE'],
      DEFAULT_PREPARATION_CONFIG.analysisTailBatchSize,
      'PREPARATION_ANALYSIS_TAIL_BATCH_SIZE',
    ),
    maxNonTerminalBatches: positiveInteger(
      env['PREPARATION_MAX_NON_TERMINAL_BATCHES'],
      DEFAULT_PREPARATION_CONFIG.maxNonTerminalBatches,
      'PREPARATION_MAX_NON_TERMINAL_BATCHES',
    ),
    maxQueuedTasks: positiveInteger(
      env['PREPARATION_MAX_QUEUED_TASKS'],
      DEFAULT_PREPARATION_CONFIG.maxQueuedTasks,
      'PREPARATION_MAX_QUEUED_TASKS',
    ),
    maxQueuedAnalysisTasks: positiveInteger(
      env['PREPARATION_MAX_QUEUED_ANALYSIS_TASKS'],
      DEFAULT_PREPARATION_CONFIG.maxQueuedAnalysisTasks,
      'PREPARATION_MAX_QUEUED_ANALYSIS_TASKS',
    ),
  };
}

export function preparationBatchLimit(
  config: PreparationConfig,
  stage: PreparationStage,
  lane: PreparationLane,
): number {
  switch (lane) {
    case 'FIRST_INDEX':
      assertStage(stage, 'INDEX', lane);
      return config.firstIndexBatchSize;
    case 'INDEX_CONTINUATION':
      assertStage(stage, 'INDEX', lane);
      return config.indexContinuationBatchSize;
    case 'FIRST_ANALYSIS':
      assertStage(stage, 'ANALYSIS', lane);
      return config.firstAnalysisBatchSize;
    case 'ANALYSIS_TAIL':
      assertStage(stage, 'ANALYSIS', lane);
      return config.analysisTailBatchSize;
    case 'RETRY':
      return stage === 'INDEX'
        ? config.indexContinuationBatchSize
        : config.analysisTailBatchSize;
  }
}

export function preparationLanePriority(
  stage: PreparationStage,
  lane: PreparationLane,
): number {
  if (lane === 'RETRY') {
    return stage === 'INDEX'
      ? PREPARATION_LANE_PRIORITIES.INDEX_CONTINUATION
      : PREPARATION_LANE_PRIORITIES.ANALYSIS_TAIL;
  }
  return PREPARATION_LANE_PRIORITIES[lane];
}

function positiveInteger(
  raw: string | undefined,
  fallback: number,
  name: string,
): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return value;
}

function assertStage(
  actual: PreparationStage,
  expected: PreparationStage,
  lane: PreparationLane,
): void {
  if (actual !== expected) {
    throw new Error(`${lane} is only valid for the ${expected} stage.`);
  }
}
