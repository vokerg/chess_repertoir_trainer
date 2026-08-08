import { routes } from './app.routes';
import { authGuard } from './core/auth/auth.guard';

describe('application routes', () => {
  it('keeps account Progress and Chess profile as separate authenticated routes', () => {
    const progress = routes.find((route) => route.path === 'progress');
    const profile = routes.find((route) => route.path === 'progress/profile');
    const account = routes.find((route) => route.path === 'progress/accounts/:accountId');

    expect(progress?.loadComponent).toBeDefined();
    expect(profile?.loadComponent).toBeDefined();
    expect(profile?.title).toBe('Chess profile | Chess Repertoire Trainer');
    expect(account?.loadComponent).toBeDefined();
  });

  it('keeps administrator diagnostics lazy and uses only the normal sign-in guard', () => {
    const admin = routes.find((route) => route.path === 'admin');

    expect(admin?.title).toBe('Administrator diagnostics | Chess Repertoire Trainer');
    expect(admin?.loadComponent).toBeDefined();
    expect(admin?.canActivate).toEqual([authGuard]);
  });
});
