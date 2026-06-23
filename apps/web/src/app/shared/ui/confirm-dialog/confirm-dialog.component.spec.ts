import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { ConfirmDialogService } from './confirm-dialog.service';

describe('ConfirmDialogService', () => {
  let service: ConfirmDialogService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConfirmDialogService);
  });

  it('resolves true on confirm and clears the active request', async () => {
    const result = service.confirm({ title: 'Delete?', message: 'Really?' });

    service.confirmActive();

    await expectAsync(result).toBeResolvedTo(true);
    expect(service.activeRequest()).toBeNull();
  });

  it('resolves false on cancel and clears the active request', async () => {
    const result = service.confirm({ title: 'Delete?', message: 'Really?' });

    service.cancelActive();

    await expectAsync(result).toBeResolvedTo(false);
    expect(service.activeRequest()).toBeNull();
  });

  it('resolves a superseded dialog as false', async () => {
    const first = service.confirm({ title: 'First?', message: 'First message.' });
    const second = service.confirm({ title: 'Second?', message: 'Second message.' });

    service.confirmActive();

    await expectAsync(first).toBeResolvedTo(false);
    await expectAsync(second).toBeResolvedTo(true);
  });
});

describe('ConfirmDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let service: ConfirmDialogService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
    }).compileComponents();

    service = TestBed.inject(ConfirmDialogService);
    fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    service.cancelActive();
  });

  it('renders title, message, and details', async () => {
    await openDialog({
      title: 'Delete course?',
      message: 'This cannot be undone.',
      details: ['Chapters will be deleted.', 'Lines will be deleted.'],
    });

    expect(textContent()).toContain('Delete course?');
    expect(textContent()).toContain('This cannot be undone.');
    expect(textContent()).toContain('Chapters will be deleted.');
    expect(textContent()).toContain('Lines will be deleted.');
  });

  it('renders tone classes', async () => {
    await openDialog({ title: 'Careful?', message: 'Warning.', tone: 'warning' });
    expect(dialogElement().classList).toContain('confirm-dialog-warning');

    service.cancelActive();
    fixture.detectChanges();
    await settle();

    await openDialog({ title: 'Delete?', message: 'Danger.', tone: 'danger' });
    expect(dialogElement().classList).toContain('confirm-dialog-danger');
  });

  it('cancel button cancels', async () => {
    const { result } = await openDialog({ title: 'Delete?', message: 'Really?' });

    clickButton('Cancel');

    await expectAsync(result).toBeResolvedTo(false);
  });

  it('confirm button confirms', async () => {
    const { result } = await openDialog({
      title: 'Delete?',
      message: 'Really?',
      confirmLabel: 'Delete',
    });

    clickButton('Delete');

    await expectAsync(result).toBeResolvedTo(true);
  });

  it('requires exact typed confirmation when configured', async () => {
    await openDialog({
      title: 'Delete course?',
      message: 'Really?',
      confirmLabel: 'Delete course',
      requireTypedConfirmation: 'Italian Game',
    });

    const confirmButton = button('Delete course');
    expect(confirmButton.disabled).toBeTrue();

    inputElement().value = 'Italian';
    inputElement().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(confirmButton.disabled).toBeTrue();

    inputElement().value = 'Italian Game';
    inputElement().dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(confirmButton.disabled).toBeFalse();
  });

  it('Escape cancels', async () => {
    const { result } = await openDialog({ title: 'Delete?', message: 'Really?' });

    dialogElement().dispatchEvent(new Event('cancel', { cancelable: true }));
    fixture.detectChanges();

    await expectAsync(result).toBeResolvedTo(false);
  });

  it('backdrop click cancels', async () => {
    const { result } = await openDialog({ title: 'Delete?', message: 'Really?' });
    const dialog = dialogElement();

    dialog.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    fixture.detectChanges();

    await expectAsync(result).toBeResolvedTo(false);
  });

  it('moves focus into the dialog and returns focus after close', async () => {
    const opener = document.createElement('input');
    document.body.appendChild(opener);
    opener.focus();
    const canAssertFocusReturn = document.activeElement === opener;

    const { result } = await openDialog({ title: 'Delete?', message: 'Really?' });
    await settle();

    expect(dialogElement().contains(document.activeElement)).toBeTrue();

    clickButton('Cancel');
    await result;
    await settle();
    await waitForTimer();
    fixture.detectChanges();

    if (canAssertFocusReturn) {
      expect(document.activeElement).toBe(opener);
    }
    opener.remove();
  });

  async function openDialog(request: Parameters<ConfirmDialogService['confirm']>[0]): Promise<{ result: Promise<boolean> }> {
    const result = service.confirm(request);
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
    return { result };
  }

  function dialogElement(): HTMLDialogElement {
    return fixture.debugElement.query(By.css('dialog')).nativeElement as HTMLDialogElement;
  }

  function textContent(): string {
    return fixture.nativeElement.textContent;
  }

  function button(label: string): HTMLButtonElement {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const found = buttons.find((item) => item.textContent?.trim() === label);
    if (!found) throw new Error(`Button not found: ${label}`);
    return found;
  }

  function clickButton(label: string): void {
    button(label).click();
    fixture.detectChanges();
  }

  function inputElement(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input') as HTMLInputElement;
  }

  async function settle(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
  }

  async function waitForTimer(): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve));
  }
});
