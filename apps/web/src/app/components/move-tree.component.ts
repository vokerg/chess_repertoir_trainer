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
      <ng-container *ngTemplateOutlet="renderSequence; context: { $implicit: mainlineNodes(tree.root), branch: false }"></ng-container>
    </div>

    <ng-template #renderSequence let-nodes let-branch="branch">
      <section class="move-tree-line" [class.move-tree-line-branch]="branch">
        <ng-container *ngFor="let nod of nodes">
          <div class="move-tree-step">
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

            <div *ngIf="sidelines(nod).length > 0" class="move-tree-branches">
              <ng-container *ngFor="let branchNode of sidelines(nod)">
                <ng-container *ngTemplateOutlet="renderSequence; context: { $implicit: mainlineNodes(branchNode), branch: true }"></ng-container>
              </ng-container>
            </div>
          </div>
        </ng-container>
      </section>
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

  mainlineNodes(start: MoveTreeNode | null | undefined): MoveTreeNode[] {
    const nodes: MoveTreeNode[] = [];
    let current = start || null;
    while (current) {
      nodes.push(current);
      current = current.children?.[0] || null;
    }
    return nodes;
  }

  mainChild(nod: MoveTreeNode): MoveTreeNode | null {
    return nod.children?.[0] || null;
  }

  sidelines(nod: MoveTreeNode): MoveTreeNode[] {
    return nod.children?.slice(1) || [];
  }

  nodeTitle(nod: MoveTreeNode) {
    if (nod.node.id === 0) return 'Starting position';
    return `${nod.node.moveSan} (${nod.node.moveUci})`;
  }
}
