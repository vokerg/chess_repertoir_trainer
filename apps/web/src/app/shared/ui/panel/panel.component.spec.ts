import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PanelComponent } from './panel.component';

@Component({
  standalone: true,
  imports: [PanelComponent],
  template: '<app-panel><p>Panel content</p></app-panel>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class HeaderlessPanelTestHostComponent {}

describe('PanelComponent', () => {
  let fixture: ComponentFixture<HeaderlessPanelTestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeaderlessPanelTestHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(HeaderlessPanelTestHostComponent);
  });

  it('omits the header when no header content is supplied', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.app-panel-header')).toBeNull();
    expect(fixture.nativeElement.querySelector('.app-panel-body')?.textContent).toContain('Panel content');
  });
});
