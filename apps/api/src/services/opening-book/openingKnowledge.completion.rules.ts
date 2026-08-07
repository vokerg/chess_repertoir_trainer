import type { OpeningKnowledgeRule } from './openingKnowledge.types';
import {
  completionFamilyRule,
  type OpeningKnowledgeCompletionFamily,
} from './openingKnowledge.completion.shared';
import { OPENING_KNOWLEDGE_COMPLETION_BATCH_1 } from './openingKnowledge.completion.batch1';
import { OPENING_KNOWLEDGE_COMPLETION_BATCH_2 } from './openingKnowledge.completion.batch2';
import { OPENING_KNOWLEDGE_COMPLETION_BATCH_3 } from './openingKnowledge.completion.batch3';
import { OPENING_KNOWLEDGE_COMPLETION_BATCH_4 } from './openingKnowledge.completion.batch4';

export const OPENING_KNOWLEDGE_COMPLETION_FAMILIES: readonly OpeningKnowledgeCompletionFamily[] = [
  ...OPENING_KNOWLEDGE_COMPLETION_BATCH_1,
  ...OPENING_KNOWLEDGE_COMPLETION_BATCH_2,
  ...OPENING_KNOWLEDGE_COMPLETION_BATCH_3,
  ...OPENING_KNOWLEDGE_COMPLETION_BATCH_4,
];

export const OPENING_KNOWLEDGE_COMPLETION_RULES: readonly OpeningKnowledgeRule[] =
  OPENING_KNOWLEDGE_COMPLETION_FAMILIES.map(completionFamilyRule);
