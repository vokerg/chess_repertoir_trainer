import type { OpeningKnowledgeRule } from './openingKnowledge.types';
import { OPENING_KNOWLEDGE_RULES as BASE_OPENING_KNOWLEDGE_RULES } from './openingKnowledge.base.rules';
import { OPENING_KNOWLEDGE_EXPANSION_RULES } from './openingKnowledge.expansion.rules';

export const OPENING_KNOWLEDGE_RULES: readonly OpeningKnowledgeRule[] = [
  ...BASE_OPENING_KNOWLEDGE_RULES,
  ...OPENING_KNOWLEDGE_EXPANSION_RULES,
];
