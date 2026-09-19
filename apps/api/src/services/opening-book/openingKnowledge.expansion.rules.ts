import type {
  OpeningKnowledgeConfidence,
  OpeningKnowledgeRule,
  OpeningKnowledgeStatement,
  OpeningStrategicPlan,
} from './openingKnowledge.types';

const SOURCES = [
  'project-editorial-rb-022',
  'project-rb-021-foundation',
  'lichess-chess-openings',
] as const;

function statement(
  text: string,
  confidence: OpeningKnowledgeConfidence = 'MEDIUM',
): OpeningKnowledgeStatement {
  return { text, confidence, sourceIds: SOURCES };
}

function plan(
  id: string,
  title: string,
  summary: string,
  options: {
    conditions?: readonly string[];
    caveats?: readonly string[];
    confidence?: OpeningKnowledgeConfidence;
  } = {},
): OpeningStrategicPlan {
  return {
    id,
    title,
    summary,
    conditions: options.conditions,
    caveats: options.caveats,
    confidence: options.confidence ?? 'MEDIUM',
    sourceIds: SOURCES,
  };
}

export const OPENING_KNOWLEDGE_EXPANSION_RULES: readonly OpeningKnowledgeRule[] = [
  {
    id: 'knowledge-family-ruy-lopez',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: { allClassificationRuleIds: ['family-ruy-lopez'] },
    shortDescription: statement('A principal open-game family where White pressures e5 and Black seeks active development without conceding lasting central or queenside weaknesses.', 'HIGH'),
    description: statement('White develops the bishop to b5 to increase pressure on the e5 pawn and Black’s queenside development. The resulting positions range from quiet manoeuvring structures to forcing central and kingside play, so both sides must connect their plans to the actual pawn centre.'),
    white: {
      strategicSummary: statement('Maintain pressure on e5, complete development and prepare d4 or a kingside initiative only when the centre supports it.'),
      plans: [
        plan('ruy-white-build-pressure-before-d4', 'Build pressure before d4', 'Coordinate the bishop, knights and rook on the e-file so that the d4 break opens the centre under favorable conditions.', { caveats: ['Closed, Berlin and Exchange structures require different timing and piece placement.'] }),
      ],
    },
    black: {
      strategicSummary: statement('Complete development, protect or release the e5 centre deliberately and create counterplay before White converts the space and pressure.'),
      plans: [
        plan('ruy-black-complete-development-and-break', 'Develop and challenge the centre', 'Use ...a6 and ...b5, ...d6, castling and a later ...d5 or ...c5 break according to the variation.', { caveats: ['Queenside expansion is useful only when it does not leave the centre or king vulnerable.'] }),
      ],
    },
    rationale: 'Adds complete two-sided guidance for the largest uncovered open-game family.',
  },
  {
    id: 'knowledge-subfamily-ruy-lopez-berlin',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: {
      allClassificationRuleIds: ['family-ruy-lopez'],
      namePattern: /Berlin Defense/i,
    },
    shortDescription: statement('A resilient Ruy Lopez branch where early queen exchanges or simplified structures shift the emphasis toward development, king placement and long-term pawn weaknesses.', 'HIGH'),
    description: statement('The Berlin often reduces direct attacking chances and makes small structural details decisive. White commonly works with space, development and queenside targets; Black relies on activity, the bishop pair in many lines and accurate king coordination.'),
    white: {
      planMode: 'REPLACE',
      strategicSummary: statement('Use the space and development edge to restrict Black, improve the least active piece and create a second weakness rather than forcing a premature attack.'),
      plans: [
        plan('berlin-white-restrict-and-create-targets', 'Restrict and create targets', 'Limit Black’s piece activity, pressure queenside pawns and improve the king before opening the position.', { caveats: ['Material equality and queen exchange do not guarantee an easy advantage.'] }),
      ],
    },
    black: {
      planMode: 'REPLACE',
      strategicSummary: statement('Activate the king and bishops, challenge White’s centre and avoid passive defence of queenside weaknesses.'),
      plans: [
        plan('berlin-black-activate-before-defending', 'Activate before defending', 'Coordinate the king, bishops and rooks so that central or queenside counterplay offsets the structural concession.', { caveats: ['Passive piece placement can allow White to improve indefinitely.'] }),
      ],
    },
    rationale: 'Replaces generic Ruy attacking assumptions with Berlin-specific simplified-play guidance.',
  },
  {
    id: 'knowledge-line-ruy-lopez-exchange',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: {
      allClassificationRuleIds: ['family-ruy-lopez'],
      namePattern: /Exchange Variation/i,
    },
    shortDescription: statement('A structural Ruy Lopez in which White gives up the bishop pair to damage Black’s queenside pawns and pursue a favorable pawn-majority ending.', 'HIGH'),
    description: statement('White accepts the bishop-pair concession in return for a healthier pawn structure and a potential kingside majority. Black seeks active piece play and often uses the bishop pair before simplification makes the damaged queenside more important.'),
    white: {
      planMode: 'REPLACE',
      strategicSummary: statement('Trade into favorable endings only when the kingside majority and healthier structure outweigh Black’s bishop pair and activity.'),
      plans: [
        plan('ruy-exchange-white-use-healthy-majority', 'Use the healthy majority', 'Reduce Black’s activity, improve the king and prepare a kingside pawn majority in an ending.', { caveats: ['Automatic exchanges can help Black activate the bishops.'] }),
      ],
    },
    black: {
      planMode: 'REPLACE',
      strategicSummary: statement('Use the bishop pair and active development before the queenside pawn defects become fixed endgame targets.'),
      plans: [
        plan('ruy-exchange-black-use-bishop-pair', 'Use the bishop pair actively', 'Keep useful tension, open lines for the bishops and seek central activity rather than defending damaged pawns passively.', { caveats: ['Careless simplification can leave Black with a difficult pawn ending.'] }),
      ],
    },
    rationale: 'Captures the defining bishop-pair versus pawn-structure tradeoff of the Exchange Variation.',
  },
  {
    id: 'knowledge-line-ruy-lopez-marshall',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: {
      allClassificationRuleIds: ['family-ruy-lopez'],
      namePattern: /Marshall Attack/i,
    },
    shortDescription: statement('A forcing Ruy Lopez pawn sacrifice where Black gives material for rapid development, central clearance and a sustained attack against White’s king.', 'HIGH'),
    description: statement('The Marshall is concrete and highly theoretical. White’s extra pawn is secondary until development and king safety are secured; Black must keep the initiative flowing because an exchange of attacking pieces can expose the material deficit.'),
    white: {
      planMode: 'REPLACE',
      strategicSummary: statement('Neutralize the initiative first, exchange key attackers and consolidate the extra pawn only after the king is safe.'),
      plans: [
        plan('marshall-white-neutralize-before-consolidating', 'Neutralize before consolidating', 'Meet forcing threats accurately, return material if required and trade the pieces that sustain Black’s attack.', { caveats: ['Greedy pawn retention can be strategically and tactically fatal.'], confidence: 'HIGH' }),
      ],
    },
    black: {
      planMode: 'REPLACE',
      strategicSummary: statement('Use every tempo to maintain threats, improve attacking pieces and prevent White from coordinating the extra material.'),
      plans: [
        plan('marshall-black-maintain-initiative', 'Maintain the initiative', 'Bring the queen, bishops and rooks into the attack with tempo while controlling White’s defensive regrouping squares.', { caveats: ['If the attack dissipates without structural compensation, the missing pawn becomes important.'], confidence: 'HIGH' }),
      ],
    },
    rationale: 'Replaces generic Ruy manoeuvring plans for a concrete theoretical pawn sacrifice.',
  },
  {
    id: 'knowledge-family-italian-game',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: { allClassificationRuleIds: ['family-italian-game'] },
    shortDescription: statement('A classical open-game family built around rapid development, pressure on f7 and the decision between an early central break and slower manoeuvring play.', 'HIGH'),
    description: statement('Both sides develop naturally toward the centre. White may prepare c3 and d4, pursue kingside pressure or enter quiet structures; Black aims for equal development, a secure king and a timely central challenge.'),
    white: {
      strategicSummary: statement('Complete development and choose between d4, kingside pressure and slow improvement according to Black’s centre and piece placement.'),
      plans: [
        plan('italian-white-prepare-central-break', 'Prepare the central break', 'Use c3, Re1 and coordinated pieces to make d4 effective rather than advancing before development is ready.', { caveats: ['In quiet structures, improving pieces may be more important than forcing d4 immediately.'] }),
      ],
    },
    black: {
      strategicSummary: statement('Match White’s development, prevent an uncontested d4 break and create central or queenside counterplay without weakening the king.'),
      plans: [
        plan('italian-black-contest-d4-and-develop', 'Contest d4 and develop', 'Use ...d6, ...a6, ...Ba7 and a later ...d5 or ...c6 setup according to White’s move order.', { caveats: ['Passive imitation can leave White with an effortless initiative.'] }),
      ],
    },
    rationale: 'Completes the broad Italian family while allowing the existing Evans rules to inherit a full description.',
  },
  {
    id: 'knowledge-subfamily-italian-two-knights',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: {
      allClassificationRuleIds: ['family-italian-game'],
      namePattern: /Two Knights Defense/i,
    },
    shortDescription: statement('A sharper Italian branch in which Black develops actively and accepts immediate tactical pressure against f7 and the centre.', 'HIGH'),
    description: statement('White can force concrete play with an early knight jump or central action, while Black relies on development tempi and counterattacks rather than passive defence. Exact move order matters more than generic Italian manoeuvring.'),
    white: {
      planMode: 'REPLACE',
      strategicSummary: statement('Use the temporary tactical opportunities only when development and calculation justify them; otherwise preserve the initiative through central play.'),
      plans: [
        plan('two-knights-white-use-development-tempi', 'Use development tempi', 'Create threats that bring more pieces into play and keep Black’s king or centre under pressure.', { caveats: ['A one-piece attack can leave the advanced knight exposed.'] }),
      ],
    },
    black: {
      planMode: 'REPLACE',
      strategicSummary: statement('Meet the attack with active development and counterplay, returning material or simplifying when it neutralizes White’s initiative.'),
      plans: [
        plan('two-knights-black-counterattack-the-centre', 'Counterattack the centre', 'Develop with tempo, challenge White’s central support and avoid passive defence of f7.', { caveats: ['Concrete tactical lines require accurate calculation.'] }),
      ],
    },
    rationale: 'Separates the tactical Two Knights structures from quiet Italian plans.',
  },
  {
    id: 'knowledge-family-dutch-defense',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: { allClassificationRuleIds: ['family-dutch-defense'] },
    shortDescription: statement('An ambitious defence to queen-pawn openings where Black claims kingside space with ...f5 and accepts dark-square and king-safety responsibilities.', 'HIGH'),
    description: statement('Black seeks an unbalanced game and often prepares ...e5, while White attacks the weakened dark squares, challenges the centre and may expand on the queenside. The exact pawn structure determines whether Black attacks or must first complete development.'),
    white: {
      strategicSummary: statement('Challenge Black’s central control, exploit weakened dark squares and open the position before the kingside initiative becomes coordinated.'),
      plans: [
        plan('dutch-white-challenge-e5-and-dark-squares', 'Challenge e5 and the dark squares', 'Use g3, Bg2, c4 and central pressure to make ...e5 difficult or costly.', { caveats: ['Direct kingside play is justified only when Black’s king and pieces are genuinely exposed.'] }),
      ],
    },
    black: {
      strategicSummary: statement('Complete development around the ...f5 structure and prepare ...e5 or kingside activity without neglecting central and dark-square weaknesses.'),
      plans: [
        plan('dutch-black-prepare-e5', 'Prepare ...e5', 'Coordinate the queen, knights and bishops so the central break creates activity rather than opening lines against the king.', { caveats: ['Premature kingside expansion can leave e6, e5 and the long diagonal weak.'] }),
      ],
    },
    rationale: 'Adds complete strategic guidance for a major uncovered asymmetrical defence.',
  },
  {
    id: 'knowledge-subfamily-dutch-stonewall',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: {
      allClassificationRuleIds: ['family-dutch-defense'],
      namePattern: /Stonewall/i,
    },
    shortDescription: statement('A Dutch structure with pawns on f5, e6, d5 and c6 that gains kingside space and central control while conceding dark-square holes and a difficult light-squared bishop.', 'HIGH'),
    description: statement('Black builds a fixed central chain and often attacks on the kingside. White typically targets e5, the dark squares and the queenside; exchanges of Black’s strongest attacking pieces can expose the static weaknesses.'),
    white: {
      strategicSummary: statement('Control e5, exchange Black’s active kingside pieces and create queenside or central play against the fixed pawn chain.'),
      plans: [
        plan('stonewall-white-control-e5', 'Control e5', 'Use a knight, bishop and central pressure to occupy or contest e5 while limiting Black’s kingside attack.', { caveats: ['Opening the kingside carelessly can activate Black’s natural space advantage.'] }),
      ],
    },
    black: {
      strategicSummary: statement('Use the stable centre to organize kingside play, improve the light-squared bishop and prevent White from establishing an uncontested e5 outpost.'),
      plans: [
        plan('stonewall-black-attack-and-improve-bishop', 'Attack and improve the bishop', 'Coordinate pieces toward the kingside while finding an active route or exchange for the light-squared bishop.', { caveats: ['If the attack is neutralized, the dark-square weaknesses can become permanent.'] }),
      ],
    },
    rationale: 'Adds the fixed-chain and bad-bishop concepts unique to Stonewall structures.',
  },
  {
    id: 'knowledge-subfamily-dutch-leningrad',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: {
      allClassificationRuleIds: ['family-dutch-defense'],
      namePattern: /Leningrad/i,
    },
    shortDescription: statement('A dynamic Dutch setup where Black fianchettos the kingside bishop and seeks ...e5, accepting tactical pressure on the centre and king.', 'HIGH'),
    description: statement('The Leningrad combines kingside space with long-diagonal pressure. Black aims for active central play; White tries to exploit the time spent on the setup through central expansion, queenside play and pressure on weakened squares.'),
    white: {
      strategicSummary: statement('Restrain ...e5, open the centre when Black’s king or queenside development is vulnerable and use queenside space to stretch the position.'),
      plans: [
        plan('leningrad-white-restrain-e5', 'Restrain ...e5', 'Increase control of e5 and d5, then choose a central or queenside break before Black completes the attacking setup.', { caveats: ['A slow plan can allow Black to achieve the ideal ...e5 break.'] }),
      ],
    },
    black: {
      strategicSummary: statement('Use the fianchettoed bishop and ...f5 space to support ...e5, but keep the king and queenside development coordinated.'),
      plans: [
        plan('leningrad-black-achieve-e5-safely', 'Achieve ...e5 safely', 'Prepare the central break with development and tactical control, then use the resulting space for kingside or central activity.', { caveats: ['Forcing ...e5 before development can expose the king and d5 square.'] }),
      ],
    },
    rationale: 'Distinguishes the fianchetto and central-break logic of the Leningrad from other Dutch systems.',
  },
  {
    id: 'knowledge-family-semi-slav-defense',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: { allClassificationRuleIds: ['family-semi-slav-defense'] },
    shortDescription: statement('A sound but theory-heavy Queen’s Gambit defence combining ...c6 and ...e6, with central solidity balanced against development of the light-squared bishop.', 'HIGH'),
    description: statement('Black supports d5 with both c6 and e6 and keeps several central options, but temporarily locks in the c8 bishop. White uses development and central pressure to exploit that delay; Black seeks ...dxc4, ...b5, ...e5 or ...c5 under favorable conditions.'),
    white: {
      strategicSummary: statement('Develop actively, keep pressure on d5 and exploit the time Black needs to solve the light-squared bishop and free the centre.'),
      plans: [
        plan('semi-slav-white-pressure-before-freeing-break', 'Pressure before Black frees the position', 'Coordinate pieces around e4 and d5, then choose a central expansion or kingside plan according to Black’s setup.', { caveats: ['Meran and Botvinnik structures require substantially different play.'] }),
      ],
    },
    black: {
      strategicSummary: statement('Maintain the resilient centre while preparing a freeing break or queenside expansion that activates the light-squared bishop.'),
      plans: [
        plan('semi-slav-black-free-the-bishop', 'Free the light-squared bishop', 'Use ...dxc4 and ...b5, ...e5 or ...c5 only when development and central control support the transformation.', { caveats: ['Remaining solid without a freeing plan can become passive.'] }),
      ],
    },
    rationale: 'Adds complete family guidance beyond the broader Slav rule.',
  },
  {
    id: 'knowledge-subfamily-semi-slav-meran',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: {
      allClassificationRuleIds: ['family-semi-slav-defense'],
      namePattern: /Meran/i,
    },
    shortDescription: statement('A Semi-Slav structure where Black gives up the d5 centre temporarily, holds c4 and expands with ...b5 to gain development and queenside space.', 'HIGH'),
    description: statement('White often gains a broad centre and attacking chances; Black relies on queenside expansion, pressure against the centre and a timely ...c5 or ...e5 break. The position can become tactical once the centre opens.'),
    white: {
      strategicSummary: statement('Use the central space and development lead to challenge Black’s queenside chain and open lines before the counterplay becomes coordinated.'),
      plans: [
        plan('meran-white-break-queenside-chain', 'Challenge the queenside chain', 'Use a4, e4-e5 or a central break to undermine ...b5 and activate the pieces.', { caveats: ['Opening the centre without king safety can favor Black’s active pieces.'] }),
      ],
    },
    black: {
      strategicSummary: statement('Use the queenside expansion to gain time, then attack White’s centre with a freeing break and active piece play.'),
      plans: [
        plan('meran-black-expand-then-break', 'Expand, then break', 'Support ...b5, develop the bishop and prepare ...c5 or ...e5 against White’s centre.', { caveats: ['Holding c4 without completing development can leave Black overextended.'] }),
      ],
    },
    rationale: 'Adds the queenside-chain and central-break plans of Meran structures.',
  },
  {
    id: 'knowledge-line-semi-slav-botvinnik',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: {
      allClassificationRuleIds: ['family-semi-slav-defense'],
      namePattern: /Botvinnik Variation/i,
    },
    shortDescription: statement('A forcing Semi-Slav pawn sacrifice where Black holds the c4 pawn and accepts a dangerous centre in exchange for queenside pawns, open lines and tactical counterplay.', 'HIGH'),
    description: statement('The Botvinnik Variation is concrete and calculation-heavy. White’s central pawns and kingside activity compete with Black’s queenside passer, bishop activity and open files; generic Semi-Slav solidity no longer describes the position.'),
    white: {
      planMode: 'REPLACE',
      strategicSummary: statement('Use the central pawn mass and development to open lines against Black’s king before the queenside counterplay becomes decisive.'),
      plans: [
        plan('botvinnik-white-open-lines-with-centre', 'Open lines with the centre', 'Coordinate e5, d5 and piece activity to create forcing threats while controlling Black’s queenside passer.', { caveats: ['The position is highly concrete; slow consolidation can lose the initiative.'], confidence: 'HIGH' }),
      ],
    },
    black: {
      planMode: 'REPLACE',
      strategicSummary: statement('Use the extra queenside material, open files and active bishops to create counterplay while surviving White’s central and kingside threats.'),
      plans: [
        plan('botvinnik-black-use-queenside-passer-and-lines', 'Use the queenside passer and open lines', 'Advance or support the c-pawn and activate the bishops and rooks with tempo against White’s centre and king.', { caveats: ['Material is irrelevant if Black falls behind in the forcing sequence.'], confidence: 'HIGH' }),
      ],
    },
    rationale: 'Replaces generic Semi-Slav plans for a forcing pawn-sacrifice structure.',
  },
  {
    id: 'knowledge-family-benoni-defense',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: { allClassificationRuleIds: ['family-benoni-defense'] },
    shortDescription: statement('An asymmetrical defence where Black concedes White central space and seeks queenside play, dark-square activity and pawn breaks against the centre.', 'HIGH'),
    description: statement('White usually owns more space and a central pawn majority. Black accepts the cramped structure in return for dynamic play through ...b5, ...f5, pressure on the long diagonal and tactical attacks against the centre.'),
    white: {
      strategicSummary: statement('Use the space advantage to restrict Black, support the centre and expand before the queenside and dark-square counterplay becomes active.'),
      plans: [
        plan('benoni-white-use-space-and-central-majority', 'Use the central majority', 'Support e4 and d5, improve the pieces behind the centre and choose between e5, f4-f5 or queenside restraint.', { caveats: ['Overextension can give Black the breaks and targets the defence is designed to exploit.'] }),
      ],
    },
    black: {
      strategicSummary: statement('Create immediate counterplay against White’s centre and queenside rather than defending a passive space disadvantage.'),
      plans: [
        plan('benoni-black-create-breaks-and-dark-square-play', 'Create breaks and dark-square play', 'Prepare ...b5 or ...f5, use the g7 bishop and pressure the central pawns before White consolidates.', { caveats: ['Pawn breaks must be timed with development; otherwise the resulting weaknesses are permanent.'] }),
      ],
    },
    rationale: 'Adds the characteristic space-versus-counterplay model for the uncovered Benoni family.',
  },
  {
    id: 'knowledge-subfamily-benoni-czech',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: {
      allClassificationRuleIds: ['family-benoni-defense'],
      namePattern: /Czech Benoni/i,
    },
    shortDescription: statement('A closed Benoni structure where Black blocks the centre with ...e5 and accepts less space in exchange for a stable chain and delayed flank breaks.', 'HIGH'),
    description: statement('Unlike open Modern Benoni structures, the centre is fixed. White normally expands on the queenside or prepares a kingside break; Black manoeuvres for ...f5 or ...b5 and must avoid being squeezed without counterplay.'),
    white: {
      planMode: 'REPLACE',
      strategicSummary: statement('Use the space advantage to improve pieces and prepare the flank break that attacks the base of Black’s closed chain.'),
      plans: [
        plan('czech-benoni-white-expand-on-flank', 'Expand on the right flank', 'Choose queenside expansion or f4-f5 according to piece placement, while preventing Black’s freeing break.', { caveats: ['Opening the position before the pieces are ready can release Black’s cramped game.'] }),
      ],
    },
    black: {
      planMode: 'REPLACE',
      strategicSummary: statement('Manoeuvre patiently behind the closed centre and prepare ...f5 or ...b5 before White fixes a permanent space advantage.'),
      plans: [
        plan('czech-benoni-black-prepare-freeing-break', 'Prepare a freeing break', 'Reposition knights and rooks to support ...f5 or ...b5, then open the flank where White is least prepared.', { caveats: ['Passive waiting allows White to improve without risk.'] }),
      ],
    },
    rationale: 'Replaces open-Benoni assumptions with the closed-centre Czech Benoni plan.',
  },
  {
    id: 'knowledge-family-alekhine-defense',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: { allClassificationRuleIds: ['family-alekhine-defense'] },
    shortDescription: statement('A provocative defence where Black invites White to gain space and then attacks the advanced centre with pieces and pawn breaks.', 'HIGH'),
    description: statement('White can build a large pawn centre but must justify the tempi spent advancing it. Black accepts less immediate space in order to undermine the centre with ...d6, ...c5 and active piece pressure.'),
    white: {
      strategicSummary: statement('Use the space advantage without overextending, complete development and support the central pawns before advancing again.'),
      plans: [
        plan('alekhine-white-support-space-with-development', 'Support space with development', 'Develop behind the pawn centre and advance only when it gains time or restricts Black’s undermining breaks.', { caveats: ['A large unsupported centre becomes a target rather than an advantage.'] }),
      ],
    },
    black: {
      strategicSummary: statement('Attack the advanced centre with coordinated breaks and piece pressure while completing development efficiently.'),
      plans: [
        plan('alekhine-black-undermine-advanced-centre', 'Undermine the advanced centre', 'Use ...d6, ...c5 and pressure on e5 and d4 to force White’s pawns forward, exchange them or make them weak.', { caveats: ['Repeated knight moves are justified only if the centre can actually be challenged.'] }),
      ],
    },
    rationale: 'Adds complete guidance for the major uncovered provocative defence.',
  },
  {
    id: 'knowledge-subfamily-alekhine-four-pawns',
    revision: 1,
    lifecycle: 'REVIEWED',
    selector: {
      allClassificationRuleIds: ['family-alekhine-defense'],
      namePattern: /Four Pawns Attack/i,
    },
    shortDescription: statement('The most ambitious Alekhine centre, where White uses four pawns to seize space and Black attacks the broad but potentially overextended formation.', 'HIGH'),
    description: statement('White gains maximum central space and attacking chances but falls behind in development if the pawn moves are not converted into active play. Black must strike the centre before White completes coordination, often accepting tactical complications.'),
    white: {
      strategicSummary: statement('Complete development quickly and use the pawn centre dynamically before Black can fix and attack it.'),
      plans: [
        plan('four-pawns-white-convert-space-into-activity', 'Convert space into activity', 'Develop with tempo and prepare d5, e5-e6 or a kingside attack only when the pieces support the advance.', { caveats: ['Trying to preserve every pawn can leave the king and pieces undeveloped.'] }),
      ],
    },
    black: {
      strategicSummary: statement('Open lines against the centre immediately enough that White cannot consolidate the extra space.'),
      plans: [
        plan('four-pawns-black-break-the-centre', 'Break the centre', 'Use ...d6, ...c5 and tactical pressure to provoke exchanges or weaknesses in White’s pawn mass.', { caveats: ['Passive play gives White a stable space advantage and attacking chances.'] }),
      ],
    },
    rationale: 'Adds the maximal-space and development-risk boundary of the Four Pawns Attack.',
  },
];
