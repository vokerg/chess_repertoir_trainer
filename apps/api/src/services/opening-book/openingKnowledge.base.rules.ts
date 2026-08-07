import type {
  OpeningKnowledgeConfidence,
  OpeningKnowledgeRule,
  OpeningKnowledgeStatement,
  OpeningStrategicPlan,
} from './openingKnowledge.types';

const BASE_SOURCES = [
  'project-editorial-rb-022',
  'project-rb-021-foundation',
  'lichess-chess-openings',
] as const;

function sourceIds(...extra: string[]): readonly string[] {
  return [...BASE_SOURCES, ...extra];
}

function statement(
  text: string,
  confidence: OpeningKnowledgeConfidence = 'HIGH',
  sources: readonly string[] = BASE_SOURCES,
): OpeningKnowledgeStatement {
  return { text, confidence, sourceIds: sources };
}

function plan(
  id: string,
  title: string,
  summary: string,
  options: {
    conditions?: readonly string[];
    caveats?: readonly string[];
    confidence?: OpeningKnowledgeConfidence;
    sources?: readonly string[];
  } = {},
): OpeningStrategicPlan {
  return {
    id,
    title,
    summary,
    conditions: options.conditions,
    caveats: options.caveats,
    confidence: options.confidence ?? 'HIGH',
    sourceIds: options.sources ?? BASE_SOURCES,
  };
}

/**
 * Rules are declared from broad families to narrow strategic exceptions.
 * Only REVIEWED rules are projected by OpeningKnowledgeService.
 */
