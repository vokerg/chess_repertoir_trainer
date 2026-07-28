import { routes } from './app.routes';

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
});
