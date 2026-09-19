import { missingLichessScopeLabels } from './account-settings-view';

describe('account settings view helpers', () => {
  it('reports every missing required Lichess permission in user-facing order', () => {
    const account = {
      scopes: ['puzzle:read'],
    };

    expect(missingLichessScopeLabels(account)).toEqual([
      'bot challenges',
      'submit puzzle results',
    ]);
  });
});
