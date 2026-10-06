export type MoveTreeView = 'tree' | 'score' | 'focused';

// A display selects permanent layout choices; features still own the move tree and navigation.
export type MoveListDisplay = 'score' | 'explore' | 'focused';

export const AVAILABLE_MOVE_VIEWS: Record<MoveListDisplay, readonly MoveTreeView[]> = {
  score: ['score'],
  explore: ['tree', 'score'],
  focused: ['focused', 'score', 'tree'],
};
