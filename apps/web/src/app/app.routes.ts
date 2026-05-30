import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/library', pathMatch: 'full' },
  {
    path: 'library',
    loadComponent: () => import('./pages/library-browser-page.component').then((m) => m.LibraryBrowserPageComponent),
  },
  {
    path: 'accounts',
    loadComponent: () => import('./pages/accounts-page.component').then((m) => m.AccountsPageComponent),
  },
  {
    path: 'games',
    loadComponent: () => import('./features/games/pages/games-explorer-page.component').then((m) => m.GamesExplorerPageComponent),
  },
  {
    path: 'opening-analysis',
    loadComponent: () => import('./pages/opening-analysis-page.component').then((m) => m.OpeningAnalysisPageComponent),
  },
  {
    path: 'lab',
    loadComponent: () => import('./pages/lab-page.component').then((m) => m.LabPageComponent),
  },
  {
    path: 'games/:gameId',
    loadComponent: () => import('./pages/game-detail-page.component').then((m) => m.GameDetailPageComponent),
  },
  {
    path: 'courses',
    loadComponent: () => import('./pages/courses-page.component').then((m) => m.CoursesPageComponent),
  },
  {
    path: 'courses/:courseId',
    loadComponent: () => import('./pages/course-detail-page.component').then((m) => m.CourseDetailPageComponent),
  },
  {
    path: 'chapters/:chapterId/lines',
    loadComponent: () => import('./pages/lines-page.component').then((m) => m.LinesPageComponent),
  },
  {
    path: 'lines/:lineId/edit',
    loadComponent: () => import('./pages/line-editor-page.component').then((m) => m.LineEditorPageComponent),
  },
  {
    path: 'lines/:lineId/train',
    loadComponent: () => import('./pages/line-train-page.component').then((m) => m.LineTrainPageComponent),
  },
  {
    path: 'stats',
    loadComponent: () => import('./pages/stats-page.component').then((m) => m.StatsPageComponent),
  },
  { path: '**', redirectTo: '/library' },
];
