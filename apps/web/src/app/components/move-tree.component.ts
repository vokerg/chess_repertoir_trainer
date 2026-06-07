import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { GameTree, GameTreeNode } from '../features/games/game-detail/game-detail.models';

@Component({
  selector: 'app-move-tree',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './move-tree.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoveTreeComponent {
  readonly tree = input<GameTree | null>(null);
  readonly selectedNodeId = input<number | null>(null);
  readonly nodeSelected = output<number>();

  protected mainlineNodes(start: GameTreeNode | null | undefined): GameTreeNode[] {
    const nodes: GameTreeNode[] = [];
    let current = start || null;
    while (current) {
      nodes.push(current);
      current = current.children[0] || null;
    }
    return nodes;
  }

  protected sidelines(node: GameTreeNode): GameTreeNode[] {
    return node.children.slice(1);
  }

  protected nodeTitle(node: GameTreeNode): string {
    return node.node.id === 0 ? 'Starting position' : `${node.node.moveSan} (${node.node.moveUci})`;
  }
}
