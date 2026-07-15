import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProgressiveListComponent } from './progressive-list.component';

@Component({
  standalone: true,
  imports: [ProgressiveListComponent],
  template: `
    <app-progressive-list
      [items]="items()"
      [itemTemplate]="itemRow"
      [initialCount]="2"
      [resetKey]="resetKey()"
    />
    <ng-template #itemRow let-item><span class="test-row">{{ item }}</span></ng-template>
  `,
})
class ProgressiveListTestHostComponent {
  readonly items = signal(['one', 'two', 'three', 'four']);
  readonly resetKey = signal('first');
}

describe('ProgressiveListComponent', () => {
  let fixture: ComponentFixture<ProgressiveListTestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgressiveListTestHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ProgressiveListTestHostComponent);
    fixture.detectChanges();
  });

  it('reveals hidden rows and collapses when the list context changes', () => {
    expect(fixture.nativeElement.querySelectorAll('.test-row').length).toBe(2);

    const toggle = fixture.nativeElement.querySelector('.progressive-list-toggle') as HTMLButtonElement;
    expect(toggle.textContent).toContain('Show 2 more');
    toggle.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.test-row').length).toBe(4);

    fixture.componentInstance.resetKey.set('second');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.test-row').length).toBe(2);
  });
});
