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
  templateUrl: './appearance-settings-page.component.html',
  styleUrl: './appearance-settings-page.component.css',
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
