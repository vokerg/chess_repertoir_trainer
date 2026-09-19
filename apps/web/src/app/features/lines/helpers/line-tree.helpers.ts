import { LineTreeNode, LineTreeNodeData } from '../data-access/lines.models';

export function findLineTreeNode(id: number, node?: LineTreeNode | null): LineTreeNode | null {
  if (!node) return null;
  if (node.node.id === id) return node;
  for (const child of node.children) {
    const found = findLineTreeNode(id, child);
    if (found) return found;
  }
  return null;
}

export function findLineTreeParent(
  id: number,
  node?: LineTreeNode | null,
  parent: LineTreeNode | null = null,
): LineTreeNode | null {
  if (!node) return null;
  if (node.node.id === id) return parent;
  for (const child of node.children) {
    const found = findLineTreeParent(id, child, node);
    if (found) return found;
  }
  return null;
}

export function countLineTreeDescendants(node?: LineTreeNode | null): number {
  if (!node) return 0;
  return node.children.reduce((sum, child) => sum + 1 + countLineTreeDescendants(child), 0);
}

export function patchLineTreeNode(
  root: LineTreeNode,
  nodeId: number,
  patch: Partial<LineTreeNodeData>,
): LineTreeNode {
  if (root.node.id === nodeId) {
    return {
      ...root,
      node: { ...root.node, ...patch },
    };
  }

  return {
    ...root,
    children: root.children.map((child) => patchLineTreeNode(child, nodeId, patch)),
  };
}
