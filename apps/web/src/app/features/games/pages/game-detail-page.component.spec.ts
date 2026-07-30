import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import type { AiCapabilitiesResponse } from '@chess-trainer/contracts/ai';
import { AiCapabilitiesService } from '../../../core/ai/ai-capabilities.service';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { GameDetailStore } from '../state/game-detail.store';
import { GameAiReviewStore } from '../state/game-ai-review.store';
import { GameTacticalFindingsStore } from '../state/game-tactical-findings.store';
import { GameDetailPageComponent } from './game-detail-page.component';

describe('GameDetailPageComponent', () => {
  let fixture: ComponentFixture<GameDetailPageComponent>;
  let store: jasmine.SpyObj<GameDetailStore>;
  let aiReviewStore: jasmine.SpyObj<GameAiReviewStore>;
  let tacticalFindingsStore: jasmine.SpyObj<GameTacticalFindingsStore>;
  let confirmDialog: jasmine.SpyObj<ConfirmDialogService>;
  let capabilities: BehaviorSubject<AiCapabilitiesResponse>;

  beforeEach(async () => {
    store = jasmine.createSpyObj<GameDetailStore>('GameDetailStore', [
      'deleteConfirmationText',
      'deleteSelectedSubtree',
      'handleKeyboard',
      'initialize',
      'selectNode',
    ]);
    aiReviewStore = jasmine.createSpyObj<GameAiReviewStore>('GameAiReviewStore', ['load', 'reset']);
    tacticalFindingsStore = jasmine.createSpyObj<GameTacticalFindingsStore>(
      'GameTacticalFindingsStore',
      ['load', 'reset'],
    );
    confirmDialog = jasmine.createSpyObj<ConfirmDialogService>('ConfirmDialogService', ['confirm']);
    capabilities = new BehaviorSubject<AiCapabilitiesResponse>({
      widgets: {
        gameReview: false,
        builderCandidateExplanation: false,
        builderCompletionSummary: false,
      },
    });

    await TestBed.configureTestingModule({
      imports: [GameDetailPageComponent],
      providers: [
        { provide: ConfirmDialogService, useValue: confirmDialog },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ gameId: '1' })) },
        },
        {
          provide: AiCapabilitiesService,
          useValue: { getCapabilities: () => capabilities.asObservable() },
        },
      ],
    })
      .overrideComponent(GameDetailPageComponent, {
        set: {
          template: '',
          providers: [
            { provide: GameDetailStore, useValue: store },
            { provide: GameAiReviewStore, useValue: aiReviewStore },
            { provide: GameTacticalFindingsStore, useValue: tacticalFindingsStore },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(GameDetailPageComponent);
  });

  it('does nothing when there is no delete confirmation text', async () => {
    store.deleteConfirmationText.and.returnValue(null);

    await page().confirmDeleteSelectedSubtree();

    expect(confirmDialog.confirm).not.toHaveBeenCalled();
    expect(store.deleteSelectedSubtree).not.toHaveBeenCalled();
  });

  it('confirms before deleting the selected subtree', async () => {
    store.deleteConfirmationText.and.returnValue('Delete this branch?');
    confirmDialog.confirm.and.resolveTo(true);

    await page().confirmDeleteSelectedSubtree();

    expect(confirmDialog.confirm).toHaveBeenCalledWith({
      title: 'Delete branch',
      message: 'Delete this branch?',
      confirmLabel: 'Delete branch',
      tone: 'danger',
    });
    expect(store.deleteSelectedSubtree).toHaveBeenCalled();
  });

  function page(): {
    confirmDeleteSelectedSubtree(): Promise<void>;
  } {
    return fixture.componentInstance as unknown as {
      confirmDeleteSelectedSubtree(): Promise<void>;
    };
  }
});