import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/library', pathMatch: 'full' },
  {
    path: 'login',
    title: 'Sign in | Chess Repertoire Trainer',
    loadComponent: () =>
      import('./features/auth/login-page.component').then((m) => m.LoginPageComponent),
  },
  {
    path: 'signup',
    title: 'Create account | Chess Repertoire Trainer',
    loadComponent: () =>
      import('./features/auth/signup-page.component').then((m) => m.SignupPageComponent),
  },
  {
    path: 'library',
    title: 'Study | Chess Repertoire Trainer',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/library/pages/library-browser-page.component').then(
        (m) => m.LibraryBrowserPageComponent,
      ),
  },
  {
    path: 'library/marathon',
    title: 'Selected marathon | Chess Repertoire Trainer',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/lines/pages/training-marathon-page.component').then(
        (m) => m.TrainingMarathonPageComponent,
      ),
  },
  {
    path: 'progress',
    title: 'Progress | Chess Repertoire Trainer',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/accounts/pages/progress-entry-page.component').then(
        (m) => m.ProgressEntryPageComponent,
      ),
  },
  {
    path: 'progress/accounts/:accountId',
    title: 'Account | Chess Repertoire Trainer',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/accounts/pages/account-detail-page.component').then(
        (m) => m.AccountDetailPageComponent,
      ),
  },
  {
    path: 'settings',
    redirectTo: '/settings/accounts',
    pathMatch: 'full',
  },
  {
    path: 'settings/accounts',
    title: 'Import accounts | Chess Repertoire Trainer',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/accounts/pages/accounts-page.component').then(
        (m) => m.AccountsPageComponent,
      ),
  },
  {
    path: 'settings/lichess',
    title: 'Lichess integration | Chess Repertoire Trainer',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/accounts/pages/lichess-settings-page.component').then(
        (m) => m.LichessSettingsPageComponent,
      ),
  },
  {
    path: 'settings/appearance',
    title: 'Appearance | Chess Repertoire Trainer',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/settings/pages/appearance-settings-page.component').then(
        (m) => m.AppearanceSettingsPageComponent,
      ),
  },
  {
    path: 'accounts',
    redirectTo: '/settings/accounts',
    pathMatch: 'full',
  },
  {
    path: 'accounts/:accountId',
    redirectTo: '/progress/accounts/:accountId',
  },
  {
    path: 'games',
    title: 'Games | Chess Repertoire Trainer',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/games/pages/games-explorer-page.component').then(
        (m) => m.GamesExplorerPageComponent,
      ),
  },
  {
    path: 'opening-analysis',
    title: 'Opening analysis | Chess Repertoire Trainer',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/opening-analysis/pages/opening-analysis-page.component').then(
        (m) => m.OpeningAnalysisPageComponent,
      ),
  },
  {
    path: 'opening-struggles',
    title: 'Opening struggles | Chess Repertoire Trainer',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/opening-struggles/pages/opening-struggles-page.component').then(
        (m) => m.OpeningStrugglesPageComponent,
      ),
  },
  {
    path: 'lab/top-opponents',
    title: 'Top opponents | Chess Repertoire Trainer',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/lab/pages/top-opponents-page.component').then(
        (m) => m.TopOpponentsPageComponent,
      ),
  },
  {
    path: 'lab/monthly-games',
    title: 'Monthly games | Chess Repertoire Trainer',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/lab/pages/monthly-games-page.component').then(
        (m) => m.MonthlyGamesPageComponent,
      ),
  },
  {
    path: 'lab/performance-by-rating',
    title: 'Performance by rating | Chess Repertoire Trainer',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/lab/pages/performance-by-rating-page.component').then(
        (m) => m.PerformanceByRatingPageComponent,
      ),
  },
  {
    path: 'lab/course-extension-candidates',
    title: 'Course extension candidates | Chess Repertoire Trainer',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/lab/pages/course-extension-candidates-page.component').then(
        (m) => m.CourseExtensionCandidatesPageComponent,
      ),
  },
  {
    path: 'lab/tactical-detections',
    title: 'Tactical detections | Chess Repertoire Trainer',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/lab/pages/tactical-detections-page.component').then(
        (m) => m.TacticalDetectionsPageComponent,
      ),
  },
  {
    path: 'lab/training-log',
    title: 'Training log | Chess Repertoire Trainer',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/lab/pages/training-log-page.component').then(
        (m) => m.TrainingLogPageComponent,
      ),
  },
  {
    path: 'lab',
    title: 'Lab | Chess Repertoire Trainer',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/lab/pages/lab-page.component').then((m) => m.LabPageComponent),
  },
  {
    path: 'scenario-training/tactical-missed-shot',
    title: 'Tactical missed shot | Chess Repertoire Trainer',
    canActivate: [authGuard],
    data: { scenarioKind: 'missed-shot' },
    loadComponent: () =>
      import('./features/scenario-training/tactical-missed-shot/pages/tactical-missed-shot-trainer-page.component').then(
        (m) => m.TacticalScenarioTrainerPageComponent,
      ),
  },
  {
    path: 'scenario-training/tactical-missed-shot/:sessionId',
    title: 'Tactical missed shot | Chess Repertoire Trainer',
    canActivate: [authGuard],
    data: { scenarioKind: 'missed-shot' },
    loadComponent: () =>
      import('./features/scenario-training/tactical-missed-shot/pages/tactical-missed-shot-trainer-page.component').then(
        (m) => m.TacticalScenarioTrainerPageComponent,
      ),
  },
  {
    path: 'scenario-training/tactical-blunder',
    title: 'Blunder trainer | Chess Repertoire Trainer',
    canActivate: [authGuard],
    data: { scenarioKind: 'blunder' },
    loadComponent: () =>
      import('./features/scenario-training/tactical-missed-shot/pages/tactical-missed-shot-trainer-page.component').then(
        (m) => m.TacticalScenarioTrainerPageComponent,
      ),
  },
  {
    path: 'scenario-training/tactical-blunder/:sessionId',
    title: 'Blunder trainer | Chess Repertoire Trainer',
    canActivate: [authGuard],
    data: { scenarioKind: 'blunder' },
    loadComponent: () =>
      import('./features/scenario-training/tactical-missed-shot/pages/tactical-missed-shot-trainer-page.component').then(
        (m) => m.TacticalScenarioTrainerPageComponent,
      ),
  },
  {
    path: 'games/:gameId',
    title: 'Game review | Chess Repertoire Trainer',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/games/pages/game-detail-page.component').then(
        (m) => m.GameDetailPageComponent,
      ),
  },
  {
    path: 'courses',
    title: 'Courses | Chess Repertoire Trainer',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/courses/pages/courses-page.component').then((m) => m.CoursesPageComponent),
  },
  {
    path: 'courses/:courseId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/courses/pages/course-detail-page.component').then(
        (m) => m.CourseDetailPageComponent,
      ),
  },
  {
    path: 'courses/:courseId/marathon',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/lines/pages/training-marathon-page.component').then(
        (m) => m.TrainingMarathonPageComponent,
      ),
  },
  {
    path: 'courses/:courseId/review',
    title: 'Course review | Chess Repertoire Trainer',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/course-review/pages/course-review-page.component').then(
        (m) => m.CourseReviewPageComponent,
      ),
  },
  {
    path: 'chapters/:chapterId/lines',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/lines/pages/lines-page.component').then((m) => m.LinesPageComponent),
  },
  {
    path: 'chapters/:chapterId/marathon',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/lines/pages/training-marathon-page.component').then(
        (m) => m.TrainingMarathonPageComponent,
      ),
  },
  {
    path: 'lines/:lineId/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/lines/pages/line-editor-page.component').then(
        (m) => m.LineEditorPageComponent,
      ),
  },
  {
    path: 'lines/:lineId/train',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/lines/pages/line-train-page.component').then(
        (m) => m.LineTrainPageComponent,
      ),
  },
  {
    path: 'analysis',
    title: 'Analysis | Chess Repertoire Trainer',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/analysis/pages/free-analysis-page.component').then(
        (m) => m.FreeAnalysisPageComponent,
      ),
  },
  { path: '**', redirectTo: '/library' },
];
