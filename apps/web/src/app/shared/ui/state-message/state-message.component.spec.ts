import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StateMessageComponent } from './state-message.component';

describe('StateMessageComponent', () => {
  let fixture: ComponentFixture<StateMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StateMessageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StateMessageComponent);
    fixture.componentRef.setInput('message', 'State message');
  });

  it('renders an empty state without announcing static content', () => {
    fixture.detectChanges();

    const state = stateElement();
    expect(state.textContent?.trim()).toBe('State message');
    expect(state.classList.contains('state-message-empty')).toBeTrue();
    expect(state.getAttribute('role')).toBeNull();
    expect(state.getAttribute('aria-live')).toBeNull();
    expect(state.getAttribute('aria-busy')).toBeNull();
  });

  it('announces loading state politely without suppressing the live region', () => {
    fixture.componentRef.setInput('tone', 'loading');
    fixture.detectChanges();

    const state = stateElement();
    expect(state.classList.contains('state-message-loading')).toBeTrue();
    expect(state.getAttribute('role')).toBe('status');
    expect(state.getAttribute('aria-live')).toBe('polite');
    expect(state.getAttribute('aria-busy')).toBeNull();
  });

  it('announces errors assertively', () => {
    fixture.componentRef.setInput('tone', 'error');
    fixture.detectChanges();

    const state = stateElement();
    expect(state.classList.contains('state-message-error')).toBeTrue();
    expect(state.getAttribute('role')).toBe('alert');
    expect(state.getAttribute('aria-live')).toBe('assertive');
    expect(state.getAttribute('aria-busy')).toBeNull();
  });

  function stateElement(): HTMLElement {
    return fixture.nativeElement.querySelector('.state-message') as HTMLElement;
  }
});
