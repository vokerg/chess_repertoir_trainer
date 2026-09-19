export interface LichessBotChallengeOption {
  username: string;
  label: string;
}

export interface LichessBotChallengeConfig {
  bots: LichessBotChallengeOption[];
  defaultUsername: string;
}

const defaultBotUsernames = ['maia1', 'maia5', 'maia9'];
const knownLabels: Record<string, string> = {
  maia1: 'Maia 1100',
  maia5: 'Maia 1500',
  maia9: 'Maia 1900',
};

export function readLichessBotChallengeConfig(): LichessBotChallengeConfig {
  const usernames = parseUsernames(process.env['LICHESS_BOT_CHALLENGE_USERNAMES']);
  const allowed = usernames.length ? usernames : defaultBotUsernames;
  const requestedDefault = process.env['LICHESS_DEFAULT_BOT_CHALLENGE_USERNAME']?.trim();
  const defaultUsername =
    requestedDefault && allowed.includes(requestedDefault) ? requestedDefault : allowed[0];

  return {
    bots: allowed.map((username) => ({
      username,
      label: knownLabels[username.toLowerCase()] ?? username,
    })),
    defaultUsername,
  };
}

function parseUsernames(value: string | undefined): string[] {
  if (!value) return [];

  const seen = new Set<string>();
  const usernames: string[] = [];
  for (const username of value.split(',').map((part) => part.trim()).filter(Boolean)) {
    if (seen.has(username)) continue;
    seen.add(username);
    usernames.push(username);
  }

  return usernames;
}
