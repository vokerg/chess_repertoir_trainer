import {
  defaultChessComPubApiClient,
  parseChessComArchiveMonth,
} from '../../dist/modules/account-imports/providers/chess-com/chess-com.provider.js';

const username = process.env.CHESS_COM_CANARY_USERNAME?.trim();
if (!username) {
  throw new Error('Set CHESS_COM_CANARY_USERNAME to run the low-volume Chess.com provider canary.');
}

const archives = await defaultChessComPubApiClient.fetchArchives(username);
if (!Array.isArray(archives.archives)) {
  throw new Error('Chess.com archive-index canary response did not contain an archives array.');
}
const parsed = archives.archives
  .map((url) => ({ url, month: parseChessComArchiveMonth(url) }))
  .filter((entry) => entry.month !== null);
const requestedMonth = process.env.CHESS_COM_CANARY_MONTH?.trim();
const selected = requestedMonth
  ? parsed.find((entry) => entry.month.key === requestedMonth)
  : parsed.at(-1);

if (!selected) {
  console.log(JSON.stringify({ provider: 'CHESS_COM', archives: parsed.length, selectedMonth: null }));
  process.exit(0);
}

const monthly = await defaultChessComPubApiClient.fetchMonthlyArchive(
  username,
  selected.month.year,
  selected.month.month,
);
if (!Array.isArray(monthly.games)) {
  throw new Error('Chess.com monthly canary response did not contain a games array.');
}
console.log(JSON.stringify({
  provider: 'CHESS_COM',
  archives: parsed.length,
  selectedMonth: selected.month.key,
  games: monthly.games.length,
}));
