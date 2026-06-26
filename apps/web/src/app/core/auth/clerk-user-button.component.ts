import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-clerk-user-button',
  standalone: true,
  template: '<div #mount class="clerk-user-button" aria-label="Account menu"></div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClerkUserButtonComponent implements AfterViewInit, OnDestroy {
  private readonly auth = inject(AuthService);

  @ViewChild('mount') private mount?: ElementRef<HTMLDivElement>;

  async ngAfterViewInit(): Promise<void> {
    await this.auth.initialize();
    const mount = this.mount?.nativeElement;
    if (mount && !this.auth.isDevAuth()) {
      await this.auth.mountUserButton(mount);
    }
  }

  ngOnDestroy(): void {
    const mount = this.mount?.nativeElement;
    if (mount) this.auth.unmountUserButton(mount);
  }
}
