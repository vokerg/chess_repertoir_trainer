import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { EMPTY } from 'rxjs';
import { AppComponent } from './app.component';
import { AccountImportSessionStore } from './core/account-imports/account-import-session.store';
import { AuthService } from './core/auth/auth.service';
import { ImportedGameJobStore } from './core/jobs/imported-game-job.store';

describe('AppComponent onboarding shell coexistence', () => {
  const router = {
    url: '/home',
    events: EMPTY,
  };
  const auth = {
    initialized: signal(false),
    isSignedIn: signal(false),
    resolvedAppSession: signal(null),
    initialize: jasmine.createSpy('initialize'),
  };
  const accountImportStore = {
    initialize: jasmine.createSpy('initialize'),
    reset: jasmine.createSpy('reset'),
  };
  const jobStore = {
    visibleRuns: signal<unknown[]>([]),
    initialize: jasmine.createSpy('initialize'),
    reset: jasmine.createSpy('reset'),
  };

  beforeEach(async () => {
    router.url = '/home';
    jobStore.visibleRuns.set([]);
    auth.initialize.calls.reset();
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: auth },
        { provide: AccountImportSessionStore, useValue: accountImportStore },
        { provide: ImportedGameJobStore, useValue: jobStore },
      ],
    })
      .overrideComponent(AppComponent, {
        set: {
          imports: [],
          schemas: [NO_ERRORS_SCHEMA],
        },
      })
      .compileComponents();
  });

  it('keeps Home inside the normal shell with the technical job panel', () => {
    const fixture = createFixture('/home');

    expect(fixture.nativeElement.querySelector('.app-shell')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-imported-game-job-panel')).not.toBeNull();
  });

  it('keeps onboarding inside the same normal shell with the technical job panel', () => {
    const fixture = createFixture('/onboarding');

    expect(fixture.nativeElement.querySelector('.app-shell')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-imported-game-job-panel')).not.toBeNull();
  });

  it('still reserves standalone treatment for authentication entry routes', () => {
    const fixture = createFixture('/login');

    expect(fixture.nativeElement.querySelector('.app-shell')).toBeNull();
    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-imported-game-job-panel')).toBeNull();
  });

  function createFixture(url: string): ComponentFixture<AppComponent> {
    router.url = url;
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    return fixture;
  }
});
