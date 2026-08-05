import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChessSoundService } from '../../../shared/chess/services/chess-sound.service';
import { AppearanceSettingsPageComponent } from './appearance-settings-page.component';

describe('AppearanceSettingsPageComponent', () => {
  let fixture: ComponentFixture<AppearanceSettingsPageComponent>;
  let sounds: jasmine.SpyObj<ChessSoundService>;

  beforeEach(async () => {
    sounds = jasmine.createSpyObj<ChessSoundService>(
      'ChessSoundService',
      ['setPack', 'setVolume', 'play'],
      {
        pack: signal<'wood' | 'digital' | 'silent'>('wood'),
        volume: signal(0.7),
      },
    );

    await TestBed.configureTestingModule({
      imports: [AppearanceSettingsPageComponent],
      providers: [{ provide: ChessSoundService, useValue: sounds }],
    }).compileComponents();

    fixture = TestBed.createComponent(AppearanceSettingsPageComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('associates each control with explicit labels and local-preference help', () => {
    const root = fixture.nativeElement as HTMLElement;
    const packLabel = root.querySelector('label[for="board-sound-pack"]');
    const volumeLabel = root.querySelector('label[for="board-sound-volume"]');
    const pack = root.querySelector('#board-sound-pack') as HTMLSelectElement;
    const volume = root.querySelector('#board-sound-volume') as HTMLInputElement;
    const preview = root.querySelector('[role="group"][aria-labelledby="board-sound-preview-label"]');

    expect(packLabel?.textContent).toContain('Sound pack');
    expect(volumeLabel?.textContent).toContain('Volume');
    expect(pack.getAttribute('aria-describedby')).toBe('board-sound-pack-help');
    expect(volume.getAttribute('aria-describedby')).toBe('board-sound-volume-help');
    expect(root.querySelector('output[for="board-sound-volume"]')?.textContent).toContain('70%');
    expect(root.textContent).toContain('stored only in this browser');
    expect(preview).not.toBeNull();
  });

  it('persists a selected pack and previews its move sound', () => {
    const pack = (fixture.nativeElement as HTMLElement).querySelector(
      '#board-sound-pack',
    ) as HTMLSelectElement;
    pack.value = 'digital';
    pack.dispatchEvent(new Event('change'));

    expect(sounds.setPack).toHaveBeenCalledOnceWith('digital');
    expect(sounds.play).toHaveBeenCalledOnceWith('move');
  });

  it('normalizes the rendered volume percentage before persistence', () => {
    const volume = (fixture.nativeElement as HTMLElement).querySelector(
      '#board-sound-volume',
    ) as HTMLInputElement;
    volume.value = '35';
    volume.dispatchEvent(new Event('input'));

    expect(sounds.setVolume).toHaveBeenCalledOnceWith(0.35);
  });

  it('plays the requested preview sound through the shared sound service', () => {
    const capture = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.preview-actions button'),
    ).find((button) => button.textContent?.trim() === 'Capture') as HTMLButtonElement;

    capture.click();

    expect(sounds.play).toHaveBeenCalledOnceWith('capture');
  });
});
