import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  AnalysisTree,
  AnalysisTreeNode,
} from '../workbench/analysis-tree.models';

@Component({
  selector: 'app-move-tree',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './move-tree.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoveTreeComponent {
  readonly tree = input<AnalysisTree | null>(null);
  readonly selectedNodeId = input<number | null>(null);
  readonly rootLabel = input('Start');
  readonly nodeSelected = output<number>();

  protected mainlineNodes(start: AnalysisTreeNode | null | undefined): AnalysisTreeNode[] {
    const nodes: AnalysisTreeNode[] = [];
    let current = start || null;
    while (current) {
      nodes.push(current);
      current = current.children[0] || null;
    }
    return nodes;
  }

  protected sidelines(node: AnalysisTreeNode): AnalysisTreeNode[] {
    return node.children.slice(1);
  }

  protected nodeTitle(node: AnalysisTreeNode): string {
    return node.node.id === 0 ? this.rootLabel() : `${node.node.moveSan} (${node.node.moveUci})`;
  }

  protected nodeLabel(node: AnalysisTreeNode): string {
    return node.node.id === 0 ? this.rootLabel() : node.node.moveSan || node.node.moveUci || 'Move';
  }

  protected nodeMeta(node: AnalysisTreeNode): string {
    return node.node.moveMeta || (node.node.isUserMove ? 'you' : 'opp');
  }
}
