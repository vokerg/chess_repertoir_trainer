import type { OpeningClassificationRule } from './openingClassification.types';

/**
 * Corrected replacements for foundation or coverage rules whose first draft had
 * overly broad or overly narrow punctuation/name handling. The service removes
 * the superseded definitions before appending these replacements, preserving
 * stable rule IDs.
 */
export const OPENING_CLASSIFICATION_COVERAGE_CORRECTIONS: readonly OpeningClassificationRule[] = [
  {
    id: 'family-london-system',
    namePattern: /^(?:London System|(?:Queen's Pawn Game|Indian Defense): (?:Accelerated )?London System)(?:\b|:|,)/i,
    white: { soundness: 'SOUND', character: ['SOLID', 'POSITIONAL'], theoreticalStatus: 'MAINLINE', theoryBurden: 'MEDIUM', roles: ['INITIATOR'], confidence: 'HIGH' },
    black: { soundness: 'SOUND', character: ['BALANCED', 'DYNAMIC'], theoreticalStatus: 'MAINLINE', theoryBurden: 'MEDIUM', roles: ['RESPONDER'], confidence: 'HIGH' },
    rationale: 'London identity is preserved across the generated standalone, Queen’s Pawn Game and Indian Defense naming forms, including accelerated move orders.',
  },
  {
    id: 'family-formation-attacks',
    namePattern: /^(?:Formation|Creepy Crawly Formation)(?:\b|:|,)/i,
    white: { character: ['SURPRISE'], theoreticalStatus: 'SURPRISE', theoryBurden: 'LOW', roles: ['INITIATOR'], confidence: 'LOW' },
    black: { character: ['BALANCED'], theoreticalStatus: 'MAINLINE', theoryBurden: 'LOW', roles: ['RESPONDER'], confidence: 'LOW' },
    rationale: 'These formation labels describe unusual setups too diverse for a reliable objective soundness judgment, so only low-confidence structural traits are assigned.',
  },
  {
    id: 'family-rare-white-opening-systems',
    namePattern: /^(?:(?:Amsterdam Attack|Anderssen's Opening|Canard Opening|Clemenz Opening|Dresden Opening|Global Opening|Lasker Simul Special|Paleface Attack|Portuguese Opening|Valencia Opening|Yusupov-Rubinstein System)(?:\b|:|,)|Queen's Pawn(?:,|$))/i,
    white: { character: ['SURPRISE'], theoreticalStatus: 'SURPRISE', theoryBurden: 'LOW', roles: ['INITIATOR'], confidence: 'LOW' },
    black: { character: ['BALANCED'], theoreticalStatus: 'MAINLINE', theoryBurden: 'LOW', roles: ['RESPONDER'], confidence: 'LOW' },
    rationale: 'These rare White systems are grouped only for low-confidence surprise and role traits; objective soundness remains explicitly unknown.',
  },
];
