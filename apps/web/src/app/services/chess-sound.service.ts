import { Injectable } from '@angular/core';

export type ChessSoundKind = 'move' | 'capture' | 'error';

@Injectable({ providedIn: 'root' })
export class ChessSoundService {
  private context: AudioContext | null = null;

  play(kind: ChessSoundKind) {
    const context = this.getContext();
    if (!context) return;

    // Browsers often start AudioContext suspended until a user gesture.
    // Board moves are user gestures, so resuming here is safe.
    if (context.state === 'suspended') {
      context.resume().catch(() => undefined);
    }

    if (kind === 'capture') {
      this.tick(context, 180, 0.045, 0.055);
      window.setTimeout(() => this.tick(context, 120, 0.05, 0.04), 45);
      return;
    }

    if (kind === 'error') {
      this.tick(context, 90, 0.12, 0.08);
      return;
    }

    this.tick(context, 150, 0.055, 0.05);
  }

  private getContext() {
    if (typeof window === 'undefined') return null;
    if (!this.context) {
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextCtor) return null;
      this.context = new AudioContextCtor();
    }
    return this.context;
  }

  private tick(context: AudioContext, frequency: number, durationSeconds: number, gainValue: number) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + durationSeconds + 0.02);
  }
}
