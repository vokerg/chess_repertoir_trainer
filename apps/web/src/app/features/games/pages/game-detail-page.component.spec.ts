import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { AiCapabilitiesService } from '../../../core/ai/ai-capabilities.service';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { GameDetailStore } from '../state/game-detail.store';
import { GameAiReviewStore } from '../state/game-ai-review.store';
import { GameDetailPageComponent } from './game-detail-page.component';

describe('GameDetailPageComponent', () => {
  let fixture: ComponentFixture<GameDetailPageComponent>;
  let store: jasmine.SpyObj<GameDetailStore>;
  let aiReviewStore: jasmine.SpyObj<GameAiReviewStore>;
  let confirmDialog: jasmine.SpyObj<ConfirmDialogService>;

  beforeEach(async () => {
    store = jasmine.createSpyObj<GameDetailStore>('GameDetailStore', [
      'deleteConfirmationText',
      'deleteSelectedSubtree',
      'handleKeyboard',
      'initialize',
      'selectNode',
    ]);
    aiReviewStore = jasmine.createSpyObj<GameAiReviewStore>('GameAiReviewStore', ['reset']);
    confirmDialog = jasmine.createSpyObj<ConfirmDialogService>('ConfirmDialogService', ['confirm']);

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
          useValue: { getCapabilities: () => of({ widgets: { gameReview: false } }) },
        },
      ],
    })
      .overrideComponent(GameDetailPageComponent, {
        set: {
          template: '',
          providers: [
            { provide: GameDetailStore, useValue: store },
            { provide: GameAiReviewStore, useValue: aiReviewStore },
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

  it('delegates an AI turning point to the existing game tree selection', () => {
    page().selectAiReviewMove(37);

    expect(store.selectNode).toHaveBeenCalledOnceWith(37);
  });

  function page(): {
    confirmDeleteSelectedSubtree(): Promise<void>;
    selectAiReviewMove(plyNumber: number): void;
  } {
    return fixture.componentInstance as unknown as {
      confirmDeleteSelectedSubtree(): Promise<void>;
      selectAiReviewMove(plyNumber: number): void;
    };
  }
});
