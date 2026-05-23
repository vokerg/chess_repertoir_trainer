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
        <span (click)="select(nod.node.id)" [style.fontWeight]="nod.node.id === selectedNodeId ? 'bold' : 'normal'">
          {{ nod.node.moveSan || '(start)' }}
        </span>
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
    span { cursor: pointer; }
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
}