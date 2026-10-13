import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  input,
  viewChild,
} from '@angular/core';

export interface WidgetToggle {
  id: string;
  label: string;
  pressed: boolean;
  run: () => void;
}

@Component({
  selector: 'app-widget-menu',
  standalone: true,
  templateUrl: './widget-menu.component.html',
  styleUrl: './widget-menu.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WidgetMenuComponent {
  readonly widgets = input<readonly WidgetToggle[]>([]);
  private readonly menu = viewChild.required<ElementRef<HTMLDetailsElement>>('menu');

  @HostListener('document:click', ['$event'])
  protected closeOutside(event: MouseEvent): void {
    if (!this.menu().nativeElement.contains(event.target as Node))
      this.menu().nativeElement.open = false;
  }

  protected closeOnEscape(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    const menu = this.menu().nativeElement;
    menu.open = false;
    menu.querySelector('summary')?.focus();
  }
}
