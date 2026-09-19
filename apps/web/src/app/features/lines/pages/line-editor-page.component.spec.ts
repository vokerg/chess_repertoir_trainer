import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { LineEditorStore } from '../state/line-editor.store';
import { LineEditorPageComponent } from './line-editor-page.component';

describe('LineEditorPageComponent', () => {
  let fixture: ComponentFixture<LineEditorPageComponent>;
  let store: jasmine.SpyObj<LineEditorStore>;
  let confirmDialog: jasmine.SpyObj<ConfirmDialogService>;

  beforeEach(async () => {
    store = jasmine.createSpyObj<LineEditorStore>('LineEditorStore', [
      'deleteConfirmationText',
      'deleteSelectedSubtree',
      'handleKeyboard',
      'initialize',
    ]);
    confirmDialog = jasmine.createSpyObj<ConfirmDialogService>('ConfirmDialogService', ['confirm']);

    await TestBed.configureTestingModule({
      imports: [LineEditorPageComponent],
      providers: [
        { provide: ConfirmDialogService, useValue: confirmDialog },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ lineId: '1' })),
            queryParamMap: of(convertToParamMap({})),
          },
        },
      ],
    })
      .overrideComponent(LineEditorPageComponent, {
        set: {
          template: '',
          providers: [{ provide: LineEditorStore, useValue: store }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(LineEditorPageComponent);
  });

  it('does nothing when there is no delete confirmation text', async () => {
    store.deleteConfirmationText.and.returnValue(null);

    await page().confirmDeleteSelectedSubtree();

    expect(confirmDialog.confirm).not.toHaveBeenCalled();
    expect(store.deleteSelectedSubtree).not.toHaveBeenCalled();
  });

  it('confirms before deleting the selected subtree', async () => {
    store.deleteConfirmationText.and.returnValue('Delete e4 and 2 following move(s)?');
    confirmDialog.confirm.and.resolveTo(true);

    await page().confirmDeleteSelectedSubtree();

    expect(confirmDialog.confirm).toHaveBeenCalled();
    expect(store.deleteSelectedSubtree).toHaveBeenCalled();
  });

  function page(): { confirmDeleteSelectedSubtree(): Promise<void> } {
    return fixture.componentInstance as unknown as { confirmDeleteSelectedSubtree(): Promise<void> };
  }
});
