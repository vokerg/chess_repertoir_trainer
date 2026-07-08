import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';

@Component({
  selector: 'app-appearance-settings-page',
  standalone: true,
  imports: [PageHeaderComponent, PanelComponent],
  template: `
    <section class="stack">
      <app-page-header title="Appearance" subtitle="Display preferences will live here." />

      <app-panel title="Appearance">
        <p class="status-note">Appearance settings are not configurable yet.</p>
      </app-panel>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppearanceSettingsPageComponent {}
