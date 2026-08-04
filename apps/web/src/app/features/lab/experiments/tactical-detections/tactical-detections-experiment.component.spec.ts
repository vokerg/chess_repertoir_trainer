import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { defaultGameFilters } from '../../../../shared/games/filters/game-filter.model';
import { emptyImportedGameFacets } from '../../../../shared/games/game.models';
import type {
  TacticalDetectionItem,
  TacticalDetectionRunResponse,
} from './data-access/tactical-detections.models';
import { TacticalDetectionsStore } from './state/tactical-detections.store';
import { TacticalDetectionsExperimentComponent } from './tactical-detections-experiment.component';

describe('TacticalDetectionsExperimentComponent', () => {
  let fixture: ComponentFixture<TacticalDetectionsExperimentComponent>;
  let store: jasmine.SpyObj<TacticalDetectionsStore>;

  const gameFilters = signal(defaultGameFilters());
  const facets = signal(emptyImportedGameFacets());
  const filtersCollapsed = signal(true);
  const force = signal(false);
  const kindFilter = signal<'ALL' | TacticalDetectionItem['kind']>('ALL');
  const limit = signal(100);
  const items = signal<readonly TacticalDetectionItem[]>([]);
  const runSummary = signal<TacticalDetectionRunResponse | null>(null);
  const loading = signal(false);
  const running = signal(false);
  const loaded = signal(false);
  const error = signal<string | null>(null);

  beforeEach(async () => {
    gameFilters.set(defaultGameFilters());
    facets.set(emptyImportedGameFacets());
    filtersCollapsed.set(true);
    force.set(false);
    kindFilter.set('ALL');
    limit.set(100);
    items.set([]);
    runSummary.set(null);
    loading.set(false);
    running.set(false);
    loaded.set(false);
    error.set(null);

    store = jasmine.createSpyObj<TacticalDetectionsStore>(
      'TacticalDetectionsStore',
      [
        'initialize',
        'load',
        'runDetection',
        'toggleFilters',
        'setForce',
        'setKindFilter',
        'setGameFilters',
        'resetGameFilters',
      ],
      {
        gameFilters,
        facets,
        filtersCollapsed,
        force,
        kindFilter,
        limit,
        items,
        runSummary,
        loading,
        running,
        loaded,
        error,
        missedShots: computed(
          () => items().filter((item) => item.kind === 'MISSED_SHOT').length,
        ),
        punishedOpponentBlunders: computed(
          () =>
            items().filter((item) => item.kind === 'PUNISHED_OPPONENT_BLUNDER').length,
        ),
        userBlunders: computed(
          () => items().filter((item) => item.kind === 'USER_BLUNDER').length,
        ),
        filterSummary: computed(() => 'All games'),
      },
    );
    store.initialize.and.returnValue(Promise.resolve());
    store.load.and.returnValue(Promise.resolve());
    store.runDetection.and.returnValue(Promise.resolve());
    store.toggleFilters.and.callFake(() => filtersCollapsed.update((value) => !value));
    store.setForce.and.callFake((value) => force.set(value));
    store.setKindFilter.and.callFake((value) => kindFilter.set(value));

    await TestBed.configureTestingModule({
      imports: [TacticalDetectionsExperimentComponent],
      providers: [provideRouter([])],
    })
      .overrideComponent(TacticalDetectionsExperimentComponent, {
        set: {
          providers: [{ provide: TacticalDetectionsStore, useValue: store }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(TacticalDetectionsExperimentComponent);
    fixture.detectChanges();
  });

  it('initializes once and keeps result queries and detection runs in their owning surfaces', () => {
    expect(store.initialize).toHaveBeenCalledTimes(1);

    applyButton().click();
    actionButton('Run detection').click();

    expect(store.load).toHaveBeenCalledTimes(1);
    expect(store.runDetection).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('.detection-options').textContent).toContain(
      'Only the selected date range scopes a new detection run',
    );
  });

  it('keeps mutable controls and commands synchronized with active work', () => {
    loading.set(true);
    fixture.detectChanges();

    expect(applyButton().disabled).toBeTrue();
    expect(applyButton().textContent?.trim()).toBe('Loading…');
    expect(actionButton('Run detection').disabled).toBeTrue();
    expect(selectTrigger().disabled).toBeTrue();
    expect(limitInput().disabled).toBeTrue();
    expect(forceInput().disabled).toBeTrue();

    loading.set(false);
    running.set(true);
    fixture.detectChanges();

    expect(applyButton().disabled).toBeTrue();
    expect(applyButton().textContent?.trim()).toBe('Apply result filters');
    expect(actionButton('Running…').disabled).toBeTrue();
    expect(selectTrigger().disabled).toBeTrue();
    expect(limitInput().disabled).toBeTrue();
    expect(forceInput().disabled).toBeTrue();
  });

  it('uses the shared select menu and preserves the finding filter command', () => {
    selectTrigger().click();
    fixture.detectChanges();

    const option = Array.from(
      fixture.nativeElement.querySelectorAll('.select-menu-option') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('My blunders'));

    expect(option).toBeDefined();
    option?.click();

    expect(store.setKindFilter).toHaveBeenCalledOnceWith('USER_BLUNDER');
  });

  it('shows the exact detection range and constrains row limits to the API contract', () => {
    gameFilters.set({
      ...gameFilters(),
      from: '2026-01-02',
      to: '2026-03-04',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.run-scope').textContent).toContain(
      '2026-01-02 to 2026-03-04',
    );

    const input = limitInput();
    input.value = '900';
    input.dispatchEvent(new Event('change'));
    expect(limit()).toBe(500);
    expect(input.value).toBe('500');

    input.value = '0';
    input.dispatchEvent(new Event('change'));
    expect(limit()).toBe(1);
    expect(input.value).toBe('1');
  });

  it('keeps force recheck and finding-game disclosure wired to store state', () => {
    forceInput().click();

    const disclosure = fixture.nativeElement.querySelector(
      '.filter-disclosure',
    ) as HTMLButtonElement;
    disclosure.click();
    fixture.detectChanges();

    expect(store.setForce).toHaveBeenCalledOnceWith(true);
    expect(store.toggleFilters).toHaveBeenCalledTimes(1);
    expect(disclosure.textContent).toContain('Finding game filters');
    expect(disclosure.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('app-game-filter-panel')).not.toBeNull();
  });

  it('renders semantic finding states, split evaluations, row headers, and trainable actions', () => {
    items.set([
      finding({ id: 1, kind: 'MISSED_SHOT', opponentUsername: 'alpha' }),
      finding({ id: 2, kind: 'PUNISHED_OPPONENT_BLUNDER', opponentUsername: 'beta' }),
      finding({ id: 3, kind: 'USER_BLUNDER', opponentUsername: 'gamma' }),
    ]);
    loaded.set(true);
    fixture.detectChanges();

    const bodyRows = fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLTableRowElement>;
    expect(bodyRows.length).toBe(3);
    expect(fixture.nativeElement.querySelectorAll('tbody th[scope="row"]').length).toBe(3);
    expect(fixture.nativeElement.querySelectorAll('.kind-pill--missed').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.kind-pill--punished').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.kind-pill--blunder').length).toBe(1);

    const trainLinks = Array.from(
      fixture.nativeElement.querySelectorAll('.row-actions a') as NodeListOf<HTMLAnchorElement>,
    ).filter((link) => link.textContent?.trim() === 'Train this');
    expect(trainLinks.length).toBe(2);

    const headers = Array.from(
      fixture.nativeElement.querySelectorAll('thead th') as NodeListOf<HTMLTableCellElement>,
    );
    expect(headers.map((header) => header.textContent?.trim())).toContain('Before');
    expect(headers.map((header) => header.textContent?.trim())).toContain('After move');
    expect(headers.map((header) => header.textContent?.trim())).toContain('After reply');
    expect(
      headers.find((header) => header.textContent?.trim() === 'After move')?.getAttribute('aria-label'),
    ).toBe('Evaluation after the tactical move');
  });

  it('renders explicit error, completed-run, and empty-result states', () => {
    error.set('Could not load tactical detections.');
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.textContent).toContain('Could not load tactical detections.');

    error.set(null);
    loaded.set(true);
    runSummary.set({
      runId: 7,
      scannedGames: 14,
      skippedAlreadyProcessedGames: 3,
      processedGames: 11,
      detectionsInserted: 4,
      missedShots: 2,
      punishedOpponentBlunders: 1,
      userBlunders: 1,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.lab-state--success').textContent).toContain(
      'Detection run 7 complete',
    );
    expect(fixture.nativeElement.querySelector('.lab-empty').textContent).toContain(
      'No tactical findings match this view',
    );
  });

  function applyButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.apply-action') as HTMLButtonElement;
  }

  function selectTrigger(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.select-menu-trigger') as HTMLButtonElement;
  }

  function limitInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('#tactical-result-limit') as HTMLInputElement;
  }

  function forceInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('.force-control input') as HTMLInputElement;
  }

  function actionButton(label: string): HTMLButtonElement {
    const button = Array.from(
      fixture.nativeElement.querySelectorAll('button.ui-shell-action') as NodeListOf<HTMLButtonElement>,
    ).find((candidate) => candidate.textContent?.trim() === label);

    if (!button) throw new Error(`Could not find panel action: ${label}`);
    return button;
  }

  function finding(overrides: Partial<TacticalDetectionItem>): TacticalDetectionItem {
    return {
      id: 1,
      kind: 'MISSED_SHOT',
      importedGameId: 42,
      triggerPlyNumber: 17,
      userReplyPlyNumber: 18,
      moveUci: 'e4d5',
      bestMoveUci: 'e4e8',
      evalBeforeUserCp: 120,
      evalAfterTriggerUserCp: -80,
      evalAfterReplyUserCp: -140,
      swingCp: 200,
      opponentUsername: 'opponent',
      userColor: 'WHITE',
      resultForUser: 'LOSS',
      openingName: 'Example opening',
      openingEco: 'A00',
      endedAt: '2026-08-03T12:00:00.000Z',
      providerUrl: null,
      ...overrides,
    };
  }
});
