import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CopyButtonComponent } from '../../ui/copy-button/copy-button.component';
import { MoveTreeComponent } from '../move-tree/move-tree.component';
import { AnalysisTree, AnalysisTreeNode } from '../workbench/analysis-tree.models';

@Component({
  selector: 'app-move-tree-panel',
  standalone: true,
  imports: [CopyButtonComponent, MoveTreeComponent],
  templateUrl: './move-tree-panel.component.html',
  styleUrl: './move-tree-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoveTreePanelComponent {
  readonly tree = input<AnalysisTree | null>(null);
  readonly selectedNodeId = input<number | null>(null);
  readonly title = input.required<string>();
  readonly help = input<string>();
  readonly rootLabel = input('Start');
  readonly copyLabel = input('Copy line');
  readonly deletionEnabled = input(false);
  readonly deletionDisabled = input(false);

  readonly nodeSelected = output<number>();
  readonly deleteSelectedSubtree = output<void>();

  protected readonly copyLine = computed(() => {
    const tree = this.tree();
    if (!tree) return '';

    const selectedPath = this.selectedPath(tree);
    const path = selectedPath.at(-1)?.node.id === 0
      ? this.mainlinePath(tree.root)
      : selectedPath;
    return path
      .filter((node) => node.node.id !== 0)
      .map((node) => node.node.moveSan || node.node.moveUci)
      .filter((move): move is string => Boolean(move))
      .join(' ');
  });

  private selectedPath(tree: AnalysisTree): AnalysisTreeNode[] {
    const selectedNodeId = this.selectedNodeId();
    if (selectedNodeId === null) return [];
    return this.findPath(tree.root, selectedNodeId) || [];
  }

  private findPath(node: AnalysisTreeNode, selectedNodeId: number): AnalysisTreeNode[] | null {
    if (node.node.id === selectedNodeId) return [node];

    for (const child of node.children) {
      const childPath = this.findPath(child, selectedNodeId);
      if (childPath) return [node, ...childPath];
    }
    return null;
  }

  private mainlinePath(root: AnalysisTreeNode): AnalysisTreeNode[] {
    const path: AnalysisTreeNode[] = [];
    let current: AnalysisTreeNode | null = root;
    while (current) {
      path.push(current);
      current = current.children[0] || null;
    }
    return path;
  }
}
