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
  styleUrl: './move-tree.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoveTreeComponent {
  readonly tree = input<AnalysisTree | null>(null);
  readonly selectedNodeId = input<number | null>(null);
  readonly rootLabel = input('Start');
  readonly deletionEnabled = input(false);
  readonly deletionDisabled = input(false);
  readonly nodeSelected = output<number>();
  readonly deleteSelectedSubtree = output<void>();

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

  protected moveNumberLabel(node: AnalysisTreeNode): string {
    if (node.node.id === 0) return '';
    if (typeof node.node.moveNumber !== 'number' || !node.node.side) return '';
    return node.node.side === 'WHITE' ? `${node.node.moveNumber}.` : '';
  }

  protected classificationLabel(node: AnalysisTreeNode): string | null {
    switch (this.normalizedClassification(node)) {
      case 'INACCURACY':
        return '?!';
      case 'MISTAKE':
        return '?';
      case 'BLUNDER':
        return '??';
      case 'MISSED_OPPORTUNITY':
        return '□';
      default:
        return null;
    }
  }

  protected classificationTitle(node: AnalysisTreeNode): string | null {
    return node.node.classification || null;
  }

  protected classificationTone(node: AnalysisTreeNode): 'good' | 'warning' | 'bad' | 'neutral' {
    switch (this.normalizedClassification(node)) {
      case 'INACCURACY':
      case 'MISSED_OPPORTUNITY':
        return 'warning';
      case 'MISTAKE':
      case 'BLUNDER':
        return 'bad';
      default:
        return 'neutral';
    }
  }

  protected evalLabel(node: AnalysisTreeNode): string | null {
    if (typeof node.node.evalCpWhite !== 'number') return null;
    const pawns = node.node.evalCpWhite / 100;
    return pawns > 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
  }

  protected canDeleteNode(node: AnalysisTreeNode): boolean {
    if (!this.deletionEnabled() || node.node.id === 0) return false;

    const source = (
      node.node as AnalysisTreeNode['node'] & { source?: 'GAME' | 'LOCAL' }
    ).source;
    return source === undefined || source === 'LOCAL';
  }

  protected requestDelete(node: AnalysisTreeNode, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.canDeleteNode(node) || this.deletionDisabled()) return;

    this.nodeSelected.emit(node.node.id);
    this.deleteSelectedSubtree.emit();
  }

  private normalizedClassification(node: AnalysisTreeNode): string | null {
    const value = node.node.classification?.trim();
    if (!value || value === 'Not analysed') return null;
    return value.toUpperCase().replace(/\s+/g, '_');
  }
}
