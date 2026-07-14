import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-initial-position-input',
  standalone: true,
  templateUrl: './initial-position-input.component.html',
  styleUrl: './initial-position-input.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InitialPositionInputComponent {
  readonly error = input<string | null>(null);
  readonly load = output<string>();
  protected readonly value = signal('');

  protected submit(): void {
    this.load.emit(this.value());
  }
}
