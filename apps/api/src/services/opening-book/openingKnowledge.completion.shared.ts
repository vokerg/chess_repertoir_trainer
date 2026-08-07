import type {
  OpeningKnowledgeConfidence,
  OpeningKnowledgeRule,
  OpeningKnowledgeStatement,
  OpeningStrategicPlan,
} from './openingKnowledge.types';

const COMPLETION_SOURCES = [
  'project-editorial-rb-025-completion',
  'lichess-chess-openings',
] as const;

export type CompletionKind = 'FULL' | 'DESCRIPTION_ONLY';

export interface OpeningKnowledgeCompletionFamily {
  readonly family: string;
  readonly fixture: string;
  readonly id: string;
  readonly kind: CompletionKind;
  readonly confidence: OpeningKnowledgeConfidence;
  readonly orientation: string;
  readonly whiteSummary?: string;
  readonly blackSummary?: string;
}

function statement(
  text: string,
  confidence: OpeningKnowledgeConfidence,
): OpeningKnowledgeStatement {
  return { text, confidence, sourceIds: COMPLETION_SOURCES };
}

function plan(
  id: string,
  side: 'white' | 'black',
  summary: string,
  confidence: OpeningKnowledgeConfidence,
): OpeningStrategicPlan {
  return {
    id: `${id}-${side}-priorities`,
    title: side === 'white' ? 'White priorities' : 'Black priorities',
    summary,
    conditions: [
      'Apply the plan to the actual pawn structure and piece placement, not the opening name alone.',
    ],
    caveats: [
      'Named subvariations can change tactics and move order; this is strategic orientation, not a forced move recommendation.',
    ],
    confidence,
    sourceIds: COMPLETION_SOURCES,
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function lowerInitial(value: string): string {
  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
}

export function completionFamilyRule(
  item: OpeningKnowledgeCompletionFamily,
): OpeningKnowledgeRule {
  const selector = {
    namePattern: new RegExp(`^${escapeRegex(item.family)}(?::|,|$)`, 'i'),
  };
  const description = statement(item.orientation, item.confidence);

  if (item.kind === 'DESCRIPTION_ONLY') {
    return {
      id: `knowledge-completion-${item.id}`,
      revision: 1,
      lifecycle: 'REVIEWED',
      selector,
      description,
      rationale: `Completes the missing descriptive layer for ${item.family} without replacing its existing side-specific knowledge.`,
    };
  }

  if (!item.whiteSummary || !item.blackSummary) {
    throw new Error(`Full completion family ${item.family} must define both side summaries`);
  }

  return {
    id: `knowledge-completion-${item.id}`,
    revision: 1,
    lifecycle: 'REVIEWED',
    selector,
    shortDescription: description,
    description: statement(
      `${item.orientation} White's practical priority is to ${lowerInitial(item.whiteSummary)} Black's practical priority is to ${lowerInitial(item.blackSummary)}`,
      item.confidence,
    ),
    white: {
      strategicSummary: statement(item.whiteSummary, item.confidence),
      plans: [plan(item.id, 'white', item.whiteSummary, item.confidence)],
    },
    black: {
      strategicSummary: statement(item.blackSummary, item.confidence),
      plans: [plan(item.id, 'black', item.blackSummary, item.confidence)],
    },
    rationale: `Provides explicit two-sided strategic orientation for the previously uncovered ${item.family} family.`,
  };
}
