import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

interface MoveTreeNode {
  node: any;
  children: MoveTreeNode[];
}

interface MoveTree {
  root: MoveTreeNode;
}

@Component({
  selector: 'app-move-tree',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="tree" class="move-tree-modern">
      <ul class="tree-root">
        <ng-container *ngTemplateOutlet="renderNode; context: { $implicit: tree.root }"></ng-container>
      </ul>
    </div>

    <ng-template #renderNode let-nod>
      <li>
        <button
          type="button"
          class="move-tree-node-button"
          [class.move-tree-node-selected]="nod.node.id === selectedNodeId"
          [class.move-tree-node-trained]="nod.node.id !== 0 && nod.node.isUserMove"
          [class.move-tree-node-opponent]="nod.node.id !== 0 && !nod.node.isUserMove"
          (click)="select(nod.node.id)"
          [title]="nodeTitle(nod)"
        >
          <span>{{ nod.node.moveSan || 'Start' }}</span>
          <span *ngIf="nod.node.id !== 0" class="move-tree-meta">
            {{ nod.node.isUserMove ? 'you' : 'opp' }}
          </span>
        </button>
        <ul *ngIf="nod.children && nod.children.length > 0">
          <ng-container *ngFor="let child of nod.children">
            <ng-container *ngTemplateOutlet="renderNode; context: { $implicit: child }"></ng-container>
          </ng-container>
        </ul>
      </li>
    </ng-template>
  `,
})
export class MoveTreeComponent {
  @Input() tree: MoveTree | null = null;
  @Input() selectedNodeId: number | null = null;
  @Output() nodeSelected = new EventEmitter<number>();

  select(id: number) {
    this.nodeSelected.emit(id);
  }

  nodeTitle(nod: MoveTreeNode) {
    if (nod.node.id === 0) return 'Starting position';
    return `${nod.node.moveSan} (${nod.node.moveUci})`;
  }
}
