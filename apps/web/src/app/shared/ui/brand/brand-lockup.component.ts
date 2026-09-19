import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BrandMarkComponent, type BrandMarkVariant } from './brand-mark.component';

export type BrandLockupTone = 'default' | 'inverse';

@Component({
  selector: 'app-brand-lockup',
  standalone: true,
  imports: [BrandMarkComponent],
  templateUrl: './brand-lockup.component.html',
  styleUrl: './brand-lockup.component.css',
  host: {
    '[class.brand-lockup-collapse-mobile]': 'collapseAtMobile()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandLockupComponent {
  readonly tone = input<BrandLockupTone>('default');
  readonly markVariant = input<BrandMarkVariant>('badge');
  readonly markSize = input(42);
  readonly collapseAtMobile = input(false);
}
