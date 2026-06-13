import { ChangeDetectionStrategy, Component, OnDestroy, input, signal } from '@angular/core';
import { AvailableSubline } from '../data-access/sublines.models';

@Component({
  selector: 'app-sublines-list',
  standalone: true,
  templateUrl: './sublines-list.component.html',
  styleUrl: './sublines-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SublinesListComponent implements OnDestroy {
  readonly items = input.required<AvailableSubline[]>();
  readonly loading = input.required<boolean>();
  readonly error = input.required<string | null>();
  readonly title = input('Available sublines');
  protected readonly copiedLeafNodeId = signal<number | null>(null);
  private resetTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnDestroy(): void {
    if (this.resetTimer) clearTimeout(this.resetTimer);
  }

  protected async copyMoves(item: AvailableSubline): Promise<void> {
    try {
      await navigator.clipboard.writeText(item.moveText);
      this.copiedLeafNodeId.set(item.leafNodeId);
      if (this.resetTimer) clearTimeout(this.resetTimer);
      this.resetTimer = setTimeout(() => {
        this.copiedLeafNodeId.set(null);
        this.resetTimer = null;
      }, 1800);
    } catch {
      this.copiedLeafNodeId.set(null);
    }
  }
}
