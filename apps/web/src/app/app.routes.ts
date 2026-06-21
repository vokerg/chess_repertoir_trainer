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
    path: 'accounts',
    title: 'Accounts | Chess Repertoire Trainer',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/accounts/pages/accounts-page.component').then(
        (m) => m.AccountsPageComponent,
      ),
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
    path: 'lab',
    title: 'Lab | Chess Repertoire Trainer',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/lab/pages/lab-page.component').then((m) => m.LabPageComponent),
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
