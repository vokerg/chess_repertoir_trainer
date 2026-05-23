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
      <div style="display:flex;flex-wrap:wrap;gap:20px;">
        <div>
          <app-chess-board [fen]="currentFen" [side]="line?.sideToTrain" [lastMove]="lastMove" (move)="onBoardMove($event)"></app-chess-board>
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
  currentNodeId: number = 0;
  currentFen: string = '';
  lastMove: { from: string; to: string } | null = null;
  loaded = false;
  error: string | null = null;

  constructor(private route: ActivatedRoute, private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.lineId = Number(params.get('lineId'));
      this.loadLineAndTree();
    });
  }

  loadLineAndTree() {
    this.loaded = false;
    this.error = null;
    this.api.get<any>(`/lines/${this.lineId}`).subscribe({
      next: (line) => {
        this.line = line;
        this.api.get<any>(`/lines/${this.lineId}/tree`).subscribe({
          next: (tree) => {
            this.tree = tree;
            this.currentNodeId = tree.root.node.id;
            this.currentFen = tree.root.node.fenAfter;
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

  onSelectNode(id: number) {
    const findNode = (node: any): any => {
      if (node.node.id === id) return node;
      for (const child of node.children || []) {
        const res = findNode(child);
        if (res) return res;
      }
      return null;
    };
    const selected = findNode(this.tree.root);
    if (selected) {
      this.currentNodeId = selected.node.id;
      this.currentFen = selected.node.fenAfter;
      this.lastMove = null;
      this.cdr.detectChanges();
    }
  }

  onBoardMove(uci: string) {
    const parentId = this.currentNodeId === 0 ? null : this.currentNodeId;
    const body: any = { parentId, moveUci: uci };
    const from = uci.substring(0, 2);
    const to = uci.substring(2, 4);
    this.lastMove = { from, to };
    this.error = null;
    this.api.post<any>(`/lines/${this.lineId}/nodes`, body).subscribe({
      next: (created) => {
        this.api.get<any>(`/lines/${this.lineId}/tree`).subscribe({
          next: (tree) => {
            this.tree = tree;
            this.currentNodeId = created.id;
            this.currentFen = created.fenAfter;
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
}
