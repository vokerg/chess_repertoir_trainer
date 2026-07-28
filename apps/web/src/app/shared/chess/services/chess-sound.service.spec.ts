import { ChessSoundService } from './chess-sound.service';

const SOUND_PACK_STORAGE_KEY = 'chess-trainer.sound-pack';
const SOUND_VOLUME_STORAGE_KEY = 'chess-trainer.sound-volume';

describe('ChessSoundService', () => {
  beforeEach(() => {
    window.localStorage.removeItem(SOUND_PACK_STORAGE_KEY);
    window.localStorage.removeItem(SOUND_VOLUME_STORAGE_KEY);
  });

  afterEach(() => {
    window.localStorage.removeItem(SOUND_PACK_STORAGE_KEY);
    window.localStorage.removeItem(SOUND_VOLUME_STORAGE_KEY);
  });

  it('defaults to the original wood pack at a comfortable volume', () => {
    const service = new ChessSoundService();

    expect(service.pack()).toBe('wood');
    expect(service.volume()).toBe(0.7);
  });

  it('persists the selected sound pack for the next service instance', () => {
    const service = new ChessSoundService();

    service.setPack('digital');

    expect(window.localStorage.getItem(SOUND_PACK_STORAGE_KEY)).toBe('digital');
    expect(new ChessSoundService().pack()).toBe('digital');
  });

  it('persists and clamps volume to the supported range', () => {
    const service = new ChessSoundService();

    service.setVolume(1.4);
    expect(service.volume()).toBe(1);
    expect(window.localStorage.getItem(SOUND_VOLUME_STORAGE_KEY)).toBe('1');

    service.setVolume(-0.25);
    expect(service.volume()).toBe(0);
    expect(new ChessSoundService().volume()).toBe(0);
  });

  it('falls back to defaults when stored preferences are invalid', () => {
    window.localStorage.setItem(SOUND_PACK_STORAGE_KEY, 'unknown');
    window.localStorage.setItem(SOUND_VOLUME_STORAGE_KEY, 'not-a-number');

    const service = new ChessSoundService();

    expect(service.pack()).toBe('wood');
    expect(service.volume()).toBe(0.7);
  });
});
