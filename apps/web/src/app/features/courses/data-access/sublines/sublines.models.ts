export interface AvailableSublineMove {
  nodeId: number;
  moveUci: string;
  moveSan: string;
  plyNumber: number;
  sortOrder: number;
}

export interface AvailableSubline {
  hash: string;
  canonicalKeyVersion: number;
  lineId: number;
  lineName: string;
  chapterId: number;
  chapterName: string;
  leafNodeId: number;
  moves: AvailableSublineMove[];
  moveText: string;
}
