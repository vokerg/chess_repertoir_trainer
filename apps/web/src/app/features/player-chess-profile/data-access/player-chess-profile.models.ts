import type { ExternalAccountResponse } from '@chess-trainer/contracts/external-accounts';

export type PlayerChessProfileAccountDto = Pick<
  ExternalAccountResponse,
  'id' | 'provider' | 'username' | 'displayName' | 'isActive' | 'isDefaultProgressAccount'
>;
