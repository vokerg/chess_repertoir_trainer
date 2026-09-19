import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChildren,
} from '@angular/core';
import { PanelComponent } from '../../../../shared/ui/panel/panel.component';
import type { OpeningEvidenceTab } from '../../opening-analysis.models';

interface OpeningEvidenceTabOption {
  id: OpeningEvidenceTab;
  label: string;
}

@Component({
  selector: 'app-opening-evidence-tabs',
  standalone: true,
  imports: [PanelComponent],
  templateUrl: './opening-evidence-tabs.component.html',
  styleUrl: './opening-evidence-tabs.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpeningEvidenceTabsComponent {
  readonly activeTab = input.required<OpeningEvidenceTab>();
  readonly tabChange = output<OpeningEvidenceTab>();

  protected readonly tabs: readonly OpeningEvidenceTabOption[] = [
    { id: 'performance', label: 'My performance' },
    { id: 'masters', label: 'Masters' },
    { id: 'peers', label: 'Peers' },
    { id: 'last-games', label: 'Last games' },
  ];
  private readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');

  protected selectTab(tab: OpeningEvidenceTab): void {
    if (tab !== this.activeTab()) this.tabChange.emit(tab);
  }

  protected handleTabKeydown(event: KeyboardEvent, currentIndex: number): void {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + this.tabs.length) % this.tabs.length;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % this.tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = this.tabs.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    event.stopPropagation();
    const tab = this.tabs[nextIndex];
    this.tabChange.emit(tab.id);
    this.tabButtons()[nextIndex]?.nativeElement.focus();
  }
}
