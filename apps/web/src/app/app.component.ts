import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AccountImportSessionStore } from './core/account-imports/account-import-session.store';
import { AuthService } from './core/auth/auth.service';
import { ImportedGameJobPanelComponent } from './core/jobs/imported-game-job-panel.component';
import { ImportedGameJobStore } from './core/jobs/imported-game-job.store';
import { MainNavigationComponent } from './core/layout/main-navigation/main-navigation.component';
import { ConfirmDialogComponent } from './shared/ui/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    ConfirmDialogComponent,
    MainNavigationComponent,
    ImportedGameJobPanelComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly accountImportStore = inject(AccountImportSessionStore);
  protected readonly jobStore = inject(ImportedGameJobStore);
  protected readonly isStandaloneExperience = signal(this.isStandaloneUrl(this.router.url));

  constructor() {
    effect(() => {
      if (!this.auth.initialized()) return;
      if (this.auth.isSignedIn()) {
        void this.jobStore.initialize();
        const session = this.auth.resolvedAppSession();
        if (session) {
          void this.accountImportStore.initialize(
            session.appUser.user.id,
            session.generation,
          );
        } else {
          this.accountImportStore.reset();
        }
      } else {
        this.jobStore.reset();
        this.accountImportStore.reset();
      }
    });

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => this.isStandaloneExperience.set(this.isStandaloneUrl(event.urlAfterRedirects)));

    void this.auth.initialize();
  }

  private isStandaloneUrl(url: string): boolean {
    const [path] = url.split(/[?#]/, 1);
    return path === '/' || path === '/login' || path === '/signup';
  }
}
