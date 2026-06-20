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

    const now = context.currentTime;

    if (kind === 'move') {
      this.tone(context, {
        type: 'triangle',
        startFrequency: 860,
        endFrequency: 540,
        duration: 0.045,
        peakGain: 0.035,
        startTime: now,
      });
      return;
    }

    if (kind === 'capture') {
      this.tone(context, {
        type: 'square',
        startFrequency: 190,
        endFrequency: 120,
        duration: 0.07,
        peakGain: 0.045,
        startTime: now,
      });
      this.tone(context, {
        type: 'triangle',
        startFrequency: 620,
        endFrequency: 340,
        duration: 0.045,
        peakGain: 0.028,
        startTime: now + 0.025,
      });
      return;
    }

    this.tone(context, {
      type: 'sawtooth',
      startFrequency: 180,
      endFrequency: 88,
      duration: 0.11,
      peakGain: 0.035,
      startTime: now,
    });
    this.tone(context, {
      type: 'square',
      startFrequency: 230,
      endFrequency: 105,
      duration: 0.09,
      peakGain: 0.018,
      startTime: now + 0.012,
    });
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

  private tone(
    context: AudioContext,
    options: {
      type: OscillatorType;
      startFrequency: number;
      endFrequency: number;
      duration: number;
      peakGain: number;
      startTime: number;
    },
  ) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = Math.max(context.currentTime, options.startTime);
    const end = start + options.duration;

    oscillator.type = options.type;
    oscillator.frequency.setValueAtTime(options.startFrequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, end);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(options.peakGain, start + 0.006);
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
}
