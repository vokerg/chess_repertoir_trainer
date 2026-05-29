type EcoRangeFallback = {
  from: string;
  to: string;
  name: string;
};

function ecoCodeValue(code: string): number {
  const match = code.match(/^([A-E])(\d{2})$/);
  if (!match) throw new Error(`Invalid ECO code: ${code}`);
  return (match[1].charCodeAt(0) - 'A'.charCodeAt(0)) * 100 + Number(match[2]);
}

function ecoCodeFromValue(value: number): string {
  const letter = String.fromCharCode('A'.charCodeAt(0) + Math.floor(value / 100));
  const number = String(value % 100).padStart(2, '0');
  return `${letter}${number}`;
}

function expandEcoRanges(ranges: EcoRangeFallback[]): Record<string, string> {
  const names: Record<string, string> = {};

  for (const range of ranges) {
    const from = ecoCodeValue(range.from);
    const to = ecoCodeValue(range.to);

    for (let value = from; value <= to; value += 1) {
      names[ecoCodeFromValue(value)] = range.name;
    }
  }

  return names;
}

// Broad ECO-code fallback names. These are intentionally coarse labels, used only
// when a provider supplied an ECO code but no opening name. More precise names
// should come later from ply/position-based opening classification.
export const ECO_FALLBACK_NAMES: Record<string, string> = expandEcoRanges([
  { from: 'A00', to: 'A00', name: 'Irregular Openings' },
  { from: 'A01', to: 'A01', name: 'Nimzo-Larsen Attack' },
  { from: 'A02', to: 'A03', name: 'Bird Opening' },
  { from: 'A04', to: 'A09', name: 'Zukertort Opening' },
  { from: 'A10', to: 'A39', name: 'English Opening' },
  { from: 'A40', to: 'A41', name: "Queen's Pawn Game" },
  { from: 'A42', to: 'A44', name: 'Modern Defense' },
  { from: 'A45', to: 'A49', name: 'Indian Game' },
  { from: 'A50', to: 'A79', name: 'Benoni Defense' },
  { from: 'A80', to: 'A99', name: 'Dutch Defense' },

  { from: 'B00', to: 'B00', name: "King's Pawn Game" },
  { from: 'B01', to: 'B01', name: 'Scandinavian Defense' },
  { from: 'B02', to: 'B05', name: "Alekhine's Defense" },
  { from: 'B06', to: 'B09', name: 'Modern Defense' },
  { from: 'B10', to: 'B19', name: 'Caro-Kann Defense' },
  { from: 'B20', to: 'B99', name: 'Sicilian Defense' },

  { from: 'C00', to: 'C19', name: 'French Defense' },
  { from: 'C20', to: 'C20', name: "King's Pawn Game" },
  { from: 'C21', to: 'C22', name: 'Center Game' },
  { from: 'C23', to: 'C29', name: 'Vienna Game' },
  { from: 'C30', to: 'C39', name: "King's Gambit" },
  { from: 'C40', to: 'C42', name: "King's Knight Opening" },
  { from: 'C43', to: 'C44', name: 'Ponziani Opening' },
  { from: 'C45', to: 'C49', name: 'Scotch Game' },
  { from: 'C50', to: 'C59', name: 'Italian Game' },
  { from: 'C60', to: 'C99', name: 'Ruy Lopez' },

  { from: 'D00', to: 'D05', name: "Queen's Pawn Game" },
  { from: 'D06', to: 'D19', name: 'Slav Defense' },
  { from: 'D20', to: 'D29', name: "Queen's Gambit Accepted" },
  { from: 'D30', to: 'D69', name: "Queen's Gambit Declined" },
  { from: 'D70', to: 'D79', name: 'Neo-Grünfeld Defense' },
  { from: 'D80', to: 'D99', name: 'Grünfeld Defense' },

  { from: 'E00', to: 'E09', name: 'Catalan Opening' },
  { from: 'E10', to: 'E19', name: "Queen's Indian Defense" },
  { from: 'E20', to: 'E59', name: 'Nimzo-Indian Defense' },
  { from: 'E60', to: 'E99', name: "King's Indian Defense" },
]);

export function getEcoFallbackName(eco?: string | null): string | null {
  if (!eco) return null;
  return ECO_FALLBACK_NAMES[eco.trim().toUpperCase()] ?? null;
}
