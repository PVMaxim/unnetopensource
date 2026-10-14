/**
 * SoundNotifierService — Multi-Channel Audio Chime Engine.
 *
 * BROWSER REALITY:
 * Chrome/Safari BLOCK all audio (AudioContext + HTMLAudioElement.play()) until
 * a user gesture has occurred.
 *
 * STRATEGY:
 * 1. PRIMARY: HTML5 Audio + Web Audio API (chime.wav) — auto-resumes AudioContext
 *    and plays crystal chime on transaction events.
 * 2. SECONDARY: Web Audio Synthesizer fallback if chime.wav is loading or unbuffered.
 * 3. FALLBACK: System OS notification sound via PushNotificationService.
 */

import { readEncryptedDB, writeEncryptedDB } from '@/api/indexeddb-storage';
import { STORAGE_KEYS } from '@/api/storage-keys';

export class SoundNotifier {
  private audioCtx: AudioContext | null = null;
  private chimeBuffer: AudioBuffer | null = null;
  public isUnlocked = false;
  private soundEnabled = true;

  constructor() {
    if (typeof window !== 'undefined') {
      this.attachGestureUnlock();
      this.loadSettings();
    }
  }

  private async loadSettings() {
    try {
      const saved = await readEncryptedDB(STORAGE_KEYS.SOUND_NOTIFIER_ENABLED, null);
      if (saved !== null && saved !== undefined) {
        this.soundEnabled = Boolean(saved);
      } else if (typeof localStorage !== 'undefined') {
        const local = localStorage.getItem('sound_notifier_enabled');
        if (local !== null) {
          this.soundEnabled = local === 'true';
        }
      }
    } catch {
      // ignore
    }
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public isAudioUnlocked(): boolean {
    return this.isUnlocked;
  }

  public async setEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    try {
      await writeEncryptedDB(STORAGE_KEYS.SOUND_NOTIFIER_ENABLED, enabled);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('sound_notifier_enabled', String(enabled));
      }
    } catch {
      // ignore
    }
  }

  /**
   * Called externally or on user gesture to explicitly unlock AudioContext.
   */
  public unlockAudio() {
    if (typeof window === 'undefined') return;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass && !this.audioCtx) {
        this.audioCtx = new AudioCtxClass();
      }

      const ctx = this.audioCtx;
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          this.isUnlocked = true;
          this.preloadChimeBuffer(ctx);
        }).catch(() => {});
      } else {
        this.isUnlocked = true;
        this.preloadChimeBuffer(ctx);
      }
    } catch {
      // ignore
    }
  }

  /**
   * Auto-attach to one-time user gesture to silently unlock AudioContext without playing audio.
   */
  private attachGestureUnlock() {
    const events = ['pointerdown', 'mousedown', 'click', 'touchstart', 'keydown'];
    const handler = () => {
      this.unlockAudio();
      events.forEach(evt => {
        window.removeEventListener(evt, handler, { capture: true });
      });
    };
    events.forEach(evt => {
      window.addEventListener(evt, handler, { capture: true, passive: true });
    });
  }

  /**
   * Fetch and decode /chime.wav into AudioBuffer for 0ms playback.
   */
  private async preloadChimeBuffer(ctx: AudioContext) {
    if (this.chimeBuffer) return;
    try {
      const resp = await fetch('/chime.wav');
      if (!resp.ok) return;
      const arrayBuffer = await resp.arrayBuffer();
      this.chimeBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
        try {
          const promise = ctx.decodeAudioData(
            arrayBuffer.slice(0),
            (decoded) => resolve(decoded),
            (err) => reject(err)
          );
          if (promise && typeof (promise as any).then === 'function') {
            (promise as any).then(resolve).catch(reject);
          }
        } catch (e) {
          reject(e);
        }
      });
    } catch {
      // ignore
    }
  }

  /**
   * Play the transaction chime. Safe to call from any context.
   */
  public async playTransactionChime(_notificationTitle?: string, _notificationBody?: string) {
    if (!this.soundEnabled) return;
    if (typeof window === 'undefined') return;

    // 1. Try HTML5 Audio element first
    try {
      const audioEl = new Audio('/chime.wav');
      audioEl.volume = 1.0;
      await audioEl.play();
      this.isUnlocked = true;
      return;
    } catch {
      // fall through to Web Audio API
    }

    // 2. Web Audio API
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass && !this.audioCtx) {
        this.audioCtx = new AudioCtxClass();
      }

      const ctx = this.audioCtx;
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      this.isUnlocked = true;

      if (this.chimeBuffer) {
        const source = ctx.createBufferSource();
        source.buffer = this.chimeBuffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(1.0, ctx.currentTime);
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start(0);
        return;
      }

      // 3. Fallback: Oscillator synthesis
      this.triggerChimeNodes(ctx);
    } catch (e) {
      console.warn('[SoundNotifier] Audio playback warning:', e);
    }
  }

  /**
   * Two-tone crystal bell synthesis (A5 880Hz + E6 1318.51Hz).
   */
  private triggerChimeNodes(ctx: AudioContext) {
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.75, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.45);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, now + 0.08);
    gain2.gain.setValueAtTime(0.85, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.65);
  }
}

export const soundNotifier = new SoundNotifier();
