import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import {
  AnalysisTree,
  AnalysisTreeNode,
} from '../workbench/analysis-tree.models';
import { AVAILABLE_MOVE_VIEWS } from './move-list-display';
import type { MoveListDisplay, MoveTreeView } from './move-list-display';
import { firstChildSequence, indexMoveTree, pairMoveRows, pathToMove } from './move-tree-view.helpers';

const VIEW_STORAGE_KEY = 'chess-trainer.move-tree-view';

function storedView(display: MoveListDisplay): MoveTreeView | null {
  if (display === 'score') return null;
  try {
    const legacyKey = display === 'focused' ? `${VIEW_STORAGE_KEY}.repertoire` : `${VIEW_STORAGE_KEY}.analysis`;
    const value = localStorage.getItem(`${VIEW_STORAGE_KEY}.${display}`)
      ?? localStorage.getItem(legacyKey)
      ?? (display === 'explore' ? localStorage.getItem(VIEW_STORAGE_KEY) : null);
    if (value && AVAILABLE_MOVE_VIEWS[display].includes(value as MoveTreeView)) return value as MoveTreeView;
  } catch {
    // Browser storage is optional.
  }
  return null;
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
  readonly display = input<MoveListDisplay>('explore');
  readonly selectedNodeId = input<number | null>(null);
  readonly preferredContinuations = input<ReadonlyMap<number, number>>(new Map());
  readonly rootLabel = input('Start');
  readonly deletionEnabled = input(false);
  readonly deletionDisabled = input(false);
  readonly nodeSelected = output<number>();
  readonly deleteSelectedSubtree = output<void>();

  protected readonly requestedViews = signal<Partial<Record<MoveListDisplay, MoveTreeView>>>({});
  protected readonly availableViews = computed(() => AVAILABLE_MOVE_VIEWS[this.display()]);
  protected readonly view = computed(() => {
    const requested = this.requestedViews()[this.display()];
    if (requested && this.availableViews().includes(requested)) return requested;
    return storedView(this.display()) ?? this.availableViews()[0];
  });
  protected readonly collapsedBranches = signal<ReadonlySet<number>>(new Set<number>());
  protected readonly openForkId = signal<number | null>(null);
  private readonly treeIndex = computed(() => {
    const tree = this.tree();
    return tree ? indexMoveTree(tree.root) : null;
  });
  protected readonly focusedPath = computed(() => {
    const tree = this.tree();
    if (!tree) return [];
    const target = this.selectedNodeId();
    const index = this.treeIndex()!;
    const path = target === null ? null : pathToMove(index, target);
    const nodes = path ?? [tree.root];
    return [...nodes, ...firstChildSequence(nodes.at(-1), this.preferredContinuations()).slice(1)];
  });
  protected readonly focusedRows = computed(() => pairMoveRows(this.focusedPath().slice(1)));
  protected readonly totalMoves = computed(() => this.treeIndex()?.moveCount ?? 0);
  protected readonly selectedPathIds = computed(() => {
    const index = this.treeIndex();
    const selected = this.selectedNodeId();
    return new Set(index && selected !== null ? (pathToMove(index, selected) ?? []).map((node) => node.node.id) : []);
  });

  protected setView(view: MoveTreeView): void {
    if (!this.availableViews().includes(view)) return;
    this.requestedViews.update((current) => ({ ...current, [this.display()]: view }));
    this.openForkId.set(null);
    try {
      if (this.display() !== 'score') localStorage.setItem(`${VIEW_STORAGE_KEY}.${this.display()}`, view);
    } catch {
      // The switch still works when browser storage is unavailable.
    }
  }

  protected viewLabel(view: MoveTreeView): string {
    switch (view) {
      case 'focused': return 'Focused score';
      case 'score': return 'All forks';
      case 'tree': return 'Tree';
    }
  }

  protected toggleFork(id: number): void {
    this.openForkId.update((current) => current === id ? null : id);
  }

  protected chooseFork(id: number): void {
    this.openForkId.set(null);
    this.nodeSelected.emit(id);
  }

  protected forkChoices(parent: AnalysisTreeNode): AnalysisTreeNode[] {
    return parent.children;
  }

  protected fullLine(node: AnalysisTreeNode): string {
    const index = this.treeIndex();
    if (!index) return '';
    const path = pathToMove(index, node.node.id) ?? [node];
    return [...path.slice(1), ...firstChildSequence(node, this.preferredContinuations()).slice(1)]
      .map((move) => {
        const number = move.node.moveNumber;
        const prefix = typeof number === 'number'
          ? `${number}${move.node.side === 'BLACK' ? '…' : '.'}`
          : '';
        return `${prefix}${this.nodeLabel(move)}`;
      })
      .join('  ');
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

  protected scoreRows(start: AnalysisTreeNode | null | undefined) {
    return pairMoveRows(firstChildSequence(start));
  }

  protected branchOrigin(parent: AnalysisTreeNode): string {
    return parent.node.id === 0 ? this.rootLabel() : this.nodeLabel(parent);
  }

  protected scoreSource(node: AnalysisTreeNode): string | null {
    const meta = node.node.moveMeta?.trim();
    if (!meta || ['you', 'opp', 'white', 'black', 'game'].includes(meta.toLowerCase())) return null;
    const parent = this.treeIndex()?.parentById.get(node.node.id);
    if (meta === 'Game move' && (!parent || parent.children.length < 2)) return null;
    if ((meta === 'Engine line' || meta === 'Local analysis') && parent?.node.moveMeta === meta) return null;
    return meta;
  }

  protected mainlineNodes(start: AnalysisTreeNode | null | undefined): AnalysisTreeNode[] {
    return firstChildSequence(start);
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
