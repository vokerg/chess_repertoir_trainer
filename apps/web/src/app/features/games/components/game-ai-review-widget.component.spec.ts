import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { AiGameReviewResponse } from '@chess-trainer/contracts/ai';
import { of, throwError } from 'rxjs';
import { AiCapabilitiesService } from '../../../core/ai/ai-capabilities.service';
import { GameAiReviewApiService } from '../data-access/game-ai-review-api.service';
import { GameAiReviewWidgetComponent } from './game-ai-review-widget.component';

@Component({
  standalone: true,
  imports: [GameAiReviewWidgetComponent],
  template: `
    <app-game-ai-review-widget
      [gameId]="gameId()"
      [analysisReady]="analysisReady()"
    />
  `,
})
class TestHostComponent {
  readonly gameId = signal(7);
  readonly analysisReady = signal(true);
}

describe('GameAiReviewWidgetComponent', () => {
  let capabilities: jasmine.SpyObj<AiCapabilitiesService>;
  let api: jasmine.SpyObj<GameAiReviewApiService>;

  beforeEach(async () => {
    capabilities = jasmine.createSpyObj<AiCapabilitiesService>('AiCapabilitiesService', ['getCapabilities']);
    api = jasmine.createSpyObj<GameAiReviewApiService>('GameAiReviewApiService', ['generate']);
    capabilities.getCapabilities.and.returnValue(of({ widgets: { gameReview: true } }));
    api.generate.and.returnValue(of(reviewResponse()));

    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        { provide: AiCapabilitiesService, useValue: capabilities },
        { provide: GameAiReviewApiService, useValue: api },
      ],
    }).compileComponents();
  });

  it('hides the widget when the capability is unavailable', async () => {
    capabilities.getCapabilities.and.returnValue(of({ widgets: { gameReview: false } }));
    const fixture = createFixture();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(text(fixture)).not.toContain('AI game review');
    expect(api.generate).not.toHaveBeenCalled();
  });

  it('does not generate a review on render', async () => {
    const fixture = createFixture();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(text(fixture)).toContain('Generate a concise coaching overview');
    expect(api.generate).not.toHaveBeenCalled();
  });

  it('disables generation until saved analysis is ready', async () => {
    const fixture = createFixture();
    fixture.componentInstance.analysisReady.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(text(fixture)).toContain('Complete the saved game analysis');
    expect(actionButton(fixture).disabled).toBeTrue();
    expect(api.generate).not.toHaveBeenCalled();
  });

  it('generates and renders the typed review on demand', async () => {
    const fixture = createFixture();
    await fixture.whenStable();
    fixture.detectChanges();

    actionButton(fixture).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.generate).toHaveBeenCalledOnceWith(7);
    expect(text(fixture)).toContain('A controlled game with one key improvement');
    expect(text(fixture)).toContain('Engine preference: Bc4');
    expect(actionButton(fixture).textContent).toContain('Regenerate');
  });

  it('shows a generation error and supports regeneration', async () => {
    api.generate.and.returnValues(
      throwError(() => ({ error: { error: 'Provider temporarily unavailable.' } })),
      of(reviewResponse()),
    );
    const fixture = createFixture();
    await fixture.whenStable();
    fixture.detectChanges();

    actionButton(fixture).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(text(fixture)).toContain('Provider temporarily unavailable.');

    actionButton(fixture).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.generate).toHaveBeenCalledTimes(2);
    expect(text(fixture)).toContain('A controlled game with one key improvement');
  });

  function createFixture(): ComponentFixture<TestHostComponent> {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    return fixture;
  }

  function text(fixture: ComponentFixture<TestHostComponent>): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function actionButton(fixture: ComponentFixture<TestHostComponent>): HTMLButtonElement {
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.ui-shell-action');
    if (!button) throw new Error('Missing AI review action button');
    return button;
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
