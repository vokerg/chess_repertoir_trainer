import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  QueryList,
  ViewChild,
  ViewChildren,
  computed,
  input,
  output,
  signal,
} from '@angular/core';

export type UiSelectMenuMarker =
  | 'action'
  | 'graphite'
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

export interface UiSelectMenuOption {
  value: string;
  label: string;
  caption?: string;
  marker?: UiSelectMenuMarker;
  disabled?: boolean;
}

let selectMenuSequence = 0;

@Component({
  selector: 'app-select-menu',
  standalone: true,
  templateUrl: './select-menu.component.html',
  styleUrl: './select-menu.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectMenuComponent {
  @ViewChild('trigger') private trigger?: ElementRef<HTMLButtonElement>;
  @ViewChildren('optionButton') private optionButtons?: QueryList<ElementRef<HTMLButtonElement>>;

  readonly value = input.required<string>();
  readonly options = input.required<readonly UiSelectMenuOption[]>();
  readonly ariaLabel = input.required<string>();
  readonly placeholder = input('Select');
  readonly disabled = input(false);
  readonly panelAlign = input<'start' | 'end'>('start');
  readonly valueChange = output<string>();

  readonly open = signal(false);
  readonly activeIndex = signal(-1);
  readonly selectedOption = computed(
    () => this.options().find((option) => option.value === this.value()) ?? null,
  );

  protected readonly controlId = `ui-select-menu-${++selectMenuSequence}`;
  protected readonly panelId = `${this.controlId}-panel`;

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    if (event.target instanceof Node && this.host.nativeElement.contains(event.target)) return;
    this.close(false);
  }

  @HostListener('document:keydown.escape')
  protected onDocumentEscape(): void {
    if (this.open()) this.close(true);
  }

  protected toggle(): void {
    if (this.disabled()) return;
    if (this.open()) {
      this.close(false);
      return;
    }
    this.openAt(this.selectedIndexOrFirst());
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.openAt(this.open() ? this.nextEnabledIndex(this.activeIndex(), 1) : this.selectedIndexOrFirst());
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.openAt(this.open() ? this.nextEnabledIndex(this.activeIndex(), -1) : this.selectedIndexOrLast());
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggle();
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      this.openAt(event.key === 'Home' ? this.firstEnabledIndex() : this.lastEnabledIndex());
    }
  }

  protected onOptionKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Tab') {
      this.close(false);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.close(true);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      this.setActiveIndex(this.nextEnabledIndex(index, direction));
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      this.setActiveIndex(event.key === 'Home' ? this.firstEnabledIndex() : this.lastEnabledIndex());
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.select(this.options()[index]);
      return;
    }

    if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
      const match = this.typeaheadIndex(event.key, index);
      if (match !== -1) {
        event.preventDefault();
        this.setActiveIndex(match);
      }
    }
  }

  protected select(option: UiSelectMenuOption): void {
    if (option.disabled) return;
    if (option.value !== this.value()) this.valueChange.emit(option.value);
    this.close(true);
  }

  protected markerClasses(marker: UiSelectMenuMarker): string {
    return `select-menu-marker select-menu-marker-${marker}`;
  }

  private openAt(index: number): void {
    if (index === -1) return;
    this.open.set(true);
    this.setActiveIndex(index);
  }

  private setActiveIndex(index: number): void {
    if (index === -1) return;
    this.activeIndex.set(index);
    queueMicrotask(() => this.optionButtons?.get(index)?.nativeElement.focus());
  }

  private close(restoreFocus: boolean): void {
    this.open.set(false);
    this.activeIndex.set(-1);
    if (restoreFocus) queueMicrotask(() => this.trigger?.nativeElement.focus());
  }

  private selectedIndexOrFirst(): number {
    const selectedIndex = this.options().findIndex(
      (option) => option.value === this.value() && !option.disabled,
    );
    return selectedIndex === -1 ? this.firstEnabledIndex() : selectedIndex;
  }

  private selectedIndexOrLast(): number {
    const selectedIndex = this.options().findIndex(
      (option) => option.value === this.value() && !option.disabled,
    );
    return selectedIndex === -1 ? this.lastEnabledIndex() : selectedIndex;
  }

  private firstEnabledIndex(): number {
    return this.options().findIndex((option) => !option.disabled);
  }

  private lastEnabledIndex(): number {
    const options = this.options();
    for (let index = options.length - 1; index >= 0; index -= 1) {
      if (!options[index].disabled) return index;
    }
    return -1;
  }

  private nextEnabledIndex(currentIndex: number, direction: 1 | -1): number {
    const options = this.options();
    if (options.length === 0) return -1;

    for (let offset = 1; offset <= options.length; offset += 1) {
      const index = (currentIndex + direction * offset + options.length) % options.length;
      if (!options[index].disabled) return index;
    }

    return -1;
  }

  private typeaheadIndex(key: string, currentIndex: number): number {
    const options = this.options();
    const needle = key.toLocaleLowerCase();
    for (let offset = 1; offset <= options.length; offset += 1) {
      const index = (currentIndex + offset) % options.length;
      const option = options[index];
      if (!option.disabled && option.label.toLocaleLowerCase().startsWith(needle)) return index;
    }
    return -1;
  }
}
