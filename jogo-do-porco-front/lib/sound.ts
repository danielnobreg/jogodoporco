class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume: number = 0.8;
  private muted: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      const savedVolume = parseFloat(localStorage.getItem("porco_volume") || "0.8");
      this.volume = Math.max(0, Math.min(1, isNaN(savedVolume) ? 0.8 : savedVolume));
      this.muted = localStorage.getItem("porco_muted") === "true";
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getMasterGain(): GainNode | null {
    const ctx = this.getContext();
    if (!ctx) return null;
    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      this.masterGain.connect(ctx.destination);
    }
    this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, ctx.currentTime);
    return this.masterGain;
  }

  setVolume(volume: number) {
    const clampedVolume = Math.max(0, Math.min(1, isNaN(volume) ? 0.8 : volume));
    this.volume = clampedVolume;
    if (typeof window !== "undefined") {
      localStorage.setItem("porco_volume", clampedVolume.toString());
    }
    this.getMasterGain();
  }

  getVolume(): number {
    return this.volume;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (typeof window !== "undefined") {
      localStorage.setItem("porco_muted", muted ? "true" : "false");
    }
    this.getMasterGain();
  }

  isMuted(): boolean {
    return this.muted;
  }

  playDraw() {
    try {
      const ctx = this.getContext();
      const master = this.getMasterGain();
      if (!ctx || !master) return;

      const duration = 0.18;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(400, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + duration);
      filter.Q.setValueAtTime(1.5, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(master);

      noise.start();
      noise.stop(ctx.currentTime + duration);
    } catch (e) {
      console.error("Error playing draw sound:", e);
    }
  }

  playPass() {
    try {
      const ctx = this.getContext();
      const master = this.getMasterGain();
      if (!ctx || !master) return;

      const duration = 0.15;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(master);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.error("Error playing pass sound:", e);
    }
  }

  playFreeze() {
    try {
      const ctx = this.getContext();
      const master = this.getMasterGain();
      if (!ctx || !master) return;

      const notes = [1046.5, 1318.51, 1567.98, 2093.0];
      const noteDuration = 0.1;
      const step = 0.04;

      notes.forEach((freq, index) => {
        const startTime = ctx.currentTime + index * step;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration);

        osc.connect(gain);
        gain.connect(master);

        osc.start(startTime);
        osc.stop(startTime + noteDuration);
      });
    } catch (e) {
      console.error("Error playing freeze sound:", e);
    }
  }

  playSlap() {
    try {
      const ctx = this.getContext();
      const master = this.getMasterGain();
      if (!ctx || !master) return;

      const duration = 0.25;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(280, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.6, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(master);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.error("Error playing slap sound:", e);
    }
  }

  playVictory() {
    try {
      const ctx = this.getContext();
      const master = this.getMasterGain();
      if (!ctx || !master) return;

      const arpeggioNotes = [
        { freq: 523.25, time: 0 },
        { freq: 659.25, time: 0.1 },
        { freq: 783.99, time: 0.2 },
        { freq: 1046.5, time: 0.3 },
      ];

      arpeggioNotes.forEach(({ freq, time }) => {
        const startTime = ctx.currentTime + time;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

        osc.connect(gain);
        gain.connect(master);

        osc.start(startTime);
        osc.stop(startTime + 0.25);
      });

      const chordNotes = [523.25, 659.25, 783.99, 1046.5];
      const chordStartTime = ctx.currentTime + 0.45;
      const chordDuration = 0.6;

      chordNotes.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, chordStartTime);

        gain.gain.setValueAtTime(0.2, chordStartTime);
        gain.gain.exponentialRampToValueAtTime(0.001, chordStartTime + chordDuration);

        osc.connect(gain);
        gain.connect(master);

        osc.start(chordStartTime);
        osc.stop(chordStartTime + chordDuration);
      });
    } catch (e) {
      console.error("Error playing victory sound:", e);
    }
  }

  playDefeat() {
    try {
      const ctx = this.getContext();
      const master = this.getMasterGain();
      if (!ctx || !master) return;

      const notes = [
        { freq: 440.0, time: 0 },
        { freq: 415.3, time: 0.15 },
        { freq: 392.0, time: 0.3 },
        { freq: 349.23, time: 0.45 },
      ];

      notes.forEach(({ freq, time }) => {
        const startTime = ctx.currentTime + time;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(master);

        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });

      const chordNotes = [174.61, 207.65, 261.63];
      const chordStartTime = ctx.currentTime + 0.65;
      const chordDuration = 0.8;

      chordNotes.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, chordStartTime);

        gain.gain.setValueAtTime(0.2, chordStartTime);
        gain.gain.exponentialRampToValueAtTime(0.001, chordStartTime + chordDuration);

        osc.connect(gain);
        gain.connect(master);

        osc.start(chordStartTime);
        osc.stop(chordStartTime + chordDuration);
      });
    } catch (e) {
      console.error("Error playing defeat sound:", e);
    }
  }
}

const engine = new SoundEngine();

export const sound = {
  playDraw: () => engine.playDraw(),
  playPass: () => engine.playPass(),
  playFreeze: () => engine.playFreeze(),
  playSlap: () => engine.playSlap(),
  playVictory: () => engine.playVictory(),
  playDefeat: () => engine.playDefeat(),
  setVolume: (v: number) => engine.setVolume(v),
  getVolume: () => engine.getVolume(),
  setMuted: (m: boolean) => engine.setMuted(m),
  isMuted: () => engine.isMuted(),
};

export default sound;
