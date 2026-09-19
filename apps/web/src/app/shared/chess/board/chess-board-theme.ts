export type ChessBoardThemeId = 'walnut' | 'sage' | 'slate' | 'training';

export const ACTIVE_CHESS_BOARD_THEME: ChessBoardThemeId = 'walnut';

export const CHESS_BOARD_THEMES: Record<ChessBoardThemeId, { label: string }> = {
  walnut: { label: 'Walnut' },
  sage: { label: 'Sage' },
  slate: { label: 'Slate' },
  training: { label: 'Training' },
};
