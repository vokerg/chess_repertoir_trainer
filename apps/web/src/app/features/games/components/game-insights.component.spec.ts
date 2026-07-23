import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { AiGameReviewResponse } from '@chess-trainer/contracts/ai';
import type { GameTacticalFinding } from '../data-access/game-tactical-findings-api.service';
import { GameInsightsComponent } from './game-insights.component';

@Component({
  standalone: true,
  imports: [GameInsightsComponent],
  template: `
    <app-game-insights
      [gameId]="7"
      [findings]="findings()"
      [review]="review()"
    />
  `,
})
class TestHostComponent {
  readonly findings = signal<readonly GameTacticalFinding[]>([]);
  readonly review = signal<AiGameReviewResponse | null>(null);
}

describe('GameInsightsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('stays hidden when neither insight exists', () => {
    const fixture = createFixture();

    expect(text(fixture)).not.toContain('Game insights');
  });

  it('uses tabs only when both insights exist', () => {
    const fixture = createFixture();
    const root = fixture.nativeElement as HTMLElement;
    fixture.componentInstance.findings.set([finding()]);
    fixture.componentInstance.review.set(reviewResponse());
    fixture.detectChanges();

    expect(text(fixture)).toContain('Game insights');
    expect(root.querySelectorAll('[role="tab"]').length).toBe(2);
    expect(text(fixture)).toContain('Missed shot');
    expect(text(fixture)).not.toContain('Controlled game');

    const aiTab = root.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1];
    aiTab.click();
    fixture.detectChanges();

    expect(text(fixture)).toContain('Controlled game');
    expect(text(fixture)).not.toContain('Missed shot');
  });

  it('collapses the single available insight', () => {
    const fixture = createFixture();
    const root = fixture.nativeElement as HTMLElement;
    fixture.componentInstance.review.set(reviewResponse());
    fixture.detectChanges();

    expect(text(fixture)).toContain('AI game review');
    expect(root.querySelector('[role="tablist"]')).toBeNull();

    const collapse = Array.from(root.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.trim() === 'Collapse');
    collapse?.click();
    fixture.detectChanges();

    expect(text(fixture)).not.toContain('Controlled game');
    expect(text(fixture)).toContain('Expand');
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

function finding(): GameTacticalFinding {
  return {
    id: 1,
    importedGameId: 7,
    kind: 'MISSED_SHOT',
    triggerPlyNumber: 12,
    userReplyPlyNumber: 13,
    moveUci: 'e4d5',
    bestMoveUci: 'e4e5',
    swingCp: 180,
  };
}

function reviewResponse(): AiGameReviewResponse {
  return {
    kind: 'GAME_REVIEW',
    schemaVersion: 1,
    generatedAt: '2026-07-19T14:00:00.000Z',
    review: {
      headline: 'Controlled game',
      overview: 'A compact overview.',
      openingAssessment: 'The opening was sound.',
      turningPoints: [],
      strengths: [],
      improvements: [],
      practicePriorities: [],
      themes: [],
    },
    warnings: [],
  };
}
