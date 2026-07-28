import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  ChessSoundKind,
  ChessSoundPack,
  ChessSoundService,
} from '../../../shared/chess/services/chess-sound.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';

type SoundPackOption = {
  id: ChessSoundPack;
  label: string;
  description: string;
};

@Component({
  selector: 'app-appearance-settings-page',
  standalone: true,
  imports: [PageHeaderComponent, PanelComponent],
  template: `
    <section class="appearance-settings-page stack">
      <app-page-header
        title="Appearance"
        subtitle="Choose the board feedback preferences used on this device."
      />

      <app-panel
        title="Board sounds"
        subtitle="Use original in-browser sound design without copying sounds from another chess site."
      >
        <div class="sound-settings">
          <label class="setting-field">
            <span class="setting-label">Sound pack</span>
            <select [value]="sounds.pack()" (change)="changePack($event)">
              @for (option of soundPacks; track option.id) {
                <option [value]="option.id">{{ option.label }}</option>
              }
            </select>
            <span class="setting-help">{{ selectedPackDescription() }}</span>
          </label>

          <label class="setting-field">
            <span class="setting-heading">
              <span class="setting-label">Volume</span>
              <strong>{{ volumePercent() }}%</strong>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              [value]="volumePercent()"
              [disabled]="sounds.pack() === 'silent'"
              (input)="changeVolume($event)"
              aria-label="Board sound volume"
            />
            <span class="setting-help">Stored locally in this browser.</span>
          </label>

          <div class="preview-group" aria-label="Sound previews">
            <span class="setting-label">Preview</span>
            <div class="preview-actions">
              <button
                type="button"
                class="secondary"
                [disabled]="sounds.pack() === 'silent'"
                (click)="preview('move')"
              >
                Move
              </button>
              <button
                type="button"
                class="secondary"
                [disabled]="sounds.pack() === 'silent'"
                (click)="preview('capture')"
              >
                Capture
              </button>
              <button
                type="button"
                class="secondary"
                [disabled]="sounds.pack() === 'silent'"
                (click)="preview('error')"
              >
                Error
              </button>
            </div>
          </div>
        </div>
      </app-panel>
    </section>
  `,
  styles: [
    `
      .appearance-settings-page {
        gap: 1rem;
      }

      .sound-settings {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
        align-items: start;
      }

      .setting-field,
      .preview-group {
        display: grid;
        gap: 0.55rem;
        min-width: 0;
        padding: 1rem;
        border-radius: 18px;
        background: rgba(35, 27, 21, 0.045);
      }

      .setting-label {
        color: var(--text);
        font-weight: 800;
      }

      .setting-heading {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: baseline;
      }

      .setting-heading strong {
        color: var(--muted-strong);
        font-size: 0.85rem;
      }

      .setting-help {
        color: var(--muted);
        font-size: 0.9rem;
        line-height: 1.45;
      }

      select {
        width: 100%;
        min-height: 42px;
      }

      input[type='range'] {
        width: 100%;
        accent-color: var(--accent);
      }

      .preview-group {
        grid-column: 1 / -1;
      }

      .preview-actions {
        display: flex;
        gap: 0.65rem;
        flex-wrap: wrap;
      }

      .preview-actions button {
        min-height: 40px;
        padding: 0.65rem 0.9rem;
      }

      @media (max-width: 720px) {
        .sound-settings {
          grid-template-columns: 1fr;
        }

        .preview-group {
          grid-column: auto;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppearanceSettingsPageComponent {
  protected readonly sounds = inject(ChessSoundService);
  protected readonly soundPacks: readonly SoundPackOption[] = [
    {
      id: 'wood',
      label: 'Wood',
      description: 'Warm, layered impacts designed to resemble pieces landing on a wooden board.',
    },
    {
      id: 'digital',
      label: 'Digital',
      description: 'Clean electronic feedback with distinct move, capture, and error tones.',
    },
    {
      id: 'silent',
      label: 'Silent',
      description: 'Disables all board sound feedback.',
    },
  ];

  protected readonly volumePercent = computed(() => Math.round(this.sounds.volume() * 100));
  protected readonly selectedPackDescription = computed(
    () => this.soundPacks.find((option) => option.id === this.sounds.pack())?.description ?? '',
  );

  protected changePack(event: Event): void {
    const pack = (event.target as HTMLSelectElement).value as ChessSoundPack;
    this.sounds.setPack(pack);
    if (pack !== 'silent') this.sounds.play('move');
  }

  protected changeVolume(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.sounds.setVolume(value / 100);
  }

  protected preview(kind: ChessSoundKind): void {
    this.sounds.play(kind);
  }
}
