import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AuthShellComponent } from './auth-shell.component';

@Component({
  selector: 'app-signup-page',
  standalone: true,
  imports: [RouterLink, AuthShellComponent],
  templateUrl: './signup-page.component.html',
  styleUrl: './login-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupPageComponent implements AfterViewInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly isDevAuth = this.auth.isDevAuth;
  protected readonly appUserError = this.auth.appUserError;
  protected readonly returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/home';
  protected readonly authQueryParams = { returnUrl: this.returnUrl };
  private redirectStarted = false;

  @ViewChild('signUpMount') private signUpMount?: ElementRef<HTMLDivElement>;

  constructor() {
    effect(() => {
      if (this.auth.initialized() && this.auth.isSignedIn()) {
        this.redirectToApplication();
      }
    });
  }

  async ngAfterViewInit(): Promise<void> {
    await this.auth.initialize();
    if (this.auth.isSignedIn()) {
      this.redirectToApplication();
      return;
    }

    const mount = this.signUpMount?.nativeElement;
    if (mount && !this.auth.isDevAuth()) await this.auth.mountSignUp(mount, this.returnUrl);
  }

  ngOnDestroy(): void {
    const mount = this.signUpMount?.nativeElement;
    if (mount) this.auth.unmountSignUp(mount);
  }

  private redirectToApplication(): void {
    if (this.redirectStarted) return;
    this.redirectStarted = true;
    void this.router.navigateByUrl(this.returnUrl);
  }
}
