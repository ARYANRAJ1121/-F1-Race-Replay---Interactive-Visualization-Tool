/**
 * ================================================
 * F1 Race Replay - Audio Manager
 * ================================================
 * Handles synthesized engine sounds using Web Audio API.
 */

class AudioManager {
    constructor() {
        this.ctx = null;
        this.oscillator = null;
        this.gainNode = null;
        this.isMuted = false;
        this.initialized = false;
    }

    /**
     * Initialize Audio Context on user interaction
     */
    init() {
        if (this.initialized) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.initialized = true;
        } catch (e) {
            console.error('Web Audio API not supported', e);
        }
    }

    /**
     * Start engine sound
     */
    startEngine() {
        if (!this.initialized) this.init();
        if (!this.ctx) return;
        if (this.oscillator) return; // Already running

        // Create oscillator (Sawtooth for buzzy engine sound)
        this.oscillator = this.ctx.createOscillator();
        this.oscillator.type = 'sawtooth';

        // Create gain node for volume
        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.value = 0.1; // Start volume

        // Filter (Lowpass to muffle high pitch)
        this.filter = this.ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 400;

        // Connect
        this.oscillator.connect(this.filter);
        this.filter.connect(this.gainNode);
        this.gainNode.connect(this.ctx.destination);

        this.oscillator.start();
    }

    /**
     * Update engine pitch based on speed/RPM
     * @param {number} speed - Speed in km/h 
     */
    updateEngine(speed) {
        if (!this.oscillator || !this.ctx) return;

        // Base frequency ~100Hz (idle) to ~800Hz (max)
        // F1 V6 Turbo Hybrids are actually deeper/quieter but let's simulate high pitch
        const baseFreq = 80;
        const maxFreq = 600;
        const normalizedSpeed = Math.min(speed / 350, 1);

        const targetFreq = baseFreq + (normalizedSpeed * (maxFreq - baseFreq));

        // modulation (wobble)
        const time = this.ctx.currentTime;
        const wobble = Math.sin(time * 20) * 5;

        this.oscillator.frequency.setTargetAtTime(targetFreq + wobble, this.ctx.currentTime, 0.1);

        // Open modulation filter as speed increases
        this.filter.frequency.setTargetAtTime(400 + normalizedSpeed * 2000, this.ctx.currentTime, 0.1);
    }

    /**
     * Stop engine sound
     */
    stopEngine() {
        if (this.oscillator) {
            try {
                this.oscillator.stop();
                this.oscillator.disconnect();
                this.gainNode.disconnect();
            } catch (e) { /* ignore */ }
            this.oscillator = null;
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.ctx && this.gainNode) {
            this.gainNode.gain.value = this.isMuted ? 0 : 0.1;
        }
        return this.isMuted;
    }
}
