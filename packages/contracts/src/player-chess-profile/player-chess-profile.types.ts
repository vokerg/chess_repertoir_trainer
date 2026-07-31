import type { z } from 'zod';
import { playerChessProfileOpeningCharacterSchema } from './player-chess-profile.schemas';

export type PlayerChessProfileOpeningCharacter = z.infer<
  typeof playerChessProfileOpeningCharacterSchema
>;
