import { routes } from './app.routes';
import { authGuard } from './core/auth/auth.guard';

describe('application routes', () => {
  it('keeps Progress reports as separate authenticated routes and preserves the Lab redirect', () => {
    const progress = routes.find((route) => route.path === 'progress');
    const profile = routes.find((route) => route.path === 'progress/profile');
    const performance = routes.find(
      (route) => route.path === 'progress/performance-by-rating',
    );
    const account = routes.find((route) => route.path === 'progress/accounts/:accountId');
    const legacyPerformance = routes.find(
      (route) => route.path === 'lab/performance-by-rating',
    );

    expect(progress?.loadComponent).toBeDefined();
    expect(profile?.loadComponent).toBeDefined();
    expect(profile?.title).toBe('Chess profile | Chess Repertoire Trainer');
    expect(performance?.title).toBe('Performance by rating | Chess Repertoire Trainer');
    expect(performance?.loadComponent).toBeDefined();
    expect(performance?.canActivate).toEqual([authGuard]);
    expect(account?.loadComponent).toBeDefined();
    expect(legacyPerformance?.redirectTo).toBe('/progress/performance-by-rating');
    expect(legacyPerformance?.pathMatch).toBe('full');
  });

  it('keeps onboarding as a lazy authenticated route without trapping other protected routes', () => {
    const onboarding = routes.find((route) => route.path === 'onboarding');
    const home = routes.find((route) => route.path === 'home');
    const games = routes.find((route) => route.path === 'games');

    expect(onboarding?.title).toBe('Get started | Chess Repertoire Trainer');
    expect(onboarding?.loadComponent).toBeDefined();
    expect(onboarding?.canActivate).toEqual([authGuard]);
    expect(home?.canActivate).toEqual([authGuard]);
    expect(games?.canActivate).toEqual([authGuard]);
  });

  it('keeps administrator diagnostics lazy and uses only the normal sign-in guard', () => {
    const admin = routes.find((route) => route.path === 'admin');

    expect(admin?.title).toBe('Administrator diagnostics | Chess Repertoire Trainer');
    expect(admin?.loadComponent).toBeDefined();
    expect(admin?.canActivate).toEqual([authGuard]);
  });
});
