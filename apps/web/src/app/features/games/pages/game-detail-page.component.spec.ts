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
    capabilities = new BehaviorSubject<AiCapabilitiesResponse>({ widgets: { gameReview: false } });

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
    store.deleteConfirmationText.and.returnValue('Delete local variation?');
    confirmDialog.confirm.and.resolveTo(true);

    await page().confirmDeleteSelectedSubtree();

    expect(confirmDialog.confirm).toHaveBeenCalled();
    expect(store.deleteSelectedSubtree).toHaveBeenCalled();
  });

  it('delegates an insight move to the existing game tree selection', () => {
    page().selectFindingMove(37);

    expect(store.selectNode).toHaveBeenCalledOnceWith(37);
  });

  it('loads the saved review once without tracking signals touched inside the request path', () => {
    const incidentalRequestSignal = signal(0);
    aiReviewStore.load.and.callFake(async () => {
      incidentalRequestSignal();
    });
    capabilities.next({ widgets: { gameReview: true } });

    fixture.detectChanges();
    expect(aiReviewStore.load).toHaveBeenCalledOnceWith(1);

    incidentalRequestSignal.set(1);
    fixture.detectChanges();
    expect(aiReviewStore.load).toHaveBeenCalledTimes(1);
  });

  function page(): {
    confirmDeleteSelectedSubtree(): Promise<void>;
    selectFindingMove(plyNumber: number): void;
  } {
    return fixture.componentInstance as unknown as {
      confirmDeleteSelectedSubtree(): Promise<void>;
      selectFindingMove(plyNumber: number): void;
    };
  }
});
