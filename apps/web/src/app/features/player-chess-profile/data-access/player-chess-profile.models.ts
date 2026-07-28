export interface PlayerChessProfileAccountDto {
  id: number;
  provider: 'LICHESS' | 'CHESS_COM';
  username: string;
  displayName?: string | null;
  isActive: boolean;
  isDefaultProgressAccount?: boolean;
}
