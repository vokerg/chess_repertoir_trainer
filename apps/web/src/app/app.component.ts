import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
  protected readonly jobStore = inject(ImportedGameJobStore);

  constructor() {
    effect(() => {
      if (!this.auth.initialized()) return;
      if (this.auth.isSignedIn()) void this.jobStore.initialize();
      else this.jobStore.reset();
    });
    void this.auth.initialize();
  }
}
