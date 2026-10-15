import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { GameLibrary } from '@chess-trainer/contracts/imported-games';
import { GameCollectionActionsComponent } from './game-collection-actions.component';

const LIBRARIES: readonly GameLibrary[] = [
  { id: 11, name: 'Endgames', gameCount: 2 },
  { id: 12, name: 'Openings', gameCount: 3 },
];

@Component({
  standalone: true,
  imports: [GameCollectionActionsComponent],
  template: `
    <app-game-collection-actions
      [game]="game()"
      [libraries]="libraries()"
      [busy]="busy()"
      (like)="likeRequests.push(true)"
      (membership)="membershipRequests.push($event)"
    />
  `,
})
class TestHostComponent {
  readonly game = signal<{ liked?: boolean; libraryIds?: readonly number[] }>({
    liked: false,
    libraryIds: [12],
  });
  readonly libraries = signal<readonly GameLibrary[]>(LIBRARIES);
  readonly busy = signal(false);
  readonly likeRequests: boolean[] = [];
  readonly membershipRequests: number[] = [];
}

describe('GameCollectionActionsComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('emits a like request and reflects the server-owned liked state', () => {
    const fixture = createFixture();
    const heart = element(fixture).querySelector<HTMLButtonElement>('button.heart')!;

    expect(heart.getAttribute('aria-label')).toBe('Like game');
    expect(heart.getAttribute('aria-pressed')).toBe('false');
    heart.click();
    expect(fixture.componentInstance.likeRequests).toEqual([true]);
    expect(heart.getAttribute('aria-pressed')).toBe('false', 'the child must not change game state itself');

    fixture.componentInstance.game.set({ liked: true, libraryIds: [12] });
    fixture.detectChanges();
    expect(heart.getAttribute('aria-label')).toBe('Unlike game');
    expect(heart.getAttribute('aria-pressed')).toBe('true');
    expect(heart.classList.contains('liked')).toBeTrue();
  });

  it('marks saved libraries and emits only the selected membership id', () => {
    const fixture = createFixture();
    const buttons = element(fixture).querySelectorAll<HTMLButtonElement>('.collection-options button');

    expect(buttons.length).toBe(2);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    buttons[0].click();
    buttons[1].click();
    expect(fixture.componentInstance.membershipRequests).toEqual([11, 12]);

    fixture.componentInstance.game.set({ liked: false, libraryIds: [11] });
    fixture.detectChanges();
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('false');
  });

  it('disables all mutation controls during a request', () => {
    const fixture = createFixture();
    fixture.componentInstance.busy.set(true);
    fixture.detectChanges();

    const buttons = element(fixture).querySelectorAll<HTMLButtonElement>('button');
    expect(buttons.length).toBe(3);
    expect(Array.from(buttons).every((button) => button.disabled)).toBeTrue();
    buttons.forEach((button) => button.click());
    expect(fixture.componentInstance.likeRequests).toEqual([]);
    expect(fixture.componentInstance.membershipRequests).toEqual([]);
  });

  it('shows an empty-library hint and a route to manage libraries', () => {
    const fixture = createFixture();
    fixture.componentInstance.libraries.set([]);
    fixture.detectChanges();

    const root = element(fixture);
    expect(root.textContent).toContain('Create a library to organize your games.');
    expect(root.querySelectorAll('.collection-options button').length).toBe(0);
    expect(root.querySelector<HTMLAnchorElement>('a')?.getAttribute('href')).toBe('/games/libraries');
  });

  function createFixture(): ComponentFixture<TestHostComponent> {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    return fixture;
  }

  function element(fixture: ComponentFixture<TestHostComponent>): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }
});
