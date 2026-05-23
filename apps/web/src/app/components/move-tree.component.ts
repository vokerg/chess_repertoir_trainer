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
    <div *ngIf="tree">
      <ul class="tree-root">
        <ng-container *ngTemplateOutlet="renderNode; context: { $implicit: tree.root }"></ng-container>
      </ul>
    </div>

    <ng-template #renderNode let-nod>
      <li>
        <span
          (click)="select(nod.node.id)"
          [class.selected]="nod.node.id === selectedNodeId"
          [title]="nodeTitle(nod)"
        >
          {{ nod.node.moveSan || '(start)' }}
        </span>
        <small *ngIf="nod.node.id !== 0" class="meta">
          {{ nod.node.isUserMove ? 'you' : 'opp' }}
        </small>
        <ul *ngIf="nod.children && nod.children.length > 0">
          <ng-container *ngFor="let child of nod.children">
            <ng-container *ngTemplateOutlet="renderNode; context: { $implicit: child }"></ng-container>
          </ng-container>
        </ul>
      </li>
    </ng-template>
  `,
  styles: [
    `
    ul { list-style: none; margin-left: 0; padding-left: 12px; }
    li { margin: 4px 0; }
    span { cursor: pointer; padding: 2px 4px; border-radius: 4px; }
    span:hover { background: #eee; }
    .selected { font-weight: bold; background: #ffe08a; }
    .meta { margin-left: 6px; color: #666; font-size: 11px; }
    `
  ]
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
