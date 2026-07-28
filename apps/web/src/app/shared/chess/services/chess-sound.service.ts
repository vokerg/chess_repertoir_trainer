import { Injectable, signal } from '@angular/core';

export type ChessSoundKind = 'move' | 'capture' | 'error';
export type ChessSoundPack = 'wood' | 'digital' | 'silent';

const SOUND_PACK_STORAGE_KEY = 'chess-trainer.sound-pack';
const SOUND_VOLUME_STORAGE_KEY = 'chess-trainer.sound-volume';
const DEFAULT_SOUND_PACK: ChessSoundPack = 'wood';
const DEFAULT_SOUND_VOLUME = 0.7;

const SOUND_PACKS = new Set<ChessSoundPack>(['wood', 'digital', 'silent']);

type ToneOptions = {
  type: OscillatorType;
  startFrequency: number;
  endFrequency: number;
  duration: number;
  peakGain: number;
  startTime: number;
};

type WoodImpactOptions = {
  startTime: number;
  duration: number;
  noiseFrequency: number;
  resonanceFrequency: number;
  peakGain: number;
};

type WindowWithWebkitAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

@Injectable({ providedIn: 'root' })
export class ChessSoundService {
  private context: AudioContext | null = null;
  private readonly noiseBuffers = new WeakMap<AudioContext, AudioBuffer>();
  private readonly selectedPack = signal<ChessSoundPack>(this.readPack());
  private readonly selectedVolume = signal(this.readVolume());

  readonly pack = this.selectedPack.asReadonly();
  readonly volume = this.selectedVolume.asReadonly();

  setPack(pack: ChessSoundPack): void {
    if (!SOUND_PACKS.has(pack)) return;
    this.selectedPack.set(pack);
    this.writeStorage(SOUND_PACK_STORAGE_KEY, pack);
  }

  setVolume(volume: number): void {
    const normalized = this.normalizeVolume(volume);
    this.selectedVolume.set(normalized);
    this.writeStorage(SOUND_VOLUME_STORAGE_KEY, String(normalized));
  }

  play(kind: ChessSoundKind): void {
    const pack = this.selectedPack();
    const volume = this.selectedVolume();
    if (pack === 'silent' || volume <= 0) return;

    const context = this.getContext();
    if (!context) return;

    if (context.state === 'suspended') {
      context
        .resume()
        .then(() => this.playWithContext(context, pack, kind, volume))
        .catch(() => undefined);
      return;
    }

    this.playWithContext(context, pack, kind, volume);
  }

  private playWithContext(
    context: AudioContext,
    pack: Exclude<ChessSoundPack, 'silent'>,
    kind: ChessSoundKind,
    volume: number,
  ): void {
    try {
      if (pack === 'wood') {
        this.playWoodSound(context, kind, volume);
      } else {
        this.playDigitalSound(context, kind, volume);
      }
    } catch {
      // Sound feedback must never interrupt board interaction.
    }
  }

  private playWoodSound(context: AudioContext, kind: ChessSoundKind, volume: number): void {
    const now = context.currentTime;

    if (kind === 'move') {
      this.woodImpact(context, volume, {
        startTime: now,
        duration: 0.075,
        noiseFrequency: 1_650,
        resonanceFrequency: 185,
        peakGain: 0.12,
      });
      return;
    }

    if (kind === 'capture') {
      this.woodImpact(context, volume, {
        startTime: now,
        duration: 0.09,
        noiseFrequency: 1_250,
        resonanceFrequency: 145,
        peakGain: 0.15,
      });
      this.woodImpact(context, volume, {
        startTime: now + 0.045,
        duration: 0.065,
        noiseFrequency: 1_900,
        resonanceFrequency: 210,
        peakGain: 0.1,
      });
      return;
    }

    this.woodImpact(context, volume, {
      startTime: now,
      duration: 0.1,
      noiseFrequency: 720,
      resonanceFrequency: 96,
      peakGain: 0.13,
    });
    this.tone(context, volume, {
      type: 'triangle',
      startFrequency: 150,
      endFrequency: 82,
      duration: 0.13,
      peakGain: 0.05,
      startTime: now + 0.015,
    });
  }

