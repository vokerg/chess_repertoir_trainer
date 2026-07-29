import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { MainNavigationComponent } from './main-navigation.component';

@Component({
  standalone: true,
  template: '',
})
class TestRouteComponent {}

describe('MainNavigationComponent', () => {
  let fixture: ComponentFixture<MainNavigationComponent>;
  let router: Router;

  const auth = {
    initialize: jasmine.createSpy('initialize').and.resolveTo(),
    isSignedIn: signal(true),
    isDevAuth: signal(true),
    displayName: signal('Dev user'),
  };

  beforeEach(async () => {
    auth.initialize.calls.reset();

    await TestBed.configureTestingModule({
      imports: [MainNavigationComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        provideRouter([
          { path: 'home', component: TestRouteComponent },
          { path: 'library', component: TestRouteComponent },
          { path: 'puzzles', component: TestRouteComponent },
          { path: 'games', component: TestRouteComponent },
          { path: 'builder', component: TestRouteComponent },
        ]),
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(MainNavigationComponent);
    fixture.detectChanges();
  });

  it('renders every top-level destination from the shared navigation model', () => {
    const labels = Array.from(
      fixture.nativeElement.querySelectorAll('.rail-nav-label') as NodeListOf<HTMLElement>,
    ).map((element) => element.textContent?.trim());

    expect(labels).toEqual([
      'Home',
      'Study',
      'Courses',
      'Games',
      'Openings',
      'Builder',
      'Progress',
      'Tools',
      'Settings',
    ]);
    expect(auth.initialize).toHaveBeenCalled();
  });

  it('collapses and expands the desktop rail without persistence', () => {
    const toggle = fixture.nativeElement.querySelector(
      '.rail-collapse-button',
    ) as HTMLButtonElement;

    toggle.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.desktop-rail').classList).toContain(
      'desktop-rail-collapsed',
    );
    expect(toggle.getAttribute('aria-label')).toBe('Expand navigation rail');
    expect(fixture.nativeElement.querySelector('app-brand-mark')).not.toBeNull();

    toggle.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.desktop-rail').classList).not.toContain(
      'desktop-rail-collapsed',
    );
    expect(toggle.getAttribute('aria-label')).toBe('Collapse navigation rail');
  });

  it('keeps the parent route and exposes child destinations as an expanded-rail disclosure group', () => {
    const studyLink = Array.from(
      fixture.nativeElement.querySelectorAll('.rail-nav-link') as NodeListOf<HTMLAnchorElement>,
    ).find((link) => link.textContent?.includes('Study'));
    const disclosure = fixture.nativeElement.querySelector(
      '[aria-label="Show Study submenu"]',
    ) as HTMLButtonElement;

    expect(studyLink?.getAttribute('href')).toBe('/library');
    expect(disclosure.getAttribute('title')).toBe('Show Study submenu');
    expect(disclosure.hasAttribute('aria-haspopup')).toBeFalse();
    expect(disclosure.querySelector('.rail-nav-disclosure-icon')).not.toBeNull();

    disclosure.click();
    fixture.detectChanges();

    const childGroup = fixture.nativeElement.querySelector(
      '.rail-inline-accordion-open [role="group"]',
    ) as HTMLElement;
    const childLinks = Array.from(
      fixture.nativeElement.querySelectorAll(
        '.rail-inline-accordion-open .rail-inline-item',
      ) as NodeListOf<HTMLAnchorElement>,
    );
    const puzzlesLink = childLinks.find((link) => link.getAttribute('href') === '/puzzles');

    expect(disclosure.getAttribute('aria-expanded')).toBe('true');
    expect(disclosure.getAttribute('aria-label')).toBe('Hide Study submenu');
    expect(disclosure.getAttribute('title')).toBe('Hide Study submenu');
    expect(childLinks.length).toBe(4);
    expect(puzzlesLink?.textContent).toContain('Lichess puzzles');
    expect(childGroup.getAttribute('aria-label')).toBe('Study submenu');
    expect(fixture.nativeElement.querySelector('.rail-flyout')).toBeNull();
    expect(fixture.nativeElement.querySelector('.rail-flyout-backdrop')).toBeNull();
  });

  it('allows only one expanded-rail parent to be open at a time', () => {
    const studyDisclosure = fixture.nativeElement.querySelector(
      '[aria-label="Show Study submenu"]',
    ) as HTMLButtonElement;
    const openingsDisclosure = fixture.nativeElement.querySelector(
      '[aria-label="Show Openings submenu"]',
    ) as HTMLButtonElement;

    studyDisclosure.click();
    fixture.detectChanges();
    expect(studyDisclosure.getAttribute('aria-expanded')).toBe('true');

    openingsDisclosure.click();
    fixture.detectChanges();

    expect(studyDisclosure.getAttribute('aria-expanded')).toBe('false');
    expect(openingsDisclosure.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelectorAll('.rail-inline-accordion-open').length).toBe(1);
  });

  it('uses parent-route activity for direct children and exact child activity for ambiguous parents', async () => {
    await router.navigateByUrl('/library');
    fixture.detectChanges();

    const studyLink = Array.from(
      fixture.nativeElement.querySelectorAll('.rail-nav-link') as NodeListOf<HTMLAnchorElement>,
    ).find((link) => link.textContent?.includes('Study'));
    const studyNode = studyLink?.closest('.rail-nav-node');
    const repertoireLibraryLink = fixture.nativeElement.querySelector(
      '.rail-inline-item[href="/library"]',
    ) as HTMLAnchorElement | null;

    expect(studyNode?.classList).toContain('rail-nav-node-active');
    expect(repertoireLibraryLink?.classList).toContain('rail-inline-item-active');

    await router.navigateByUrl('/builder');
    fixture.detectChanges();

    const builderLink = Array.from(
      fixture.nativeElement.querySelectorAll('.rail-nav-link') as NodeListOf<HTMLAnchorElement>,
    ).find((link) => link.textContent?.includes('Builder'));
    const builderNode = builderLink?.closest('.rail-nav-node');
    expect(builderNode?.classList).toContain('rail-nav-node-active');
  });
});
