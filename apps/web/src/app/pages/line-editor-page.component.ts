import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { ChessBoardComponent } from '../components/chess-board.component';
import { MoveTreeComponent } from '../components/move-tree.component';

@Component({
  selector: 'app-line-editor-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ChessBoardComponent, MoveTreeComponent],
  template: `
    <div *ngIf="loaded">
      <h2>{{ line?.name }} - Editor</h2>
      <p *ngIf="error" style="color:#b00020;">{{ error }}</p>
      <div style="display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start;">
        <div>
          <app-chess-board [fen]="currentFen" [side]="line?.sideToTrain" [lastMove]="lastMove" (move)="onBoardMove($event)"></app-chess-board>

          <div style="margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <button type="button" (click)="goToStart()" [disabled]="currentNodeId === 0">⏮ Start</button>
            <button type="button" (click)="goToPrevious()" [disabled]="currentNodeId === 0">← Previous</button>
            <button type="button" (click)="goToNext()" [disabled]="!selectedNode?.children?.length">Next →</button>
            <span style="color:#666;">Selected: {{ selectedLabel() }}</span>
          </div>

          <div style="margin-top:12px;border:1px solid #ddd;padding:10px;max-width:520px;">
            <h3 style="margin-top:0;">Selected move</h3>
            <p *ngIf="selectedNode?.node?.id === 0">Start position. Add the first move from the board.</p>
            <div *ngIf="selectedNode?.node?.id !== 0">
              <p><strong>{{ selectedNode?.node?.moveSan }}</strong> <code>{{ selectedNode?.node?.moveUci }}</code></p>
              <p>Side: {{ selectedNode?.node?.side }} · {{ selectedNode?.node?.isUserMove ? 'trained move' : 'opponent reply' }}</p>
              <p>Children to delete with this move: {{ countDescendants(selectedNode) }}</p>
              <button type="button" (click)="deleteSelectedSubtree()" [disabled]="deleting">
                {{ deleting ? 'Deleting...' : 'Delete this move and continuation' }}
              </button>
            </div>
          </div>
        </div>
        <div>
          <h3>Move Tree</h3>
          <app-move-tree [tree]="tree" [selectedNodeId]="currentNodeId" (nodeSelected)="onSelectNode($event)"></app-move-tree>
        </div>
      </div>
    </div>
    <div *ngIf="!loaded">
      <p>Loading...</p>
      <p *ngIf="error" style="color:#b00020;">{{ error }}</p>
    </div>
  `
})
export class LineEditorPageComponent implements OnInit {
  lineId!: number;
  line: any;
  tree: any;
  selectedNode: any;
  currentNodeId: number = 0;
  currentFen: string = '';
  lastMove: { from: string; to: string } | null = null;
  loaded = false;
  deleting = false;
  error: string | null = null;

  constructor(private route: ActivatedRoute, private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.lineId = Number(params.get('lineId'));
      this.loadLineAndTree();
    });
  }

  loadLineAndTree(selectNodeId?: number) {
    this.loaded = false;
    this.error = null;
    this.api.get<any>(`/lines/${this.lineId}`).subscribe({
      next: (line) => {
        this.line = line;
        this.api.get<any>(`/lines/${this.lineId}/tree`).subscribe({
          next: (tree) => {
            this.tree = tree;
            const targetId = selectNodeId ?? tree.root.node.id;
            this.setSelectedNode(targetId);
            this.lastMove = null;
            this.loaded = true;
            this.cdr.detectChanges();
          },
          error: () => {
            this.error = 'Could not load move tree.';
            this.cdr.detectChanges();
          },
        });
      },
      error: () => {
        this.error = 'Could not load line.';
        this.cdr.detectChanges();
      },
    });
  }

  findNode(id: number, node = this.tree?.root): any {
    if (!node) return null;
    if (node.node.id === id) return node;
    for (const child of node.children || []) {
      const res = this.findNode(id, child);
      if (res) return res;
    }
    return null;
  }

  findParentNode(id: number, node = this.tree?.root, parent: any = null): any {
    if (!node) return null;
    if (node.node.id === id) return parent;
    for (const child of node.children || []) {
      const res = this.findParentNode(id, child, node);
      if (res) return res;
    }
    return null;
  }

  setSelectedNode(id: number) {
    const selected = this.findNode(id) || this.tree.root;
    this.selectedNode = selected;
    this.currentNodeId = selected.node.id;
    this.currentFen = selected.node.fenAfter;
    this.lastMove = selected.node.id === 0 || !selected.node.moveUci
      ? null
      : { from: selected.node.moveUci.substring(0, 2), to: selected.node.moveUci.substring(2, 4) };
  }

  selectedLabel() {
    if (!this.selectedNode || this.selectedNode.node.id === 0) return 'start';
    return `${this.selectedNode.node.moveSan || this.selectedNode.node.moveUci}`;
  }

  countDescendants(node: any): number {
    if (!node) return 0;
    return (node.children || []).reduce((sum: number, child: any) => sum + 1 + this.countDescendants(child), 0);
  }

  onSelectNode(id: number) {
    this.setSelectedNode(id);
    this.cdr.detectChanges();
  }

  goToStart() {
    this.setSelectedNode(0);
    this.cdr.detectChanges();
  }

  goToPrevious() {
    const parent = this.findParentNode(this.currentNodeId);
    if (parent) {
      this.setSelectedNode(parent.node.id);
      this.cdr.detectChanges();
    }
  }

  goToNext() {
    const firstChild = this.selectedNode?.children?.[0];
    if (firstChild) {
      this.setSelectedNode(firstChild.node.id);
      this.cdr.detectChanges();
    }
  }

  onBoardMove(uci: string) {
    const parentId = this.currentNodeId === 0 ? null : this.currentNodeId;
    const body: any = { parentId, moveUci: uci };
    this.lastMove = { from: uci.substring(0, 2), to: uci.substring(2, 4) };
    this.error = null;
    this.api.post<any>(`/lines/${this.lineId}/nodes`, body).subscribe({
      next: (created) => {
        this.api.get<any>(`/lines/${this.lineId}/tree`).subscribe({
          next: (tree) => {
            this.tree = tree;
            this.setSelectedNode(created.id);
            this.cdr.detectChanges();
          },
          error: () => {
            this.error = 'Move was added, but the tree could not be reloaded.';
            this.cdr.detectChanges();
          },
        });
      },
      error: () => {
        this.error = 'Could not add this move. It may be illegal or this position already has a trained-side move.';
        this.cdr.detectChanges();
      },
    });
  }

  deleteSelectedSubtree() {
    if (!this.selectedNode || this.selectedNode.node.id === 0 || this.deleting) return;
    const node = this.selectedNode.node;
    const parent = this.findParentNode(node.id);
    const parentId = parent?.node?.id ?? 0;
    const label = node.moveSan || node.moveUci;
    const descendantCount = this.countDescendants(this.selectedNode);
    const confirmed = window.confirm(`Delete ${label} and ${descendantCount} following move(s)? This cannot be undone.`);
    if (!confirmed) return;

    this.deleting = true;
    this.error = null;
    this.api.delete<void>(`/nodes/${node.id}/subtree`).subscribe({
      next: () => {
        this.deleting = false;
        this.loadLineAndTree(parentId);
      },
      error: () => {
        this.deleting = false;
        this.error = 'Could not delete this move.';
        this.cdr.detectChanges();
      },
    });
  }
}
