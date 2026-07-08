import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { ClerkUserButtonComponent } from '../../auth/clerk-user-button.component';
import { NavIconComponent, type NavIconName } from '../../../shared/ui/nav-icon/nav-icon.component';

interface AppNavItem {
  id: string;
  label: string;
  description?: string;
  link: string;
  icon: NavIconName;
  activePrefixes: readonly string[];
  quiet?: boolean;
}

interface AppNavNode extends AppNavItem {
  children?: readonly AppNavItem[];
}

@Component({
  selector: 'app-main-navigation',
  standalone: true,
  imports: [RouterModule, ClerkUserButtonComponent, NavIconComponent],
  templateUrl: './main-navigation.component.html',
  styleUrl: './main-navigation.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainNavigationComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected mobileMenuOpen = false;
  private readonly currentUrl = signal('/');

  protected readonly mainNavItems: readonly AppNavNode[] = [
    {
      id: 'study',
      label: 'Study',
      link: '/library',
      icon: 'study',
      activePrefixes: ['/library', '/chapters', '/lines', '/scenario-training/tactical-missed-shot'],
      children: [
        {
          id: 'repertoire-library',
          label: 'Repertoire library',
          description: 'Plan and train your repertoire lines',
          link: '/library',
          icon: 'study',
          activePrefixes: ['/library', '/chapters', '/lines'],
        },
        {
          id: 'missed-shots',
          label: 'Missed shots',
          description: 'Practice tactical chances you missed in analysed games.',
          link: '/scenario-training/tactical-missed-shot',
          icon: 'target',
          activePrefixes: ['/scenario-training/tactical-missed-shot'],
        },
      ],
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
      children: [
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
      id: 'progress',
      label: 'Progress',
      link: '/progress',
      icon: 'progress',
      activePrefixes: ['/progress'],
    },
    {
      id: 'tools',
      label: 'Tools',
      link: '/analysis',
      icon: 'analysis',
      activePrefixes: ['/analysis', '/lab'],
      children: [
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
    {
      id: 'settings',
      label: 'Settings',
      link: '/settings/accounts',
      icon: 'settings',
      activePrefixes: ['/settings'],
      children: [
        {
          id: 'import-accounts',
          label: 'Import accounts',
          description: 'Configure import sources and sync games',
          link: '/settings/accounts',
          icon: 'account',
          activePrefixes: ['/settings/accounts'],
        },
        {
          id: 'lichess-integration',
          label: 'Lichess integration',
          description: 'Connect OAuth for Lichess actions',
          link: '/settings/lichess',
          icon: 'openings',
          activePrefixes: ['/settings/lichess'],
        },
        {
          id: 'appearance',
          label: 'Appearance',
          description: 'Review display preferences',
          link: '/settings/appearance',
          icon: 'settings',
          activePrefixes: ['/settings/appearance'],
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

  protected navChildren(item: AppNavNode): readonly AppNavItem[] {
    return item.children ?? [item];
  }

  private currentPath(): string {
    const [pathWithoutHash] = this.currentUrl().split('#', 1);
    const [pathWithoutQuery] = pathWithoutHash.split('?', 1);
    return pathWithoutQuery || '/';
  }
}
