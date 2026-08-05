import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
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
  styleUrls: [
    './main-navigation.component.css',
    './main-navigation-disclosure.css',
    './main-navigation-mobile-primary.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainNavigationComponent implements OnInit, AfterViewInit, OnDestroy {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private viewReady = false;
  private restoreMobileMenuFocus = false;

  @ViewChild('mobileMenuDialog') private mobileMenuDialogRef?: ElementRef<HTMLDialogElement>;
  @ViewChild('mobileMenuCloseButton')
  private mobileMenuCloseButtonRef?: ElementRef<HTMLButtonElement>;
  @ViewChild('mobileMoreButton') private mobileMoreButtonRef?: ElementRef<HTMLButtonElement>;

  protected readonly railCollapsed = signal(false);
  protected readonly mobileMenuOpen = signal(false);
  protected readonly openNavId = signal<string | null>(null);
  private readonly currentUrl = signal('/');

  protected readonly mainNavItems: readonly AppNavNode[] = [
    {
      id: 'home',
      label: 'Home',
      description: 'Your next move',
      link: '/home',
      icon: 'home',
      activePrefixes: ['/home'],
    },
    {
      id: 'study',
      label: 'Study',
      description: 'Train your lines',
      link: '/library',
      icon: 'study',
      activePrefixes: [
        '/library',
        '/chapters',
        '/lines',
        '/puzzles',
        '/scenario-training/tactical-missed-shot',
        '/scenario-training/tactical-blunder',
      ],
      children: [
        {
          id: 'repertoire-library',
          label: 'Repertoire library',
          description: 'Plan and train your repertoire lines',
          link: '/library',
          icon: 'library',
          activePrefixes: ['/library', '/chapters', '/lines'],
        },
        {
          id: 'lichess-puzzles',
          label: 'Lichess puzzles',
          description: 'Solve rated or practice puzzles without leaving the app.',
          link: '/puzzles',
          icon: 'puzzle',
          activePrefixes: ['/puzzles'],
        },
        {
          id: 'missed-shots',
          label: 'Missed shots',
          description: 'Practice tactical chances you missed in analysed games.',
          link: '/scenario-training/tactical-missed-shot',
          icon: 'missed',
          activePrefixes: ['/scenario-training/tactical-missed-shot'],
        },
        {
          id: 'blunder-trainer',
          label: 'Avoid blunders',
          description: 'Practice safer choices from mistakes in analysed games.',
          link: '/scenario-training/tactical-blunder',
          icon: 'shield',
          activePrefixes: ['/scenario-training/tactical-blunder'],
        },
      ],
    },
    {
      id: 'courses',
      label: 'Courses',
      description: 'Build your repertoire',
      link: '/courses',
      icon: 'courses',
      activePrefixes: ['/courses'],
    },
    {
      id: 'games',
      label: 'Games',
      description: 'Review imported play',
      link: '/games',
      icon: 'games',
      activePrefixes: ['/games'],
    },
    {
      id: 'openings',
      label: 'Openings',
      description: 'Explore positions',
      link: '/opening-analysis',
      icon: 'openings',
      activePrefixes: ['/opening-analysis', '/opening-struggles'],
      children: [
        {
          id: 'opening-analysis',
          label: 'Opening analysis',
          description: 'Explore next moves from your games',
          link: '/opening-analysis',
          icon: 'opening-analysis',
          activePrefixes: ['/opening-analysis'],
        },
        {
          id: 'opening-struggles',
          label: 'Opening struggles',
          description: 'Find lines costing the most points',
          link: '/opening-struggles',
          icon: 'opening-struggles',
          activePrefixes: ['/opening-struggles'],
        },
      ],
    },
    {
      id: 'builder',
      label: 'Builder',
      description: 'Shape new lines',
      link: '/builder',
      icon: 'builder',
      activePrefixes: ['/builder'],
    },
    {
      id: 'progress',
      label: 'Progress',
      description: 'Read the evidence',
      link: '/progress',
      icon: 'progress',
      activePrefixes: ['/progress'],
      children: [
        {
          id: 'account-performance',
          label: 'Account performance',
          description: 'Rating history and results for your default account',
          link: '/progress',
          icon: 'performance',
          activePrefixes: ['/progress/accounts'],
        },
        {
          id: 'chess-profile',
          label: 'Chess profile',
          description: 'Opening preferences, strengths, and supporting evidence',
          link: '/progress/profile',
          icon: 'profile',
          activePrefixes: ['/progress/profile'],
        },
      ],
    },
    {
      id: 'tools',
      label: 'Tools',
      description: 'Analysis and experiments',
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
      description: 'Accounts and display',
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
          icon: 'import',
          activePrefixes: ['/settings/accounts'],
        },
        {
          id: 'lichess-integration',
          label: 'Lichess integration',
          description: 'Connect OAuth for Lichess actions',
          link: '/settings/lichess',
          icon: 'link',
          activePrefixes: ['/settings/lichess'],
        },
        {
          id: 'appearance',
          label: 'Appearance',
          description: 'Review display preferences',
          link: '/settings/appearance',
          icon: 'appearance',
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
  private readonly mobilePrimaryNavIds: readonly string[] = ['home', 'study', 'games', 'openings'];
  protected readonly mobilePrimaryNavItems = this.mainNavItems.filter((item) =>
    this.mobilePrimaryNavIds.includes(item.id),
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

  constructor() {
    effect(() => {
      const open = this.mobileMenuOpen();
      queueMicrotask(() => this.syncMobileMenuDialog(open));
    });
  }

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

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.syncMobileMenuDialog(this.mobileMenuOpen());
  }

  ngOnDestroy(): void {
    this.restoreMobileMenuFocus = false;
    const dialog = this.mobileMenuDialogRef?.nativeElement;
    if (dialog?.open) dialog.close();
  }

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    if (!this.mobileMenuOpen()) this.closeNavFlyout();
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
    if (this.mobileMenuOpen()) {
      this.closeMobileMenu(true);
      return;
    }

    this.restoreMobileMenuFocus = false;
    this.mobileMenuOpen.set(true);
    this.closeNavFlyout();
  }

  protected closeMobileMenu(restoreFocus = false): void {
    this.restoreMobileMenuFocus = restoreFocus;
    this.mobileMenuOpen.set(false);
  }

  protected handleMobileMenuCancel(event: Event): void {
    event.preventDefault();
    this.closeMobileMenu(true);
  }

  protected handleMobileMenuBackdropPointerDown(event: PointerEvent): void {
    if (event.target === this.mobileMenuDialogRef?.nativeElement) {
      this.closeMobileMenu(true);
    }
  }

  protected handleMobileMenuClosed(): void {
    this.mobileMenuOpen.set(false);
    if (!this.restoreMobileMenuFocus) return;

    this.restoreMobileMenuFocus = false;
    setTimeout(() => this.mobileMoreButtonRef?.nativeElement.focus());
  }

  protected closeTransientNavigation(): void {
    this.closeNavFlyout();
    this.closeMobileMenu(false);
  }

  protected isNavActive(item: AppNavItem): boolean {
    const url = this.currentPath();
    return item.activePrefixes.some((prefix) => url === prefix || url.startsWith(`${prefix}/`));
  }

  protected isMobileMoreActive(): boolean {
    return (
      this.mainNavItems.some((item) => this.isNavActive(item)) &&
      !this.mobilePrimaryNavItems.some((item) => this.isNavActive(item))
    );
  }

  protected navChildren(item: AppNavNode): readonly AppNavItem[] {
    return item.children ?? [item];
  }

  private syncMobileMenuDialog(open: boolean): void {
    if (!this.viewReady) return;
    const dialog = this.mobileMenuDialogRef?.nativeElement;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
      queueMicrotask(() => this.mobileMenuCloseButtonRef?.nativeElement.focus());
      return;
    }

    if (dialog.open) dialog.close();
  }

  private currentPath(): string {
    const [pathWithoutHash] = this.currentUrl().split('#', 1);
    const [pathWithoutQuery] = pathWithoutHash.split('?', 1);
    return pathWithoutQuery || '/';
  }
}
