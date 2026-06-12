# Angular implementation patterns

Use these recipes when applying `angular-architecture.md`.

## Route container

```ts
@Component({
  standalone: true,
  imports: [FeatureViewComponent],
  providers: [FeatureStore],
  templateUrl: './feature-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturePageComponent {
  protected readonly store = inject(FeatureStore);
}
```

Route parameter subscriptions use `takeUntilDestroyed`, or route inputs when configured consistently for the application.

## Feature store

```ts
@Injectable()
export class FeatureStore {
  private readonly api = inject(FeatureApiService);

  readonly items = signal<Item[]>([]);
  readonly loading = signal(false);
  readonly activeItems = computed(() => this.items().filter((item) => item.active));

  private patchItem(id: number, update: (item: Item) => Item): void {
    this.items.update((items) => items.map((item) => item.id === id ? update(item) : item));
  }
}
```

Page-provided stores are preferred for page-scoped state. Root-provided stores require a cross-route lifecycle requirement.

## Immutable nested update

```ts
this.patchItem(id, (item) => ({
  ...item,
  status: { ...item.status, state: 'COMPLETED', error: null },
}));
```

Never assign through a signal-owned object such as `item.status.state = 'COMPLETED'`.

## Presentational component

```ts
@Component({
  standalone: true,
  templateUrl: './item-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemRowComponent {
  readonly item = input.required<Item>();
  readonly selected = input(false);
  readonly activate = output<number>();
}
```

Outputs communicate user intent. The parent store decides whether that intent causes HTTP, navigation, or state changes.

## Shared analysis workbench

The shared analysis workbench receives board, move-tree, engine, navigation, and delete state as inputs and emits user intents as outputs. Feature wrappers and pages provide feature-specific copy, projected UI such as line notes, and confirmation dialogs. Feature stores decide whether an emitted move or delete command calls an API or updates a local-only tree. Shared analysis components must not import feature internals.

## Template control flow

```html
@if (loading()) {
  <app-loading-state />
} @else if (items().length === 0) {
  <app-empty-state />
} @else {
  @for (item of items(); track item.id) {
    <app-item-row [item]="item" (activate)="activate.emit($event)" />
  }
}
```

Do not call expensive transformations from templates. Expose computed view state from the component or store.

## Observable interop

Use `toSignal` for observable state consumed by signal-based views. Use `takeUntilDestroyed` for imperative route or external-event subscriptions. Avoid manual `Subscription` fields where Angular can own cleanup.

## Refactor checklist

- Route remains lazy-loaded and deep links remain valid.
- Page is composition-focused.
- HTTP calls are typed and centralized in data access.
- Workflow state is in a feature store.
- Components are OnPush and presentational.
- New templates use built-in control flow and stable tracking.
- State updates are immutable.
- External templates/styles are used where non-trivial.
- Pure logic and high-risk store transitions have tests.
- TypeScript, spec TypeScript, and Angular build pass.
