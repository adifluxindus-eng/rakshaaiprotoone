class EmergencyAlarmAudio {
  private ctx: AudioContext | null = null;
  private intervalId: number | null = null;
  private isPlaying = false;

  public unlock() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public start() {
    if (this.isPlaying) return;
    this.unlock();
    if (!this.ctx) return;

    this.isPlaying = true;
    let highTone = true;

    const pulse = () => {
      if (!this.ctx || !this.isPlaying) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(highTone ? 880 : 660, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.18, this.ctx.currentTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.42);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.44);
        highTone = !highTone;
      } catch {
        // Ignore if browser blocks audio before first gesture
      }
    };

    pulse();
    this.intervalId = window.setInterval(pulse, 520);
  }

  public stop() {
    this.isPlaying = false;
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public get playing() {
    return this.isPlaying;
  }
}

export const emergencyAlarm = new EmergencyAlarmAudio();
