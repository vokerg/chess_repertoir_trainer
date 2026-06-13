export interface AvailableSublineMove {
  nodeId: number;
  moveUci: string;
  moveSan: string;
  plyNumber: number;
  sortOrder: number;
}

export interface AvailableSubline {
  lineId: number;
  lineName: string;
  chapterId: number;
  chapterName: string;
  leafNodeId: number;
  moves: AvailableSublineMove[];
  moveText: string;
}
