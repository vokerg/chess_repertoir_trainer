import { MoveTreeNodeDto } from '@/api/dto';

export type FlatMoveNode = {
  id: number;
  parentId: number | null;
  depth: number;
  label: string;
  node: MoveTreeNodeDto['node'];
};

export function flattenMoveTree(root: MoveTreeNodeDto): FlatMoveNode[] {
  const rows: FlatMoveNode[] = [];
  function visit(item: MoveTreeNodeDto, depth: number): void {
    if (item.node.id !== 0) {
      rows.push({
        id: item.node.id,
        parentId: item.node.parentId ?? null,
        depth,
        label: item.node.moveSan || item.node.moveUci || 'Root',
        node: item.node,
      });
    }
    item.children.forEach((child) => visit(child, depth + 1));
  }
  visit(root, 0);
  return rows;
}