export const OPENING_KNOWLEDGE_RULES: readonly OpeningKnowledgeRule[] = [
  {
    id: 'knowledge-family-english-opening',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: { allClassificationRuleIds: ['family-english-opening'] },
    shortDescription: statement('A flexible flank opening that pressures the centre before fixing the pawn structure.', 'HIGH', sourceIds('lichess-english-opening')),
    description: statement('White begins with queenside influence and delayed central commitment. The opening can remain independent or transpose into Réti, Catalan, Queen’s Gambit or reversed Sicilian structures.', 'MEDIUM', sourceIds('lichess-english-opening')),
    white: {
      strategicSummary: statement('Keep central options open, use the c-pawn and queenside pieces to influence d5, and choose the eventual pawn structure deliberately.', 'MEDIUM', sourceIds('lichess-english-opening')),
      plans: [
        plan('english-white-control-d5', 'Control d5', 'Coordinate the c-pawn, knight and kingside bishop around pressure on d5 before committing the central pawns.', { caveats: ['Concrete Black occupation of d5 may require an immediate challenge rather than slow manoeuvring.'], sources: sourceIds('lichess-english-opening') }),
      ],
    },
    black: {
      strategicSummary: statement('Claim central space when it is safe, or mirror White’s flexibility while preparing an active break.', 'MEDIUM', sourceIds('lichess-english-opening')),
      plans: [
        plan('english-black-claim-or-challenge-centre', 'Claim or challenge the centre', 'Use ...e5 or ...c5 structures, or prepare ...d5, according to White’s move order and piece placement.', { caveats: ['The correct break depends strongly on transposition and move order.'], sources: sourceIds('lichess-english-opening') }),
      ],
    },
    rationale: 'Provides broad English guidance while preserving transpositional caveats.',
  },
  {
    id: 'knowledge-family-reti-opening',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: { allClassificationRuleIds: ['family-reti-opening'] },
    shortDescription: statement('A flexible hypermodern opening built around piece pressure and delayed central commitment.', 'HIGH', sourceIds('lichess-english-opening')),
    description: statement('White develops without immediately occupying the centre, inviting Black to reveal a structure before choosing between c4, d4 or related transpositions.', 'MEDIUM', sourceIds('lichess-english-opening')),
    white: {
      strategicSummary: statement('Develop harmoniously, pressure the centre from the flanks and postpone irreversible pawn choices until Black’s setup is clear.', 'MEDIUM', sourceIds('lichess-english-opening')),
      plans: [
        plan('reti-white-provoke-and-undermine-centre', 'Provoke and undermine the centre', 'Allow Black to occupy central squares only when the resulting targets can be challenged by c4, d4 or piece pressure.', { caveats: ['Do not concede a stable space advantage without a concrete undermining plan.'], sources: sourceIds('lichess-english-opening') }),
      ],
    },
    black: {
      strategicSummary: statement('Use the extra freedom to establish a sound centre, but keep it defensible against flank pressure and transposition.', 'MEDIUM', sourceIds('lichess-english-opening')),
      plans: [
        plan('reti-black-build-defensible-centre', 'Build a defensible centre', 'Occupy central space with development support and remain ready to meet c4 or d4 breaks.', { caveats: ['Overextension can turn the apparent space gain into a target.'], sources: sourceIds('lichess-english-opening') }),
      ],
    },
    rationale: 'Defines Réti-specific orientation without assuming one final pawn structure.',
  },
  {
    id: 'knowledge-english-reti-transposition',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: { anyClassificationRuleIds: ['family-english-opening', 'family-reti-opening'] },
    white: {
      plans: [
        plan('flank-white-track-transposition', 'Track the transposition', 'Re-evaluate plans after each central pawn commitment because the position may have become a Catalan, Queen’s Gambit, reversed Sicilian or independent flank structure.', { confidence: 'HIGH', caveats: ['Opening labels alone do not determine the final strategic plan.'], sources: sourceIds('lichess-english-opening') }),
      ],
    },
    black: {
      plans: [
        plan('flank-black-track-transposition', 'Track the transposition', 'Identify the actual pawn structure rather than relying on the original move order when selecting breaks and piece placements.', { confidence: 'HIGH', caveats: ['The same named opening can reach materially different structures.'], sources: sourceIds('lichess-english-opening') }),
      ],
    },
    rationale: 'Adds shared transposition discipline without duplicating the family descriptions.',
  },
  {
    id: 'knowledge-family-sicilian-defense',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: { allClassificationRuleIds: ['family-sicilian-defense'] },
    shortDescription: statement('An asymmetric defence to 1.e4 that trades immediate symmetry for active counterplay.', 'HIGH', sourceIds('lichess-sicilian-najdorf')),
    description: statement('Black contests the centre with the c-pawn and accepts an unbalanced structure. White commonly gains space and attacking chances while Black seeks central and queenside counterplay.', 'MEDIUM', sourceIds('lichess-sicilian-najdorf')),
    white: {
      strategicSummary: statement('Use the development lead and central space before Black’s counterplay becomes fully coordinated.', 'MEDIUM', sourceIds('lichess-sicilian-najdorf')),
      plans: [
        plan('sicilian-white-use-space-and-development', 'Use space and development', 'Complete development quickly and connect central pressure with an attack appropriate to the chosen Sicilian branch.', { caveats: ['Pawn storms and castling plans vary sharply between subfamilies.'], sources: sourceIds('lichess-sicilian-najdorf') }),
      ],
    },
    black: {
      strategicSummary: statement('Create counterplay against White’s centre and queenside while keeping tactical breaks available.', 'MEDIUM', sourceIds('lichess-sicilian-najdorf')),
      plans: [
        plan('sicilian-black-counter-centre-and-queenside', 'Counter the centre and queenside', 'Use open files, pressure on central pawns and timely ...d5 or ...e5 breaks when the branch permits.', { caveats: ['The correct break and timing are variation-specific.'], sources: sourceIds('lichess-sicilian-najdorf') }),
      ],
    },
    rationale: 'Establishes broad asymmetric Sicilian plans for narrower rules to refine.',
  },
  {
    id: 'knowledge-subfamily-sicilian-najdorf',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: { allClassificationRuleIds: ['family-sicilian-defense', 'subfamily-sicilian-najdorf'] },
    shortDescription: statement('A flexible and highly theoretical Sicilian where Black restrains the queenside and preserves several central setups.', 'HIGH', sourceIds('lichess-sicilian-najdorf')),
    white: {
      strategicSummary: statement('Choose a coherent development and castling scheme, then act before Black completes the preferred central break.', 'MEDIUM', sourceIds('lichess-sicilian-najdorf')),
      plans: [
        plan('najdorf-white-coordinate-before-attack', 'Coordinate before attacking', 'Finish development and align the attack with the chosen setup instead of launching pawns without piece support.', { caveats: ['English Attack, Poisoned Pawn and quieter same-side-castling lines require different tempos.'], sources: sourceIds('lichess-sicilian-najdorf') }),
      ],
    },
    black: {
      strategicSummary: statement('Use ...a6 to control queenside expansion, select an appropriate ...e5 or ...e6 structure and generate counterplay before White’s attack lands.', 'MEDIUM', sourceIds('lichess-sicilian-najdorf')),
      plans: [
        plan('najdorf-black-choose-central-setup', 'Choose the central setup', 'Coordinate ...e5 or ...e6 with queenside development and tactical control of d5.', { caveats: ['The choice is line-specific and cannot be inferred from the family name alone.'], sources: sourceIds('lichess-sicilian-najdorf') }),
      ],
    },
    rationale: 'Refines broad Sicilian guidance for the Najdorf family.',
  },
  {
    id: 'knowledge-line-najdorf-english-attack',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: {
      allClassificationRuleIds: ['subfamily-sicilian-najdorf'],
      namePattern: /^Sicilian Defense: Najdorf Variation(?:,|:) English Attack/i,
    },
    white: {
      strategicSummary: statement('Prepare queenside castling and a supported kingside pawn advance while watching Black’s central counterplay.', 'HIGH', sourceIds('lichess-najdorf-english-attack')),
      plans: [
        plan('najdorf-english-white-opposite-wing-attack', 'Build the kingside attack', 'Coordinate f3, Qd2, long castling and pawn advances only when development and the centre are stable.', { conditions: ['White has chosen the English Attack development scheme.'], caveats: ['Black’s central break can outrun a slow pawn storm.'], sources: sourceIds('lichess-najdorf-english-attack') }),
      ],
    },
    black: {
      strategicSummary: statement('Counter on the queenside and in the centre immediately enough that White cannot attack without cost.', 'HIGH', sourceIds('lichess-najdorf-english-attack')),
      plans: [
        plan('najdorf-english-black-race-with-counterplay', 'Race with counterplay', 'Use queenside expansion, pressure on the c-file and a timely central break against White’s opposite-side castling setup.', { conditions: ['White is preparing or has castled queenside.'], caveats: ['Purely defensive play usually gives White time to organize.'], sources: sourceIds('lichess-najdorf-english-attack') }),
      ],
    },
    rationale: 'Adds the opposite-wing race that is not safe as a generic Najdorf plan.',
  },
  {
    id: 'knowledge-line-najdorf-poisoned-pawn',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: {
      allClassificationRuleIds: ['subfamily-sicilian-najdorf'],
      namePattern: /Poisoned Pawn/i,
    },
    white: {
      planMode: 'REPLACE',
      strategicSummary: statement('Use development, open lines and threats against the displaced queen as compensation for the queenside pawn.', 'MEDIUM', sourceIds('lichess-najdorf-poisoned-pawn')),
      plans: [
        plan('najdorf-poisoned-white-activity-before-material', 'Prioritize activity over material', 'Develop with tempo and open lines before considering recovery of the sacrificed pawn.', { conditions: ['Black has accepted the poisoned pawn and the queen is exposed.'], caveats: ['This branch is concrete; generic slow Najdorf plans are misleading.'], confidence: 'MEDIUM', sources: sourceIds('lichess-najdorf-poisoned-pawn') }),
      ],
    },
    black: {
      planMode: 'REPLACE',
      strategicSummary: statement('Consolidate the extra material without allowing the queen to become trapped or development to collapse.', 'MEDIUM', sourceIds('lichess-najdorf-poisoned-pawn')),
      plans: [
        plan('najdorf-poisoned-black-consolidate-queen', 'Consolidate the queen and material', 'Meet forcing threats accurately, complete development and only then convert the extra pawn.', { conditions: ['Black has taken the queenside pawn.'], caveats: ['Material is secondary until king safety and queen mobility are secured.'], confidence: 'MEDIUM', sources: sourceIds('lichess-najdorf-poisoned-pawn') }),
      ],
    },
    rationale: 'Exercises knowledge-only narrow selection and full side replacement for a concrete exception.',
  },
  {
    id: 'knowledge-family-french-defense',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: { allClassificationRuleIds: ['family-french-defense'] },
    shortDescription: statement('A sound defence that accepts less space in exchange for a resilient pawn chain and counterattacking breaks.', 'HIGH', sourceIds('lichess-french-defense')),
    description: statement('Black supports d5 with e6 and challenges White’s centre later. Closed structures often revolve around attacking the base and head of the pawn chain, while the light-squared bishop requires deliberate development.', 'HIGH', sourceIds('lichess-french-defense')),
    white: {
      strategicSummary: statement('Use the space advantage, support the centre and attack where the pawn chain points.', 'HIGH', sourceIds('lichess-french-defense')),
      plans: [
        plan('french-white-use-space-and-pawn-chain', 'Use the space advantage', 'Support the advanced centre and prepare play against the kingside or the base of Black’s pawn chain.', { conditions: ['The central pawn chain remains closed.'], caveats: ['Exchange structures require a different plan.'], sources: sourceIds('lichess-french-defense') }),
      ],
    },
    black: {
      strategicSummary: statement('Undermine White’s centre with thematic breaks and solve the light-squared bishop before the space disadvantage becomes permanent.', 'HIGH', sourceIds('lichess-french-defense')),
      plans: [
        plan('french-black-undermine-centre', 'Attack the pawn chain', 'Challenge White’s centre with ...c5 and, when prepared, ...f6 while improving the light-squared bishop.', { conditions: ['White retains an advanced e-pawn chain.'], caveats: ['The order of breaks depends on the exact variation.'], sources: sourceIds('lichess-french-defense') }),
      ],
    },
    rationale: 'Defines the closed-chain family baseline that the Exchange rule replaces.',
  },
  {
    id: 'knowledge-line-french-exchange',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: {
      allClassificationRuleIds: ['family-french-defense', 'modifier-exchange-variation'],
      namePattern: /^French Defense: Exchange Variation/i,
    },
    shortDescription: statement('An open, symmetrical French structure where piece activity matters more than attacking a closed pawn chain.', 'HIGH', sourceIds('lichess-french-defense')),
    description: statement('The early central exchange removes the defining closed chain. Both sides should compete for active development, open files and purposeful imbalances rather than importing plans from the Advance structures.', 'HIGH', sourceIds('lichess-french-defense')),
    white: {
      planMode: 'REPLACE',
      strategicSummary: statement('Use the first move to create active piece play and avoid drifting into sterile symmetry.', 'HIGH', sourceIds('lichess-french-defense')),
      plans: [
        plan('french-exchange-white-create-activity', 'Create activity in the open centre', 'Develop quickly, occupy useful files and introduce an imbalance only when it improves piece coordination.', { caveats: ['Closed-chain kingside attacks do not transfer automatically.'], sources: sourceIds('lichess-french-defense') }),
      ],
    },
    black: {
      planMode: 'REPLACE',
      strategicSummary: statement('Equalize development and contest open files without wasting time on pawn-chain breaks that no longer exist.', 'HIGH', sourceIds('lichess-french-defense')),
      plans: [
        plan('french-exchange-black-activate-pieces', 'Activate the pieces', 'Complete development, contest the e-file and seek useful asymmetry through piece placement or a later pawn break.', { caveats: ['The traditional French bishop problem is reduced but not always eliminated.'], sources: sourceIds('lichess-french-defense') }),
      ],
    },
    rationale: 'Demonstrates full replacement when the defining pawn structure changes.',
  },
  {
    id: 'knowledge-family-caro-kann-defense',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: { allClassificationRuleIds: ['family-caro-kann-defense'] },
    shortDescription: statement('A solid defence that supports ...d5 while usually preserving a route for the light-squared bishop.'),
    description: statement('Black builds a resilient centre with c6 and d5. White often gains space or development targets, while Black aims to complete development without accepting a permanent cramped position.', 'MEDIUM'),
    white: {
      strategicSummary: statement('Use space and development to make Black’s setup passive before it fully consolidates.', 'MEDIUM'),
      plans: [plan('caro-white-use-space-before-consolidation', 'Use space before consolidation', 'Claim useful central space and improve the pieces before choosing a pawn break or kingside expansion.', { caveats: ['Exchange and Panov structures require different pawn-play decisions.'] })],
    },
    black: {
      strategicSummary: statement('Complete the solid setup while developing the light-squared bishop and preparing timely challenges to White’s centre.', 'MEDIUM'),
      plans: [plan('caro-black-develop-bishop-and-challenge-centre', 'Develop and challenge the centre', 'Bring the light-squared bishop outside the pawn chain when appropriate, then use ...c5 or ...e5 breaks to avoid passivity.', { caveats: ['The bishop route and break timing are variation-specific.'] })],
    },
    rationale: 'Adds a distinct solid-defence baseline with its recurring development question.',
  },
  {
    id: 'knowledge-family-london-system',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: { allClassificationRuleIds: ['family-london-system'] },
    shortDescription: statement('A sturdy queen-pawn system with familiar development, but not a move-order-independent autopilot.'),
    description: statement('White builds a compact centre and develops the dark-squared bishop early. The recurring setup is useful, yet Black’s central structure determines whether White should attack, expand or switch to queenside play.', 'MEDIUM'),
    white: {
      strategicSummary: statement('Complete the core setup efficiently, then adapt the pawn break and attacking plan to Black’s actual centre.', 'MEDIUM'),
      plans: [plan('london-white-complete-setup-then-adapt', 'Complete the setup, then adapt', 'Coordinate Bf4, e3, Nf3 and c3 or c4 without ignoring immediate central challenges.', { caveats: ['Automatic moves can concede the initiative against active ...c5 or ...Qb6 setups.'] })],
    },
    black: {
      strategicSummary: statement('Challenge White’s stable setup before it becomes effortless, especially through central pressure and queenside targets.', 'MEDIUM'),
      plans: [plan('london-black-challenge-centre-and-b2', 'Challenge the setup', 'Use ...c5, ...Qb6 or an early central expansion when supported by development.', { caveats: ['Do not combine plans mechanically when the queen or bishop becomes exposed.'] })],
    },
    rationale: 'Provides system guidance with explicit anti-autopilot caveats.',
  },
  {
    id: 'knowledge-family-queens-gambit',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: { allClassificationRuleIds: ['family-queens-gambit'] },
    shortDescription: statement('A principal queen-pawn opening where White uses the c-pawn to challenge Black’s central support.'),
    description: statement('White offers temporary access to the c-pawn to increase pressure on d5 and seek a durable central advantage. Black can accept and return the pawn or maintain the centre with a declined structure.', 'HIGH'),
    white: {
      strategicSummary: statement('Increase pressure on d5, complete development and use the c-file or central breaks according to Black’s response.', 'HIGH'),
      plans: [plan('queens-gambit-white-pressure-d5', 'Pressure d5', 'Use cxd5, e4 or queenside pressure only when development supports the resulting centre.', { caveats: ['Accepted and declined structures diverge quickly.'] })],
    },
    black: {
      strategicSummary: statement('Choose between holding central space and temporarily accepting the c-pawn, then develop without creating a lasting weakness.', 'HIGH'),
      plans: [plan('queens-gambit-black-resolve-central-tension', 'Resolve the central tension deliberately', 'Base acceptance, support or exchange of d5 on a coherent development plan rather than pawn retention alone.', { caveats: ['QGA and QGD require different follow-up plans.'] })],
    },
    rationale: 'Establishes the family description before accepted and declined refinements.',
  },
  {
    id: 'knowledge-line-queens-gambit-declined',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: { allClassificationRuleIds: ['line-queens-gambit-declined'] },
    white: {
      strategicSummary: statement('Build pressure against the d5 structure and prepare the central break that best matches the piece placement.'),
      plans: [plan('qgd-white-pressure-and-break', 'Build pressure, then break', 'Use development, c-file pressure and e4 or minority-play ideas according to the resulting pawn structure.', { caveats: ['Carlsbad, isolated-queen-pawn and hanging-pawn structures need different plans.'] })],
    },
    black: {
      strategicSummary: statement('Maintain a sound centre, solve the light-squared bishop and free the position with ...c5 or ...e5 at the right moment.'),
      plans: [plan('qgd-black-free-the-position', 'Free the position', 'Complete development and prepare a freeing central break before White fixes a lasting space or structural edge.', { caveats: ['The safe break depends on the exact QGD system.'] })],
    },
    rationale: 'Refines the family for declined structures without replacing all inherited context.',
  },
  {
    id: 'knowledge-line-queens-gambit-accepted',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: { allClassificationRuleIds: ['line-queens-gambit-accepted'] },
    white: {
      strategicSummary: statement('Use the development lead and central expansion rather than spending tempi recovering the c-pawn at any cost.'),
      plans: [plan('qga-white-build-centre-before-recapture', 'Build the centre before recapture', 'Develop and establish e4 when possible, recovering the pawn only when it does not lose the initiative.', { caveats: ['Concrete pawn-holding lines require tactical accuracy.'] })],
    },
    black: {
      strategicSummary: statement('Return or release the c-pawn under favorable conditions and attack White’s expanded centre.'),
      plans: [plan('qga-black-return-pawn-for-activity', 'Trade the pawn for activity', 'Complete development, challenge e4 and avoid tying the position to permanent pawn retention.', { caveats: ['Trying to hold c4 indefinitely can leave Black behind in development.'] })],
    },
    rationale: 'Separates accepted-strategy from the declined family branch.',
  },
  {
    id: 'knowledge-family-kings-indian-defense',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: { allClassificationRuleIds: ['family-kings-indian-defense'] },
    shortDescription: statement('A dynamic defence where Black allows White central space and seeks counterplay against it.'),
    description: statement('White often expands on the queenside or in the centre while Black builds kingside and central counterplay. Closed main lines can become races on opposite wings, but not every branch has that structure.', 'MEDIUM'),
    white: {
      strategicSummary: statement('Use the space advantage to restrict Black and open the queenside or centre before the kingside attack becomes decisive.', 'MEDIUM'),
      plans: [plan('kid-white-use-space-and-queenside', 'Use space and queenside play', 'Support the centre, expand with c5 or b4 when justified and watch the timing of Black’s ...f5 break.', { caveats: ['Open or exchange lines may call for direct central play instead.'] })],
    },
    black: {
      strategicSummary: statement('Attack the centre and kingside with coordinated breaks rather than accepting permanent space disadvantage.', 'MEDIUM'),
      plans: [plan('kid-black-prepare-f5-and-counterplay', 'Prepare active counterplay', 'Coordinate ...e5 or ...c5 with ...f5 and piece activity according to White’s centre.', { caveats: ['A premature pawn storm can leave central weaknesses.'] })],
    },
    rationale: 'Captures the characteristic space-versus-counterplay asymmetry with branch caveats.',
  },
  {
    id: 'knowledge-family-grunfeld-defense',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: { allClassificationRuleIds: ['family-grunfeld-defense'] },
    shortDescription: statement('A hypermodern defence that invites a broad centre and attacks it with pieces and pawn breaks.'),
    description: statement('White receives central space and often a pawn duo; Black accepts that space temporarily in exchange for pressure with the fianchettoed bishop, ...c5 and active piece play.', 'HIGH'),
    white: {
      strategicSummary: statement('Use the centre as a mobile asset, but support it well enough that it does not become a fixed target.'),
      plans: [plan('grunfeld-white-use-mobile-centre', 'Use the mobile centre', 'Advance or transform the central pawns when it gains time and opens lines for White’s pieces.', { caveats: ['Holding every central pawn can make the centre vulnerable to coordinated pressure.'] })],
    },
    black: {
      strategicSummary: statement('Attack White’s centre immediately with long-range pressure and timely breaks.'),
      plans: [plan('grunfeld-black-attack-centre', 'Attack the centre', 'Combine the g7 bishop, ...c5 and pressure on d4 with active piece development.', { caveats: ['Passive blockading without counterplay concedes White’s space advantage.'] })],
    },
    rationale: 'Provides a distinct hypermodern plan instead of reusing King’s Indian guidance.',
  },
  {
    id: 'knowledge-subfamily-italian-evans-gambit',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: { allClassificationRuleIds: ['subfamily-italian-evans-gambit'] },
    shortDescription: statement('A forcing Italian gambit where White spends a queenside pawn to accelerate central development and attack.', 'HIGH', sourceIds('lichess-evans-gambit-accepted')),
    white: {
      strategicSummary: statement('Open the centre quickly and use the lead in development before Black consolidates.', 'HIGH', sourceIds('lichess-evans-gambit-accepted')),
      plans: [plan('evans-white-open-centre-for-development', 'Open the centre', 'Use c3 and d4 to build tempi and lines for the bishops and queen.', { conditions: ['White has offered the b-pawn and retains development compensation.'], caveats: ['A slow attack leaves White simply down material.'], sources: sourceIds('lichess-evans-gambit-accepted') })],
    },
    black: {
      strategicSummary: statement('Meet the development surge accurately and return material when necessary to complete development and secure the king.', 'HIGH', sourceIds('lichess-evans-gambit-accepted')),
      plans: [plan('evans-black-neutralize-development', 'Neutralize the development lead', 'Prioritize king safety and piece activity over holding every pawn.', { caveats: ['Greedy pawn retention can trap Black in the centre.'], sources: sourceIds('lichess-evans-gambit-accepted') })],
    },
    rationale: 'Defines the offerer/defender asymmetry for the Evans family.',
  },
  {
    id: 'knowledge-line-italian-evans-gambit-accepted',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: { allClassificationRuleIds: ['line-italian-evans-gambit-accepted'] },
    white: {
      plans: [plan('evans-accepted-white-use-tempi-on-bishop', 'Use tempi on the bishop', 'Gain time against the displaced bishop while establishing the central pawn duo and opening attacking lines.', { conditions: ['Black has accepted on b4.'], caveats: ['Tempi matter only when they improve development or open the centre.'], sources: sourceIds('lichess-evans-gambit-accepted') })],
    },
    black: {
      plans: [plan('evans-accepted-black-return-pawn-if-needed', 'Return the pawn when needed', 'Give back material if it completes development, closes attacking lines or reaches a favorable ending.', { conditions: ['Black accepted the gambit.'], sources: sourceIds('lichess-evans-gambit-accepted') })],
    },
    rationale: 'Adds accepted-line conditions while inheriting the broad Evans descriptions.',
  },
  {
    id: 'knowledge-family-benko-gambit',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: { allClassificationRuleIds: ['family-benko-gambit'] },
    shortDescription: statement('A positional pawn sacrifice by Black for lasting queenside files, pressure and development.', 'HIGH', sourceIds('lichess-benko-gambit')),
    description: statement('Black offers a queenside pawn to open the a- and b-files and create long-term pressure. White’s extra material matters only if the queenside can be consolidated without losing coordination.', 'MEDIUM', sourceIds('lichess-benko-gambit')),
    white: {
      strategicSummary: statement('Consolidate the extra pawn, reduce queenside pressure and use the central or kingside space advantage.', 'MEDIUM', sourceIds('lichess-benko-gambit')),
      plans: [plan('benko-white-consolidate-and-centralize', 'Consolidate and centralize', 'Complete development, protect queenside entry squares and seek central play before Black’s pressure becomes permanent.', { caveats: ['Material alone does not neutralize the open files.'], sources: sourceIds('lichess-benko-gambit') })],
    },
    black: {
      strategicSummary: statement('Use the open queenside files, dark-square pressure and rapid development as compensation for the pawn.', 'MEDIUM', sourceIds('lichess-benko-gambit')),
      plans: [plan('benko-black-use-open-queenside-files', 'Use the open files', 'Place rooks on the a- and b-files, activate the fianchettoed bishop and target White’s queenside structure.', { conditions: ['The gambit structure has opened queenside files.'], caveats: ['If White declines or closes the files, the plan must change.'], sources: sourceIds('lichess-benko-gambit') })],
    },
    rationale: 'Defines the color-reversed gambit plans and long-term compensation.',
  },
  {
    id: 'knowledge-line-benko-gambit-accepted',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: { allClassificationRuleIds: ['line-benko-gambit-accepted'] },
    white: {
      strategicSummary: statement('Keep the extra pawn only while completing development and controlling queenside penetration.', 'MEDIUM', sourceIds('lichess-benko-gambit')),
      plans: [plan('benko-accepted-white-return-pawn-for-control', 'Return material for control when useful', 'Give back a pawn if it neutralizes the open files, accelerates development or reaches a favorable structure.', { conditions: ['White accepted the queenside pawn.'], sources: sourceIds('lichess-benko-gambit') })],
    },
    black: {
      strategicSummary: statement('Maximize long-term queenside activity rather than forcing an immediate tactical recovery of the pawn.', 'MEDIUM', sourceIds('lichess-benko-gambit')),
      plans: [plan('benko-accepted-black-build-long-pressure', 'Build long-term pressure', 'Coordinate rooks, queen and bishop against the queenside while preventing White from consolidating.', { conditions: ['White accepted and the files are open.'], sources: sourceIds('lichess-benko-gambit') })],
    },
    rationale: 'Refines the accepted structure without discarding the family plans.',
  },
  {
    id: 'knowledge-line-benko-gambit-declined',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: { allClassificationRuleIds: ['line-benko-gambit-declined'] },
    white: {
      planMode: 'REPLACE',
      strategicSummary: statement('Use the declined move order to keep more control of the queenside and challenge Black’s pawn expansion.', 'MEDIUM', sourceIds('lichess-benko-gambit')),
      plans: [plan('benko-declined-white-challenge-expansion', 'Challenge the queenside expansion', 'Attack the advanced queenside pawns or close the structure while maintaining central development.', { conditions: ['White has declined the standard acceptance.'], caveats: ['The open-file accepted plan may never arise.'], sources: sourceIds('lichess-benko-gambit') })],
    },
    black: {
      planMode: 'REPLACE',
      strategicSummary: statement('Adapt the queenside expansion to the closed or altered structure instead of assuming accepted-gambit files.', 'MEDIUM', sourceIds('lichess-benko-gambit')),
      plans: [plan('benko-declined-black-maintain-space-or-break', 'Maintain space or reopen play', 'Use the advanced queenside pawns for space, or prepare a break that recreates active files under favorable conditions.', { conditions: ['White declined the gambit.'], caveats: ['Automatic rook placement on unopened files is ineffective.'], sources: sourceIds('lichess-benko-gambit') })],
    },
    rationale: 'Uses full replacement because the accepted-gambit open-file assumptions may not exist.',
  },
  {
    id: 'knowledge-family-catalan-opening',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: { allClassificationRuleIds: ['family-catalan-opening'] },
    shortDescription: statement('A queen-pawn opening that combines central pressure with a long-term kingside-fianchetto influence on the queenside.'),
    white: {
      strategicSummary: statement('Use the g2 bishop and central pressure to recover or outweigh any temporary queenside pawn investment.'),
      plans: [plan('catalan-white-long-diagonal-pressure', 'Use the long diagonal', 'Coordinate the g2 bishop with central breaks and queenside pressure, especially against c6 and b7 targets.', { caveats: ['Closed Catalan structures may require slower manoeuvring.'] })],
    },
    black: {
      strategicSummary: statement('Resolve queenside tension without allowing the g2 bishop and central pressure to dominate the position.'),
      plans: [plan('catalan-black-blunt-bishop-and-develop', 'Blunt the bishop and develop', 'Support the queenside, challenge the centre and return material if necessary to complete development.', { caveats: ['Holding an extra c-pawn can expose the queenside and delay development.'] })],
    },
    rationale: 'Adds a high-relevance positional family with clear side asymmetry.',
  },
  {
    id: 'knowledge-family-slav-defense',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: { allClassificationRuleIds: ['family-slav-defense'] },
    shortDescription: statement('A sound Queen’s Gambit defence that supports d5 with c6 while keeping the light-squared bishop active.'),
    white: {
      strategicSummary: statement('Use space and development to pressure Black’s centre before the Slav structure fully frees itself.'),
      plans: [plan('slav-white-pressure-centre-and-queenside', 'Pressure the centre and queenside', 'Develop actively, contest d5 and use e4 or queenside pressure when the position supports it.', { caveats: ['Accepted and Semi-Slav branches change the structure substantially.'] })],
    },
    black: {
      strategicSummary: statement('Complete the solid setup, develop the light-squared bishop and free the centre at the right moment.'),
      plans: [plan('slav-black-develop-bishop-and-free-centre', 'Develop and free the centre', 'Use the c6 support to develop soundly, then seek ...c5 or ...e5 when preparation is complete.', { caveats: ['A premature break can leave d5 or the queenside weak.'] })],
    },
    rationale: 'Adds a distinct Queen’s Gambit defence beyond the accepted/declined split.',
  },
  {
    id: 'knowledge-family-nimzo-indian-defense',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: { allClassificationRuleIds: ['family-nimzo-indian-defense'] },
    shortDescription: statement('A principal defence that uses piece pressure and the option of structural damage to restrain White’s centre.'),
    white: {
      strategicSummary: statement('Use the bishop pair or central space while preventing structural targets from becoming easy to attack.'),
      plans: [plan('nimzo-white-use-bishop-pair-or-centre', 'Use the bishop pair or centre', 'Build activity around the chosen structural concession, often through e4 or queenside expansion.', { caveats: ['The plan changes sharply between doubled-pawn, isolated-pawn and intact-centre structures.'] })],
    },
    black: {
      strategicSummary: statement('Pressure the centre, choose when to exchange on c3 and attack the resulting structural targets.'),
      plans: [plan('nimzo-black-pressure-and-fix-structure', 'Pressure and fix the structure', 'Use the pin to delay e4, then exchange or retreat according to the target structure and development needs.', { caveats: ['Giving up the bishop pair without a structural or dynamic gain can favor White.'] })],
    },
    rationale: 'Covers a principal family where structural choices drive both sides’ plans.',
  },
  {
    id: 'knowledge-family-queens-indian-defense',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: { allClassificationRuleIds: ['family-queens-indian-defense'] },
    shortDescription: statement('A restrained principal defence that controls the centre with pieces and prepares flexible pawn breaks.'),
    white: {
      strategicSummary: statement('Use the space edge and active piece placement to prevent Black from equalizing through effortless central breaks.'),
      plans: [plan('qind-white-use-space-and-restrict-breaks', 'Use space and restrict breaks', 'Coordinate the centre and queenside pieces while watching ...c5 and ...d5 freeing ideas.', { caveats: ['Overextension can give Black the targets the setup is designed to attack.'] })],
    },
    black: {
      strategicSummary: statement('Pressure the centre from a flexible setup and choose the freeing break that matches White’s development.'),
      plans: [plan('qind-black-pressure-and-break', 'Pressure and break', 'Use the queenside fianchetto or active piece placement to support ...c5 or ...d5.', { caveats: ['A passive setup without a freeing break concedes White a comfortable space advantage.'] })],
    },
    rationale: 'Completes the bounded corpus with another high-relevance principal defence.',
  },
];
