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
          { path: 'courses', component: TestRouteComponent },
          { path: 'games', component: TestRouteComponent },
          { path: 'opening-analysis', component: TestRouteComponent },
          { path: 'builder', component: TestRouteComponent },
          { path: 'progress', component: TestRouteComponent },
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

  it('derives the mobile primary destinations from the shared navigation model', () => {
    const items = Array.from(
      fixture.nativeElement.querySelectorAll(
        '.mobile-primary-nav-item',
      ) as NodeListOf<HTMLAnchorElement | HTMLButtonElement>,
    );

    expect(items.map((item) => item.textContent?.trim())).toEqual([
      'Home',
      'Study',
      'Games',
      'Openings',
      'More',
    ]);
    expect(items.slice(0, 4).map((item) => item.getAttribute('href'))).toEqual([
      '/home',
      '/library',
      '/games',
      '/opening-analysis',
    ]);
    expect(items[4].getAttribute('aria-controls')).toBe('mobile-main-menu');
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

  it('retains popup-menu flyouts when the desktop rail is collapsed', () => {
    const railToggle = fixture.nativeElement.querySelector(
      '.rail-collapse-button',
    ) as HTMLButtonElement;

    railToggle.click();
    fixture.detectChanges();

    const disclosure = fixture.nativeElement.querySelector(
      '[aria-label="Show Study submenu"]',
    ) as HTMLButtonElement;
    expect(disclosure.getAttribute('aria-haspopup')).toBe('menu');

    disclosure.click();
    fixture.detectChanges();

    const flyoutLinks = Array.from(
      fixture.nativeElement.querySelectorAll(
        '.rail-flyout-item[role="menuitem"]',
      ) as NodeListOf<HTMLAnchorElement>,
    );
    const puzzlesLink = flyoutLinks.find((link) => link.getAttribute('href') === '/puzzles');

    expect(fixture.nativeElement.querySelector('.rail-inline-accordion')).toBeNull();
    expect(fixture.nativeElement.querySelector('.rail-flyout[role="menu"]')).not.toBeNull();
    expect(flyoutLinks.length).toBe(4);
    expect(puzzlesLink?.textContent).toContain('Lichess puzzles');
    expect(fixture.nativeElement.querySelector('.rail-flyout-backdrop')).not.toBeNull();
  });

  it('closes open child navigation on Escape', () => {
    const disclosure = fixture.nativeElement.querySelector(
      '[aria-label="Show Study submenu"]',
    ) as HTMLButtonElement;

    disclosure.click();
    fixture.detectChanges();
    expect(disclosure.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('.rail-inline-accordion-open')).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(disclosure.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('.rail-inline-accordion-open')).toBeNull();
  });

  it('updates active state and closes inline child navigation after route navigation', async () => {
    const disclosure = fixture.nativeElement.querySelector(
      '[aria-label="Show Study submenu"]',
    ) as HTMLButtonElement;

    disclosure.click();
    fixture.detectChanges();
    expect(disclosure.getAttribute('aria-expanded')).toBe('true');

    await router.navigateByUrl('/games');
    fixture.detectChanges();

    expect(disclosure.getAttribute('aria-expanded')).toBe('false');
    const activeLink = fixture.nativeElement.querySelector(
      '.rail-nav-node-active .rail-nav-link',
    ) as HTMLAnchorElement;
    expect(activeLink.textContent).toContain('Games');
    expect(activeLink.getAttribute('aria-current')).toBe('page');
  });

  it('opens the complete destination dialog from More and closes it after route navigation', async () => {
    const moreButton = fixture.nativeElement.querySelector(
      '.mobile-more-button',
    ) as HTMLButtonElement;
    const dialog = fixture.nativeElement.querySelector(
      '#mobile-main-menu',
    ) as HTMLDialogElement;

    moreButton.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(dialog.open).toBeTrue();
    expect(moreButton.getAttribute('aria-expanded')).toBe('true');
    expect(dialog.querySelectorAll('.mobile-nav-item').length).toBeGreaterThan(9);
    expect(dialog.querySelector('[href="/settings/accounts"]')).not.toBeNull();

    await router.navigateByUrl('/games');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(dialog.open).toBeFalse();
    expect(moreButton.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes the complete destination dialog from the backdrop', async () => {
    const moreButton = fixture.nativeElement.querySelector(
      '.mobile-more-button',
    ) as HTMLButtonElement;
    const dialog = fixture.nativeElement.querySelector(
      '#mobile-main-menu',
    ) as HTMLDialogElement;

    moreButton.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(dialog.open).toBeTrue();

    dialog.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(dialog.open).toBeFalse();
    expect(moreButton.getAttribute('aria-expanded')).toBe('false');
  });

  it('delegates secondary-route active state to More', async () => {
    await router.navigateByUrl('/courses');
    fixture.detectChanges();

    const moreButton = fixture.nativeElement.querySelector(
      '.mobile-more-button',
    ) as HTMLButtonElement;
    expect(moreButton.classList).toContain('mobile-primary-nav-item-active');
    expect(moreButton.getAttribute('aria-current')).toBe('page');

    await router.navigateByUrl('/games');
    fixture.detectChanges();

    const gamesLink = fixture.nativeElement.querySelector(
      '.mobile-primary-nav-item[href="/games"]',
    ) as HTMLAnchorElement;
    expect(gamesLink.classList).toContain('mobile-primary-nav-item-active');
    expect(gamesLink.getAttribute('aria-current')).toBe('page');
    expect(moreButton.classList).not.toContain('mobile-primary-nav-item-active');
    expect(moreButton.hasAttribute('aria-current')).toBeFalse();
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
