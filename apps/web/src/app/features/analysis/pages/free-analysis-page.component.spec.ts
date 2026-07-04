import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { LichessBotChallengeStore } from '../../../shared/lichess/bot-challenge/lichess-bot-challenge.store';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { AnalysisReintegrationStore } from '../state/analysis-reintegration.store';
import { FreeAnalysisStore } from '../state/free-analysis.store';
import { FreeAnalysisPageComponent } from './free-analysis-page.component';

describe('FreeAnalysisPageComponent', () => {
  let fixture: ComponentFixture<FreeAnalysisPageComponent>;
  let store: jasmine.SpyObj<FreeAnalysisStore>;
  let reintegrationStore: jasmine.SpyObj<AnalysisReintegrationStore>;
  let challengeStore: jasmine.SpyObj<LichessBotChallengeStore>;
  let confirmDialog: jasmine.SpyObj<ConfirmDialogService>;

  beforeEach(async () => {
    store = jasmine.createSpyObj<FreeAnalysisStore>('FreeAnalysisStore', [
      'deleteConfirmationText',
      'deleteSelectedSubtree',
      'handleKeyboard',
      'initialize',
      'toggleMyGames',
    ]);
    reintegrationStore = jasmine.createSpyObj<AnalysisReintegrationStore>('AnalysisReintegrationStore', ['openForTree']);
    challengeStore = jasmine.createSpyObj<LichessBotChallengeStore>('LichessBotChallengeStore', ['openForFen']);
    confirmDialog = jasmine.createSpyObj<ConfirmDialogService>('ConfirmDialogService', ['confirm']);

    await TestBed.configureTestingModule({
      imports: [FreeAnalysisPageComponent],
      providers: [
        { provide: ConfirmDialogService, useValue: confirmDialog },
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: of(convertToParamMap({})) },
        },
      ],
    })
      .overrideComponent(FreeAnalysisPageComponent, {
        set: {
          template: '',
          providers: [
            { provide: FreeAnalysisStore, useValue: store },
            { provide: AnalysisReintegrationStore, useValue: reintegrationStore },
            { provide: LichessBotChallengeStore, useValue: challengeStore },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(FreeAnalysisPageComponent);
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

  function page(): { confirmDeleteSelectedSubtree(): Promise<void> } {
    return fixture.componentInstance as unknown as { confirmDeleteSelectedSubtree(): Promise<void> };
  }
});
