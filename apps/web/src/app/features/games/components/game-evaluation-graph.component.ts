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
  template: `
    @if (points().length > 0) {
      <svg
        class="evaluation-graph"
        viewBox="0 0 600 180"
        role="img"
        aria-label="Imported game evaluation by move"
      >
        <line
          class="zero-line"
          [attr.x1]="horizontalPadding"
          [attr.x2]="viewboxWidth - horizontalPadding"
          [attr.y1]="zeroY"
          [attr.y2]="zeroY"
        />

        @if (path(); as graphPath) {
          <path class="evaluation-line" [attr.d]="graphPath" />
        }

        @for (point of points(); track point.nodeId) {
          <circle
            class="point-hit-target"
            [attr.cx]="point.x"
            [attr.cy]="point.y"
            r="13"
            tabindex="0"
            role="button"
            [attr.aria-label]="'Select move ' + point.plyNumber"
            (click)="nodeSelected.emit(point.nodeId)"
            (keydown.enter)="nodeSelected.emit(point.nodeId)"
            (keydown.space)="selectFromKeyboard($event, point.nodeId)"
          >
            <title>Move {{ point.plyNumber }}: {{ evaluationLabel(point.scoreCp) }}</title>
          </circle>
        }

        @if (selectedPoint(); as point) {
          <circle class="selected-point-halo" [attr.cx]="point.x" [attr.cy]="point.y" r="7" />
          <circle class="selected-point" [attr.cx]="point.x" [attr.cy]="point.y" r="3.5" />
        }
      </svg>
    } @else {
      <p class="empty-note">Run game analysis to see the evaluation graph.</p>
    }
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .evaluation-graph {
      display: block;
      width: 100%;
      height: auto;
      overflow: visible;
    }

    .zero-line {
      stroke: var(--border-strong);
      stroke-width: 1;
      stroke-dasharray: 5 5;
      vector-effect: non-scaling-stroke;
    }

    .evaluation-line {
      fill: none;
      stroke: var(--accent-strong);
      stroke-width: 2.5;
      stroke-linecap: round;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
    }

    .point-hit-target {
      fill: transparent;
      stroke: none;
      cursor: pointer;
      pointer-events: all;
    }

    .point-hit-target:focus-visible {
      fill: var(--accent-soft);
      outline: none;
    }

    .selected-point-halo {
      fill: var(--surface-strong);
      stroke: var(--accent-strong);
      stroke-width: 2;
      pointer-events: none;
      vector-effect: non-scaling-stroke;
    }

    .selected-point {
      fill: var(--accent-strong);
      pointer-events: none;
    }

    .empty-note {
      margin: 0;
      color: var(--muted);
      font-size: 0.9rem;
      line-height: 1.45;
    }
  `,
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

  protected readonly selectedPoint = computed(
    () => this.points().find((point) => point.nodeId === this.selectedNodeId()) ?? null,
  );

  protected evaluationLabel(scoreCp: number): string {
    const pawns = scoreCp / 100;
    return `${pawns >= 0 ? '+' : ''}${pawns.toFixed(2)}`;
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
