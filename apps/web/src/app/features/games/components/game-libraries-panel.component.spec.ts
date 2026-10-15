import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { GameLibrary } from '@chess-trainer/contracts/imported-games';
import { GameLibrariesPanelComponent } from './game-libraries-panel.component';

const LIBRARIES: readonly GameLibrary[] = [
  { id: 11, name: 'Endgames', gameCount: 2 },
  { id: 12, name: 'Openings', gameCount: 3 },
];

@Component({
  standalone: true,
  imports: [GameLibrariesPanelComponent],
  template: `
    <app-game-libraries-panel
      [libraries]="libraries()"
      [loading]="loading()"
      [busy]="busy()"
      [selectedId]="selectedId()"
      (save)="saves.push($event)"
      (remove)="removals.push($event)"
    />
  `,
})
class TestHostComponent {
  readonly libraries = signal<readonly GameLibrary[]>(LIBRARIES);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly selectedId = signal<number | undefined>(11);
  readonly saves: { name: string; id?: number }[] = [];
  readonly removals: GameLibrary[] = [];
}

describe('GameLibrariesPanelComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('requires a non-blank name and emits the create intent without an id', async () => {
    const fixture = createFixture();
    const root = element(fixture);
    const submit = root.querySelector<HTMLButtonElement>('button[type="submit"]')!;

    expect(submit.disabled).toBeTrue();
    await setName(fixture, '  ');
    expect(submit.disabled).toBeTrue();

    await setName(fixture, '  Endgame drills  ');
    expect(submit.disabled).toBeFalse();
    submit.click();
    expect(fixture.componentInstance.saves).toEqual([{ name: '  Endgame drills  ', id: undefined }]);
  });

  it('supports rename and cancel without emitting an unintended save', async () => {
    const fixture = createFixture();
    const root = element(fixture);

    root.querySelector<HTMLButtonElement>('button[aria-label="Rename Endgames"]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(root.querySelector<HTMLInputElement>('input[name="name"]')!.value).toBe('Endgames');
    expect(root.querySelector<HTMLButtonElement>('button[type="submit"]')!.textContent).toContain('Save name');

    await setName(fixture, 'Rook endings');
    root.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    expect(fixture.componentInstance.saves).toEqual([{ name: 'Rook endings', id: 11 }]);

    root.querySelector<HTMLButtonElement>('button.secondary:not([aria-label])')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(root.querySelector<HTMLInputElement>('input[name="name"]')!.value).toBe('');
    expect(root.querySelector<HTMLButtonElement>('button[type="submit"]')!.textContent).toContain('Create library');
    expect(fixture.componentInstance.saves.length).toBe(1);
  });

  it('emits the selected deletion target and links to its scoped games list', () => {
    const fixture = createFixture();
    const root = element(fixture);

    root.querySelector<HTMLButtonElement>('button[aria-label="Delete Openings"]')!.click();
    expect(fixture.componentInstance.removals).toEqual([LIBRARIES[1]]);

    const links = root.querySelectorAll<HTMLAnchorElement>('ul li a');
    expect(links.length).toBe(2);
    expect(links[0].getAttribute('aria-current')).toBe('page');
    expect(links[1].getAttribute('aria-current')).toBeNull();
    const url = new URL(links[0].href);
    expect(url.pathname).toBe('/games/libraries');
    expect(url.searchParams.get('libraryId')).toBe('11');
    expect(url.searchParams.get('filterMode')).toBe('explicit');
  });

  it('shows loading and empty states and disables mutation controls while busy', async () => {
    const fixture = createFixture();
    const root = element(fixture);

    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Loading libraries');
    expect(root.querySelector('ul')).toBeNull();
    expect(root.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBeTrue();

    fixture.componentInstance.loading.set(false);
    fixture.componentInstance.libraries.set([]);
    fixture.detectChanges();
    expect(root.textContent).toContain('Create your first library');
    expect(root.querySelectorAll('ul li button').length).toBe(0);

    fixture.componentInstance.libraries.set(LIBRARIES);
    fixture.componentInstance.busy.set(true);
    fixture.detectChanges();
    expect(root.querySelector<HTMLInputElement>('input[name="name"]')!.disabled).toBeTrue();
    const buttons = root.querySelectorAll<HTMLButtonElement>('button');
    expect(Array.from(buttons).every((button) => button.disabled)).toBeTrue();
    buttons.forEach((button) => button.click());
    expect(fixture.componentInstance.saves).toEqual([]);
    expect(fixture.componentInstance.removals).toEqual([]);
  });

  function createFixture(): ComponentFixture<TestHostComponent> {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    return fixture;
  }

  async function setName(fixture: ComponentFixture<TestHostComponent>, value: string): Promise<void> {
    const input = element(fixture).querySelector<HTMLInputElement>('input[name="name"]')!;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function element(fixture: ComponentFixture<TestHostComponent>): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }
});
