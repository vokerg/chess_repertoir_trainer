import { type PageHeaderAction } from '../../ui/page-header/page-header.component';

export const CHALLENGE_BOT_ACTION_ID = 'challenge-lichess-bot';
export const CHALLENGE_BOT_ACTION_LABEL = 'Challenge bot';

export function buildChallengeBotHeaderAction(options: {
  disabled?: boolean;
  run: () => void;
}): PageHeaderAction {
  return {
    id: CHALLENGE_BOT_ACTION_ID,
    label: CHALLENGE_BOT_ACTION_LABEL,
    disabled: options.disabled,
    run: options.run,
  };
}
