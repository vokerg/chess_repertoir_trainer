import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BrandMarkVariant = 'mark' | 'badge' | 'reversed';

@Component({
  selector: 'app-brand-mark',
  standalone: true,
  templateUrl: './brand-mark.component.html',
  styleUrl: './brand-mark.component.css',
  host: {
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandMarkComponent {
  readonly variant = input<BrandMarkVariant>('badge');
  readonly size = input(42);
  readonly label = input<string | null>(null);
}
