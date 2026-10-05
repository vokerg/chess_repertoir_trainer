import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import {
  AnalysisTree,
  AnalysisTreeNode,
} from '../workbench/analysis-tree.models';

const VIEW_STORAGE_KEY = 'chess-trainer.move-tree-view';

type MoveTreeView = 'tree' | 'score';

interface ScoreRow {
  id: number;
  number: number | null;
  white: AnalysisTreeNode | null;
  black: AnalysisTreeNode | null;
}

function storedView(): MoveTreeView {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(VIEW_STORAGE_KEY) === 'score'
      ? 'score'
      : 'tree';
  } catch {
    return 'tree';
  }
}

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

  protected readonly view = signal<MoveTreeView>(storedView());
  protected readonly collapsedBranches = signal<ReadonlySet<number>>(new Set<number>());
  protected readonly selectedPathIds = computed(() => {
    const ids = new Set<number>();
    const tree = this.tree();
    const selected = this.selectedNodeId();
    if (!tree || selected === null) return ids;
    const find = (node: AnalysisTreeNode): boolean => {
      if (node.node.id === selected) {
        ids.add(node.node.id);
        return true;
      }
      for (const child of node.children) {
        if (find(child)) {
          ids.add(node.node.id);
          return true;
        }
      }
      return false;
    };
    find(tree.root);
    return ids;
  });

  protected setView(view: MoveTreeView): void {
    this.view.set(view);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch {
      // The switch still works when browser storage is unavailable.
    }
  }

  protected toggleBranch(id: number, parentId: number): void {
    if (this.branchExpanded(id) && this.selectedPathIds().has(id)) {
      this.nodeSelected.emit(parentId);
    }
    this.collapsedBranches.update((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected branchExpanded(id: number): boolean {
    return !this.collapsedBranches().has(id) || this.selectedPathIds().has(id);
  }

  protected scoreRows(start: AnalysisTreeNode | null | undefined): ScoreRow[] {
    const rows: ScoreRow[] = [];
    for (const current of this.mainlineNodes(start)) {
      const number = current.node.moveNumber ?? null;
      const side = current.node.side;
      const last = rows.at(-1);
      if (!last || last.number !== number || (side === 'WHITE' ? last.white : last.black)) {
        rows.push({ id: current.node.id, number, white: null, black: null });
      }
      const row = rows.at(-1)!;
      if (side === 'WHITE') row.white = current;
      else row.black = current;
    }
    return rows;
  }

  protected branchOrigin(parent: AnalysisTreeNode): string {
    return parent.node.id === 0 ? this.rootLabel() : this.nodeLabel(parent);
  }

  protected scoreSource(node: AnalysisTreeNode): string | null {
    const meta = node.node.moveMeta?.trim();
    if (meta && !['you', 'opp', 'white', 'black'].includes(meta.toLowerCase())) return meta;
    return node.node.source === 'LOCAL' ? 'Local line' : null;
  }

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

    const source = node.node.source;
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
