import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AuthService } from './core/auth/auth.service';
import { ClerkUserButtonComponent } from './core/auth/clerk-user-button.component';
import { ConfirmDialogComponent } from './shared/ui/confirm-dialog/confirm-dialog.component';
import { NavIconComponent, type NavIconName } from './shared/ui/nav-icon/nav-icon.component';

interface AppNavItem {
  id: string;
  label: string;
  description?: string;
  link: string;
  icon: NavIconName;
  activePrefixes: readonly string[];
  quiet?: boolean;
}

interface AppNavGroup {
  title: string;
  items: readonly AppNavItem[];
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, ConfirmDialogComponent, ClerkUserButtonComponent, NavIconComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected mobileMenuOpen = false;
  private readonly currentUrl = signal('/');
  protected readonly primaryNavItems: readonly AppNavItem[] = [
    {
      id: 'study',
      label: 'Study',
      link: '/library',
      icon: 'study',
      activePrefixes: ['/library', '/chapters', '/lines'],
    },
    {
      id: 'courses',
      label: 'Courses',
      link: '/courses',
      icon: 'courses',
      activePrefixes: ['/courses'],
    },
    {
      id: 'games',
      label: 'Games',
      link: '/games',
      icon: 'games',
      activePrefixes: ['/games'],
    },
    {
      id: 'openings',
      label: 'Openings',
      link: '/opening-analysis',
      icon: 'openings',
      activePrefixes: ['/opening-analysis', '/opening-struggles'],
    },
    {
      id: 'progress',
      label: 'Progress',
      link: '/progress',
      icon: 'progress',
      activePrefixes: ['/progress', '/accounts'],
    },
    {
      id: 'missed-shots',
      label: 'Missed shots',
      link: '/scenario-training/tactical-missed-shot',
      icon: 'target',
      activePrefixes: ['/scenario-training/tactical-missed-shot'],
    },
    {
      id: 'analysis',
      label: 'Analysis',
      link: '/analysis',
      icon: 'analysis',
      activePrefixes: ['/analysis'],
    },
    {
      id: 'lab',
      label: 'Lab',
      link: '/lab',
      icon: 'lab',
      activePrefixes: ['/lab'],
      quiet: true,
    },
  ];
  protected readonly mobileNavGroups: readonly AppNavGroup[] = [
    {
      title: 'Study',
      items: [
        {
          id: 'repertoire-library',
          label: 'Repertoire library',
          description: 'Plan and train your repertoire lines',
          link: '/library',
          icon: 'study',
          activePrefixes: ['/library', '/chapters', '/lines'],
        },
        {
          id: 'courses',
          label: 'Courses',
          description: 'Manage course chapters and line collections',
          link: '/courses',
          icon: 'courses',
          activePrefixes: ['/courses'],
        },
      ],
    },
    {
      title: 'Train',
      items: [
        {
          id: 'missed-shots',
          label: 'Missed shots',
          description: 'Practice tactical chances you missed in analysed games.',
          link: '/scenario-training/tactical-missed-shot',
          icon: 'target',
          activePrefixes: ['/scenario-training/tactical-missed-shot'],
        },
        {
          id: 'repertoire-marathon',
          label: 'Repertoire marathon',
          description: 'Choose repertoire lines and start a training session.',
          link: '/library',
          icon: 'study',
          activePrefixes: ['/library/marathon'],
        },
      ],
    },
    {
      title: 'Openings',
      items: [
        {
          id: 'opening-analysis',
          label: 'Opening analysis',
          description: 'Explore next moves from your games',
          link: '/opening-analysis',
          icon: 'openings',
          activePrefixes: ['/opening-analysis'],
        },
        {
          id: 'opening-struggles',
          label: 'Opening struggles',
          description: 'Find lines costing the most points',
          link: '/opening-struggles',
          icon: 'progress',
          activePrefixes: ['/opening-struggles'],
        },
      ],
    },
    {
      title: 'Progress',
      items: [
        {
          id: 'player-dashboard',
          label: 'Player dashboard',
          description: 'Ratings, highs, history, and results',
          link: '/progress',
          icon: 'progress',
          activePrefixes: ['/progress', '/accounts'],
        },
        {
          id: 'manage-accounts',
          label: 'Manage accounts',
          description: 'Configure import sources and sync games',
          link: '/accounts',
          icon: 'settings',
          activePrefixes: ['/accounts'],
        },
      ],
    },
    {
      title: 'Games',
      items: [
        {
          id: 'game-explorer',
          label: 'Game explorer',
          description: 'Review and analyse imported games',
          link: '/games',
          icon: 'games',
          activePrefixes: ['/games'],
        },
      ],
    },
    {
      title: 'Tools',
      items: [
        {
          id: 'analysis-board',
          label: 'Analysis board',
          description: 'Free board and engine workspace',
          link: '/analysis',
          icon: 'analysis',
          activePrefixes: ['/analysis'],
        },
        {
          id: 'lab',
          label: 'Lab',
          description: 'Experimental reports and raw tools',
          link: '/lab',
          icon: 'lab',
          activePrefixes: ['/lab'],
          quiet: true,
        },
      ],
    },
  ];
  protected readonly authNavItems: readonly AppNavItem[] = [
    {
      id: 'login',
      label: 'Sign in',
      link: '/login',
      icon: 'account',
      activePrefixes: ['/login'],
    },
    {
      id: 'signup',
      label: 'Sign up',
      link: '/signup',
      icon: 'account',
      activePrefixes: ['/signup'],
    },
  ];

  ngOnInit(): void {
    void this.auth.initialize();
    this.currentUrl.set(this.router.url);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
        this.closeMobileMenu();
      });
  }

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  protected isNavActive(item: AppNavItem): boolean {
    const url = this.currentPath();
    return item.activePrefixes.some((prefix) => url === prefix || url.startsWith(`${prefix}/`));
  }

  private currentPath(): string {
    const [pathWithoutHash] = this.currentUrl().split('#', 1);
    const [pathWithoutQuery] = pathWithoutHash.split('?', 1);
    return pathWithoutQuery || '/';
  }
}
