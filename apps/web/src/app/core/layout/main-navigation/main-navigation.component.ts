import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { ClerkUserButtonComponent } from '../../auth/clerk-user-button.component';
import { BrandLockupComponent } from '../../../shared/ui/brand/brand-lockup.component';
import { BrandMarkComponent } from '../../../shared/ui/brand/brand-mark.component';
import { NavIconComponent, type NavIconName } from '../../../shared/ui/nav-icon/nav-icon.component';

type AppNavSection = 'primary' | 'workspace';

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
  section?: AppNavSection;
  children?: readonly AppNavItem[];
}

@Component({
  selector: 'app-main-navigation',
  standalone: true,
  imports: [
    RouterModule,
    ClerkUserButtonComponent,
    BrandLockupComponent,
    BrandMarkComponent,
    NavIconComponent,
  ],
  templateUrl: './main-navigation.component.html',
  styleUrls: ['./main-navigation.component.css', './main-navigation-disclosure.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainNavigationComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly railCollapsed = signal(false);
  protected readonly mobileMenuOpen = signal(false);
  protected readonly openNavId = signal<string | null>(null);
  private readonly currentUrl = signal('/');

  protected readonly mainNavItems: readonly AppNavNode[] = [
    {
      id: 'home',
      label: 'Home',
      link: '/home',
      icon: 'home',
      activePrefixes: ['/home'],
    },
    {
      id: 'study',
      label: 'Study',
      link: '/library',
      icon: 'study',
      activePrefixes: [
        '/library',
        '/chapters',
        '/lines',
        '/scenario-training/tactical-missed-shot',
        '/scenario-training/tactical-blunder',
      ],
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
        {
          id: 'blunder-trainer',
          label: 'Avoid blunders',
          description: 'Practice safer choices from mistakes in analysed games.',
          link: '/scenario-training/tactical-blunder',
          icon: 'target',
          activePrefixes: ['/scenario-training/tactical-blunder'],
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
      section: 'workspace',
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
      section: 'workspace',
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

  protected readonly primaryNavItems = this.mainNavItems.filter(
    (item) => item.section !== 'workspace',
  );
  protected readonly workspaceNavItems = this.mainNavItems.filter(
    (item) => item.section === 'workspace',
  );

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
        this.closeTransientNavigation();
      });
  }

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    this.closeTransientNavigation();
  }

  protected toggleRail(): void {
    this.railCollapsed.update((collapsed) => !collapsed);
    this.closeNavFlyout();
  }

  protected toggleNavFlyout(item: AppNavNode): void {
    if (!item.children?.length) return;
    this.openNavId.update((openId) => (openId === item.id ? null : item.id));
  }

  protected closeNavFlyout(): void {
    this.openNavId.set(null);
  }

  protected isNavFlyoutOpen(item: AppNavNode): boolean {
    return this.openNavId() === item.id;
  }

  protected navFlyoutId(item: AppNavNode): string {
    return `rail-nav-children-${item.id}`;
  }

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
    this.closeNavFlyout();
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  protected closeTransientNavigation(): void {
    this.closeNavFlyout();
    this.closeMobileMenu();
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
