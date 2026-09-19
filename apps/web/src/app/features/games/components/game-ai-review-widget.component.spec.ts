import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { AiGameReviewResponse } from '@chess-trainer/contracts/ai';
import { GameAiReviewWidgetComponent } from './game-ai-review-widget.component';

@Component({
  standalone: true,
  imports: [GameAiReviewWidgetComponent],
  template: `
    <app-game-ai-review-widget
      [review]="review()"
      [selectedPlyNumber]="selectedPlyNumber()"
      (moveSelected)="selectedMove.set($event)"
    />
  `,
})
class TestHostComponent {
  readonly review = signal<AiGameReviewResponse | null>(null);
  readonly selectedPlyNumber = signal<number | null>(null);
  readonly selectedMove = signal<number | null>(null);
}

describe('GameAiReviewWidgetComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();
  });

  it('hides the widget until an AI overview exists', () => {
    const fixture = createFixture();

    expect(text(fixture)).not.toContain('AI game review');
  });

  it('renders a supplied AI overview', () => {
    const fixture = createFixture();
    fixture.componentInstance.review.set(reviewResponse());
    fixture.detectChanges();

    expect(text(fixture)).toContain('A controlled game with one key improvement');
    expect(text(fixture)).toContain('Engine preference: Bc4');
  });

  it('emits the turning point ply and marks the selected move', () => {
    const fixture = createFixture();
    fixture.componentInstance.review.set(reviewResponse());
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const turningPoint = root.querySelector<HTMLButtonElement>('.ai-review-turning-point');
    expect(turningPoint).not.toBeNull();
    turningPoint?.click();
    expect(fixture.componentInstance.selectedMove()).toBe(3);

    fixture.componentInstance.selectedPlyNumber.set(3);
    fixture.detectChanges();
    expect(turningPoint?.classList.contains('active')).toBeTrue();
    expect(turningPoint?.getAttribute('aria-pressed')).toBe('true');
  });

  function createFixture(): ComponentFixture<TestHostComponent> {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    return fixture;
  }

  function text(fixture: ComponentFixture<TestHostComponent>): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }
});

function reviewResponse(): AiGameReviewResponse {
  return {
    kind: 'GAME_REVIEW',
    schemaVersion: 1,
    generatedAt: '2026-07-19T14:00:00.000Z',
    review: {
      headline: 'A controlled game with one key improvement',
      overview: 'You handled the opening well and kept the position playable.',
      openingAssessment: 'Development was natural and the king remained safe.',
      turningPoints: [{
        plyNumber: 3,
        moveNumber: 2,
        side: 'WHITE',
        playedMoveSan: 'Nf3',
        bestMoveSan: 'Bc4',
        classification: 'MISTAKE',
        scoreLossCp: 95,
        explanation: 'This was playable, but the engine preferred more active development.',
      }],
      strengths: ['Kept the position under control'],
      improvements: ['Compare candidate developing moves'],
      practicePriorities: ['Opening move-order review'],
      themes: ['development'],
    },
    warnings: [],
  };
}
