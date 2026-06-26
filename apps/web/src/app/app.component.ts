import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { ClerkUserButtonComponent } from './core/auth/clerk-user-button.component';
import { ConfirmDialogComponent } from './shared/ui/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, ConfirmDialogComponent, ClerkUserButtonComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  protected mobileMenuOpen = false;

  ngOnInit(): void {
    void this.auth.initialize();
  }

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }
}