  private playDigitalSound(context: AudioContext, kind: ChessSoundKind, volume: number): void {
    const now = context.currentTime;

    if (kind === 'move') {
      this.tone(context, volume, {
        type: 'triangle',
        startFrequency: 920,
        endFrequency: 610,
        duration: 0.055,
        peakGain: 0.045,
        startTime: now,
      });
      return;
    }

    if (kind === 'capture') {
      this.tone(context, volume, {
        type: 'square',
        startFrequency: 230,
        endFrequency: 135,
        duration: 0.075,
        peakGain: 0.05,
        startTime: now,
      });
      this.tone(context, volume, {
        type: 'triangle',
        startFrequency: 700,
        endFrequency: 390,
        duration: 0.055,
        peakGain: 0.035,
        startTime: now + 0.022,
      });
      return;
    }

    this.tone(context, volume, {
      type: 'sawtooth',
      startFrequency: 195,
      endFrequency: 82,
      duration: 0.12,
      peakGain: 0.04,
      startTime: now,
    });
    this.tone(context, volume, {
      type: 'square',
      startFrequency: 245,
      endFrequency: 110,
      duration: 0.095,
      peakGain: 0.022,
      startTime: now + 0.012,
    });
  }

  private woodImpact(context: AudioContext, volume: number, options: WoodImpactOptions): void {
    const start = Math.max(context.currentTime, options.startTime);
    const end = start + options.duration;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const noiseGain = context.createGain();

    source.buffer = this.noiseBuffer(context);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(options.noiseFrequency, start);
    filter.Q.setValueAtTime(0.75, start);
    noiseGain.gain.setValueAtTime(0.0001, start);
    noiseGain.gain.exponentialRampToValueAtTime(options.peakGain * volume, start + 0.003);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, end);

    source.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(context.destination);

    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      noiseGain.disconnect();
    };

    const noiseOffset = Math.random() * 0.08;
    source.start(start, noiseOffset);
    source.stop(end + 0.01);

    this.tone(context, volume, {
      type: 'sine',
      startFrequency: options.resonanceFrequency * 1.12,
      endFrequency: options.resonanceFrequency,
      duration: options.duration * 1.35,
      peakGain: options.peakGain * 0.32,
      startTime: start,
    });
  }

  private tone(context: AudioContext, volume: number, options: ToneOptions): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = Math.max(context.currentTime, options.startTime);
    const end = start + options.duration;

    oscillator.type = options.type;
    oscillator.frequency.setValueAtTime(options.startFrequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, end);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(options.peakGain * volume, start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  }

  private noiseBuffer(context: AudioContext): AudioBuffer {
    const cached = this.noiseBuffers.get(context);
    if (cached) return cached;

    const durationSeconds = 0.35;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * durationSeconds), context.sampleRate);
    const channel = buffer.getChannelData(0);
    let previous = 0;

    for (let index = 0; index < channel.length; index += 1) {
      const white = Math.random() * 2 - 1;
      previous = previous * 0.42 + white * 0.58;
      channel[index] = previous;
    }

    this.noiseBuffers.set(context, buffer);
    return buffer;
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (this.context) return this.context;

    const browserWindow = window as WindowWithWebkitAudio;
    const AudioContextConstructor = window.AudioContext || browserWindow.webkitAudioContext;
    if (!AudioContextConstructor) return null;

    this.context = new AudioContextConstructor({ latencyHint: 'interactive' });
    return this.context;
  }

  private readPack(): ChessSoundPack {
    const stored = this.readStorage(SOUND_PACK_STORAGE_KEY);
    return stored && SOUND_PACKS.has(stored as ChessSoundPack)
      ? (stored as ChessSoundPack)
      : DEFAULT_SOUND_PACK;
  }

  private readVolume(): number {
    const stored = this.readStorage(SOUND_VOLUME_STORAGE_KEY);
    if (stored === null) return DEFAULT_SOUND_VOLUME;

    const parsed = Number(stored);
    return Number.isFinite(parsed) ? this.normalizeVolume(parsed) : DEFAULT_SOUND_VOLUME;
  }

  private normalizeVolume(volume: number): number {
    if (!Number.isFinite(volume)) return DEFAULT_SOUND_VOLUME;
    return Math.min(1, Math.max(0, volume));
  }

  private readStorage(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private writeStorage(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Storage can be disabled; the in-memory preference still applies.
    }
  }
}
