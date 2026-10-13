import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChildren,
} from '@angular/core';
import { PanelComponent } from '../../ui/panel/panel.component';
import type { PositionEvidenceTab, PositionEvidenceTabOption } from './position-evidence.models';

@Component({
  selector: 'app-position-evidence-tabs',
  standalone: true,
  imports: [PanelComponent],
  templateUrl: './position-evidence-tabs.component.html',
  styleUrl: './position-evidence-tabs.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PositionEvidenceTabsComponent {
  readonly activeTab = input.required<PositionEvidenceTab>();
  readonly idPrefix = input('position-evidence');
  readonly tabChange = output<PositionEvidenceTab>();

  readonly tabs = input<readonly PositionEvidenceTabOption[]>([
    { id: 'performance', label: 'My performance' },
    { id: 'masters', label: 'Masters' },
    { id: 'peers', label: 'Peers' },
    { id: 'last-games', label: 'Last games' },
  ]);
  private readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');

  protected selectTab(tab: PositionEvidenceTab): void {
    if (tab !== this.activeTab()) this.tabChange.emit(tab);
  }

  protected handleTabKeydown(event: KeyboardEvent, currentIndex: number): void {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowLeft')
      nextIndex = (currentIndex - 1 + this.tabs().length) % this.tabs().length;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % this.tabs().length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = this.tabs().length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    event.stopPropagation();
    const tab = this.tabs()[nextIndex];
    this.tabChange.emit(tab.id);
    this.tabButtons()[nextIndex]?.nativeElement.focus();
  }
}
