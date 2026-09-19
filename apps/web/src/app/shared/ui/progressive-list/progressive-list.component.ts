import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  effect,
  input,
  signal,
  untracked,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

interface ProgressiveListItemContext<T> {
  $implicit: T;
}

@Component({
  selector: 'app-progressive-list',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './progressive-list.component.html',
  styleUrl: './progressive-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressiveListComponent<T> {
  readonly items = input.required<readonly T[]>();
  readonly itemTemplate = input.required<TemplateRef<ProgressiveListItemContext<T>>>();
  readonly initialCount = input(4);
  readonly resetKey = input<unknown>(null);

  protected readonly expanded = signal(false);
  protected readonly visibleItems = computed(() =>
    this.expanded() ? this.items() : this.items().slice(0, this.normalizedInitialCount()),
  );
  protected readonly remainingCount = computed(() =>
    Math.max(0, this.items().length - this.normalizedInitialCount()),
  );
  protected readonly canExpand = computed(() => this.remainingCount() > 0);

  constructor() {
    effect(() => {
      this.resetKey();
      untracked(() => this.expanded.set(false));
    });
  }

  protected toggleExpanded(): void {
    this.expanded.update((expanded) => !expanded);
  }

  private normalizedInitialCount(): number {
    return Math.max(1, this.initialCount());
  }
}
