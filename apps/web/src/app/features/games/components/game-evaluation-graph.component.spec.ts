import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { GameTree, GameTreeNode } from '../helpers/game-detail.models';
import { GameEvaluationGraphComponent } from './game-evaluation-graph.component';

describe('GameEvaluationGraphComponent', () => {
  let fixture: ComponentFixture<GameEvaluationGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameEvaluationGraphComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GameEvaluationGraphComponent);
    fixture.componentRef.setInput('tree', evaluationTree());
    fixture.componentRef.setInput('selectedNodeId', 2);
    fixture.detectChanges();
  });

  it('exposes the graph as an interactive group with one roving tab stop', () => {
    const graph = fixture.nativeElement.querySelector('svg.evaluation-graph') as SVGElement;
    const points = Array.from(
      fixture.nativeElement.querySelectorAll('circle.point-hit-target'),
    ) as SVGCircleElement[];

    expect(graph.getAttribute('role')).toBe('group');
    expect(graph.getAttribute('aria-label')).toBe('Imported game evaluation by move');
    expect(points.map((point) => point.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
    expect(points.map((point) => point.getAttribute('aria-pressed'))).toEqual([
      'false',
      'true',
      'false',
    ]);
  });

  it('moves and selects with arrow keys without adding every point to the page tab order', () => {
    let selectedNodeId: number | undefined;
    fixture.componentInstance.nodeSelected.subscribe((nodeId) => (selectedNodeId = nodeId));

    const points = Array.from(
      fixture.nativeElement.querySelectorAll('circle.point-hit-target'),
    ) as SVGCircleElement[];
    points[1].focus();
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    });

    points[1].dispatchEvent(event);

    expect(event.defaultPrevented).toBeTrue();
    expect(selectedNodeId).toBe(3);
    expect(document.activeElement).toBe(points[2]);
  });

  it('selects the focused point with Space and prevents page scrolling', () => {
    let selectedNodeId: number | undefined;
    fixture.componentInstance.nodeSelected.subscribe((nodeId) => (selectedNodeId = nodeId));

    const selectedPoint = fixture.nativeElement.querySelector(
      'circle.point-hit-target[tabindex="0"]',
    ) as SVGCircleElement;
    const event = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      cancelable: true,
    });

    selectedPoint.dispatchEvent(event);

    expect(event.defaultPrevented).toBeTrue();
    expect(selectedNodeId).toBe(2);
  });
});

function evaluationTree(): GameTree {
  const third = gameNode(3, 3, 120);
  const second = gameNode(2, 2, -40, [third]);
  const first = gameNode(1, 1, 35, [second]);

  return {
    root: {
      node: {
        id: 0,
        plyNumber: null,
        moveSan: null,
        moveUci: null,
        fenBefore: 'start',
        fenAfter: 'start',
        isUserMove: false,
        source: 'LOCAL',
        analysisMove: null,
        evalCpWhite: null,
      },
      children: [first],
    },
  };
}

function gameNode(
  id: number,
  plyNumber: number,
  evalCpWhite: number,
  children: GameTreeNode[] = [],
): GameTreeNode {
  return {
    node: {
      id,
      plyNumber,
      moveSan: `Move ${plyNumber}`,
      moveUci: `move${plyNumber}`,
      fenBefore: `before-${plyNumber}`,
      fenAfter: `after-${plyNumber}`,
      isUserMove: plyNumber % 2 === 1,
      source: 'GAME',
      analysisMove: null,
      evalCpWhite,
    },
    children,
  };
}
