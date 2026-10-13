import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { WidgetMenuComponent } from './widget-menu.component';

describe('WidgetMenuComponent', () => {
  it('keeps the disclosure open while changing widgets and reflects controlled checkbox state', async () => {
    await TestBed.configureTestingModule({ imports: [WidgetMenuComponent] }).compileComponents();
    const fixture = TestBed.createComponent(WidgetMenuComponent);
    const visible = signal(true);
    const update = () =>
      fixture.componentRef.setInput('widgets', [
        {
          id: 'engine',
          label: 'Engine',
          pressed: visible(),
          run: () => visible.update((value) => !value),
        },
      ]);
    update();
    fixture.detectChanges();
    const details = fixture.nativeElement.querySelector('details') as HTMLDetailsElement;
    details.open = true;
    const checkbox = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    checkbox.click();
    update();
    fixture.detectChanges();
    expect(visible()).toBeFalse();
    expect(checkbox.checked).toBeFalse();
    expect(details.open).toBeTrue();
    expect(checkbox.labels?.[0].textContent).toContain('Engine');
  });

  it('dismisses on Escape and outside click, returning Escape focus to the trigger', async () => {
    await TestBed.configureTestingModule({ imports: [WidgetMenuComponent] }).compileComponents();
    const fixture = TestBed.createComponent(WidgetMenuComponent);
    fixture.detectChanges();
    const details = fixture.nativeElement.querySelector('details') as HTMLDetailsElement;
    const summary = fixture.nativeElement.querySelector('summary') as HTMLElement;
    details.open = true;
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    spyOn(escape, 'stopPropagation').and.callThrough();
    summary.dispatchEvent(escape);
    expect(details.open).toBeFalse();
    expect(document.activeElement).toBe(summary);
    expect(escape.stopPropagation).toHaveBeenCalled();
    details.open = true;
    document.body.click();
    expect(details.open).toBeFalse();
  });
});
