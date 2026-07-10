import assert from 'node:assert/strict';
import { getLichessResultForUser } from '../../dist/services/lichessImportService.js';

const timeoutInsufficientMaterialPgn = `
[Event "rated rapid game"]
[Site "https://lichess.org/DurtFINU"]
[White "kingtf"]
[Black "vokerg"]
[Result "1/2-1/2"]
[Termination "Time forfeit"]

1. e4 e5 1/2-1/2
`;

assert.equal(
  getLichessResultForUser(
    {
      status: 'outoftime',
      pgn: timeoutInsufficientMaterialPgn,
    },
    'BLACK',
  ),
  'DRAW',
);

assert.equal(
  getLichessResultForUser(
    {
      status: 'mate',
      winner: 'white',
      pgn: '[Result "1-0"]',
    },
    'BLACK',
  ),
  'LOSS',
);

console.log('Lichess import tests passed.');
