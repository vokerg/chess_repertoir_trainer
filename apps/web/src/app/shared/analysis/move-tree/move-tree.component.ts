import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import {
  AnalysisTree,
  AnalysisTreeNode,
} from '../workbench/analysis-tree.models';

const VIEW_STORAGE_KEY = 'chess-trainer.move-tree-view';

type MoveTreeView = 'tree' | 'score' | 'focused';
export type MoveTreeContext = 'analysis' | 'repertoire';

interface ScoreRow {
  id: number;
  number: number | null;
  white: AnalysisTreeNode | null;
  black: AnalysisTreeNode | null;
}

function storedView(context: MoveTreeContext): MoveTreeView {
  try {
    const value = localStorage.getItem(`${VIEW_STORAGE_KEY}.${context}`)
      ?? (context === 'analysis' ? localStorage.getItem(VIEW_STORAGE_KEY) : null);
    if (value === 'tree' || value === 'score' || (context === 'repertoire' && value === 'focused')) return value;
  } catch {
    // Browser storage is optional.
  }
  return context === 'repertoire' ? 'focused' : 'tree';
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
  readonly context = input<MoveTreeContext>('analysis');
  readonly scoreOnly = input(false);
  readonly selectedNodeId = input<number | null>(null);
  readonly preferredContinuations = input<ReadonlyMap<number, number>>(new Map());
  readonly rootLabel = input('Start');
  readonly deletionEnabled = input(false);
  readonly deletionDisabled = input(false);
  readonly nodeSelected = output<number>();
  readonly deleteSelectedSubtree = output<void>();

  protected readonly requestedView = signal<MoveTreeView | null>(null);
  protected readonly view = computed(() => this.scoreOnly() ? 'score' : this.requestedView() ?? storedView(this.context()));
  protected readonly collapsedBranches = signal<ReadonlySet<number>>(new Set<number>());
  protected readonly openForkId = signal<number | null>(null);
  protected readonly focusedPath = computed(() => {
    const tree = this.tree();
    if (!tree) return [];
    const target = this.selectedNodeId();
    const path = target === null ? null : this.findPath(tree.root, target);
    const nodes = path ?? [tree.root];
    let current = nodes.at(-1)!;
    while (current.children.length) {
      const preferredId = this.preferredContinuations().get(current.node.id);
      current = current.children.find((child) => child.node.id === preferredId) ?? current.children[0];
      nodes.push(current);
    }
    return nodes;
  });
  protected readonly focusedRows = computed(() => this.pairRows(this.focusedPath().slice(1)));
  protected readonly totalMoves = computed(() => {
    const count = (node: AnalysisTreeNode): number => (node.node.id === 0 ? 0 : 1) + node.children.reduce((sum, child) => sum + count(child), 0);
    return this.tree() ? count(this.tree()!.root) : 0;
  });
  private readonly parentById = computed(() => {
    const parents = new Map<number, AnalysisTreeNode>();
    const visit = (node: AnalysisTreeNode): void => {
      for (const child of node.children) {
        parents.set(child.node.id, node);
        visit(child);
      }
    };
    const tree = this.tree();
    if (tree) visit(tree.root);
    return parents;
  });
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
    this.requestedView.set(view);
    this.openForkId.set(null);
    try {
      localStorage.setItem(`${VIEW_STORAGE_KEY}.${this.context()}`, view);
    } catch {
      // The switch still works when browser storage is unavailable.
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
    const tree = this.tree();
    if (!tree) return '';
    const path = this.findPath(tree.root, node.node.id) ?? [node];
    return [...path.slice(1), ...this.mainlineNodes(node).slice(1)]
      .map((move) => {
        const number = move.node.moveNumber;
        const prefix = typeof number === 'number'
          ? `${number}${move.node.side === 'BLACK' ? '…' : '.'}`
          : '';
        return `${prefix}${this.nodeLabel(move)}`;
      })
      .join('  ');
  }

  private findPath(node: AnalysisTreeNode, id: number): AnalysisTreeNode[] | null {
    if (node.node.id === id) return [node];
    for (const child of node.children) {
      const path = this.findPath(child, id);
      if (path) return [node, ...path];
    }
    return null;
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
    return this.pairRows(this.mainlineNodes(start));
  }

  private pairRows(nodes: AnalysisTreeNode[]): ScoreRow[] {
    const rows: ScoreRow[] = [];
    for (const current of nodes) {
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
    if (!meta || ['you', 'opp', 'white', 'black', 'game'].includes(meta.toLowerCase())) return null;
    const parent = this.parentById().get(node.node.id);
    if (meta === 'Game move' && (!parent || parent.children.length < 2)) return null;
    if ((meta === 'Engine line' || meta === 'Local analysis') && parent?.node.moveMeta === meta) return null;
    return meta;
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
