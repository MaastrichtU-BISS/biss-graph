/**
 * Subtle interface sounds, synthesised so there are no audio files to load. Off unless the
 * page is opened with `?sound=1`, since many screens hang in quiet offices.
 */
const enabled = new URLSearchParams(location.search).get("sound") === "1";

let audio: AudioContext | null = null;

const context = () => {
  // browsers only allow audio after a user gesture; every sound here follows a touch
  audio ??= new AudioContext();
  if (audio.state === "suspended") void audio.resume();
  return audio;
};

/** A short sine tone gliding from `from` to `to` Hz. */
const tone = (from: number, to: number, duration: number, volume: number, delay = 0) => {
  if (!enabled) return;
  const ctx = context();
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(to, start + duration);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
};

export const sound = {
  /** Selecting a person, project or publication. */
  select: () => {
    tone(660, 880, 0.12, 0.05);
    tone(990, 1320, 0.16, 0.03, 0.06);
  },
  /** Opening a panel, drawer or sheet. */
  open: () => tone(440, 620, 0.14, 0.04),
  /** Closing or going back to the overview. */
  close: () => tone(620, 380, 0.16, 0.035),
};
