import { Component, OnInit } from '@angular/core';
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
      Loading...
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
  constructor(private route: ActivatedRoute, private api: ApiService) {}
  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.lineId = Number(params.get('lineId'));
      this.loadLineAndTree();
    });
  }
  loadLineAndTree() {
    this.loaded = false;
    // fetch line details
    this.api.get<any>(`/lines/${this.lineId}`).subscribe((line) => {
      this.line = line;
      // fetch tree
      this.api.get<any>(`/lines/${this.lineId}/tree`).subscribe((tree) => {
        this.tree = tree;
        // set current node to root
        this.currentNodeId = tree.root.node.id;
        this.currentFen = tree.root.node.fenAfter;
      this.lastMove = null;
        this.loaded = true;
      });
    });
  }
  onSelectNode(id: number) {
    // find node in tree recursively and set currentFen
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
    }
  }
  onBoardMove(uci: string) {
    // call API to add node under current node
    const parentId = this.currentNodeId === 0 ? null : this.currentNodeId;
    const body: any = { parentId, moveUci: uci };
    // record last move for highlight
    const from = uci.substring(0, 2);
    const to = uci.substring(2, 4);
    this.lastMove = { from, to };
    this.api.post<any>(`/lines/${this.lineId}/nodes`, body).subscribe((created) => {
      // refresh tree and set current node to created id
      this.api.get<any>(`/lines/${this.lineId}/tree`).subscribe((tree) => {
        this.tree = tree;
        this.currentNodeId = created.id;
        this.currentFen = created.fenAfter;
      });
    });
  }
}