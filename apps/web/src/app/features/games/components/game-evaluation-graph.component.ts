import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { GameTree, GameTreeNode } from '../helpers/game-detail.models';

interface EvaluationGraphPoint {
  nodeId: number;
  plyNumber: number;
  scoreCp: number;
  x: number;
  y: number;
}

const VIEWBOX_WIDTH = 600;
const VIEWBOX_HEIGHT = 180;
const HORIZONTAL_PADDING = 14;
const VERTICAL_PADDING = 12;
const MAX_SCORE_CP = 800;

@Component({
  selector: 'app-game-evaluation-graph',
  standalone: true,
  templateUrl: './game-evaluation-graph.component.html',
  styleUrl: './game-evaluation-graph.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameEvaluationGraphComponent {
  readonly tree = input.required<GameTree>();
  readonly selectedNodeId = input.required<number>();
  readonly blackPerspective = input(false);

  readonly nodeSelected = output<number>();

  protected readonly viewboxWidth = VIEWBOX_WIDTH;
  protected readonly horizontalPadding = HORIZONTAL_PADDING;
  protected readonly zeroY = VIEWBOX_HEIGHT / 2;

  protected readonly points = computed<EvaluationGraphPoint[]>(() => {
    const nodes = this.mainGameLine(this.tree());
    const scores = nodes
      .map((node) => {
        const score =
          typeof node.node.evalCpWhite === 'number'
            ? node.node.evalCpWhite
            : node.node.analysisMove?.playedScoreCpWhite;
        return typeof score === 'number' && Number.isFinite(score) && node.node.plyNumber !== null
          ? { nodeId: node.node.id, plyNumber: node.node.plyNumber, scoreCpWhite: score }
          : null;
      })
      .filter(
        (
          point,
        ): point is { nodeId: number; plyNumber: number; scoreCpWhite: number } => point !== null,
      )
      .sort((left, right) => left.plyNumber - right.plyNumber);

    if (scores.length === 0) return [];

    const firstPly = scores[0].plyNumber;
    const lastPly = scores[scores.length - 1].plyNumber;
    const plyRange = lastPly - firstPly;
    const plotWidth = VIEWBOX_WIDTH - HORIZONTAL_PADDING * 2;
    const plotHeight = VIEWBOX_HEIGHT - VERTICAL_PADDING * 2;

    return scores.map((point) => {
      const perspectiveScore = this.blackPerspective() ? -point.scoreCpWhite : point.scoreCpWhite;
      const clampedScore = Math.max(-MAX_SCORE_CP, Math.min(MAX_SCORE_CP, perspectiveScore));
      const x =
        plyRange === 0
          ? VIEWBOX_WIDTH / 2
          : HORIZONTAL_PADDING + ((point.plyNumber - firstPly) / plyRange) * plotWidth;
      const y =
        VERTICAL_PADDING + ((MAX_SCORE_CP - clampedScore) / (MAX_SCORE_CP * 2)) * plotHeight;

      return {
        nodeId: point.nodeId,
        plyNumber: point.plyNumber,
        scoreCp: perspectiveScore,
        x,
        y,
      };
    });
  });

  protected readonly path = computed(() => {
    const points = this.points();
    if (points.length === 0) return null;
    return points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
  });

  protected readonly areaPath = computed(() => {
    const points = this.points();
    const graphPath = this.path();
    if (points.length === 0 || !graphPath) return null;
    return `${graphPath} L ${points[points.length - 1].x} ${this.zeroY} L ${points[0].x} ${this.zeroY} Z`;
  });

  protected readonly selectedPoint = computed(
    () => this.points().find((point) => point.nodeId === this.selectedNodeId()) ?? null,
  );

  protected evaluationLabel(scoreCp: number): string {
    const pawns = scoreCp / 100;
    return `${pawns >= 0 ? '+' : ''}${pawns.toFixed(2)}`;
  }

  protected moveLabel(plyNumber: number): string {
    const moveNumber = Math.ceil(plyNumber / 2);
    return `${moveNumber}${plyNumber % 2 === 0 ? '…' : '.'}`;
  }

  protected selectFromKeyboard(event: Event, nodeId: number): void {
    event.preventDefault();
    this.nodeSelected.emit(nodeId);
  }

  private mainGameLine(tree: GameTree): GameTreeNode[] {
    const nodes: GameTreeNode[] = [];
    let current = tree.root.children[0];

    while (current) {
      if (current.node.source === 'GAME') nodes.push(current);
      current = current.children[0];
    }

    return nodes;
  }
}
