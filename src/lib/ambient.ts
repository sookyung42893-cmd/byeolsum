/**
 * 별똥별 관측용 잔잔한 배경 음악. 음원 파일 없이 Web Audio로 바로 만든다.
 * 부드러운 화음 패드가 천천히 바뀌고, 그 위로 작은 종소리가 가끔 반짝인다.
 * 브라우저 정책상 버튼 클릭 같은 사용자 동작 안에서 start()를 불러야 소리가 난다.
 */

const MASTER = 0.14;
const CHORD_SECONDS = 9;

// C장조 주변의 편안한 화음들 (Hz)
const CHORDS: number[][] = [
  [130.81, 196.0, 246.94, 329.63], // Cmaj7
  [110.0, 164.81, 246.94, 261.63], // Am9 느낌
  [87.31, 174.61, 220.0, 329.63], // Fmaj7
  [98.0, 146.83, 220.0, 293.66], // Gsus
];
// 종소리용 높은 펜타토닉 음
const BELLS = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66];

export interface Ambient {
  start: () => void;
  stop: () => void;
  /** 기록할 때 한 번 울리는 맑은 종소리 */
  chime: () => void;
}

export function createAmbient(): Ambient {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let echo: GainNode | null = null;
  let timers: number[] = [];
  let chordIdx = 0;

  const clearTimers = () => {
    timers.forEach((t) => window.clearTimeout(t));
    timers = [];
  };

  const ensure = () => {
    if (ctx) return ctx;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // 간단한 메아리(딜레이 피드백)로 공간감
    const delay = ctx.createDelay(2);
    delay.delayTime.value = 0.42;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.38;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2400;
    echo = ctx.createGain();
    echo.gain.value = 0.5;
    echo.connect(delay);
    delay.connect(tone);
    tone.connect(feedback);
    feedback.connect(delay);
    tone.connect(master);
    return ctx;
  };

  const playChord = () => {
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const dur = CHORD_SECONDS + 3; // 다음 화음과 겹치게
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    filter.connect(master);
    CHORDS[chordIdx % CHORDS.length].forEach((freq, i) => {
      [-4, 4].forEach((detune) => {
        const osc = ctx!.createOscillator();
        osc.type = i === 0 ? 'sine' : 'triangle';
        osc.frequency.value = freq;
        osc.detune.value = detune;
        const g = ctx!.createGain();
        const peak = i === 0 ? 0.16 : 0.07;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(peak, now + 3);
        g.gain.setValueAtTime(peak, now + dur - 4);
        g.gain.linearRampToValueAtTime(0, now + dur);
        osc.connect(g);
        g.connect(filter);
        osc.start(now);
        osc.stop(now + dur + 0.1);
      });
    });
    chordIdx++;
    timers.push(window.setTimeout(playChord, CHORD_SECONDS * 1000));
  };

  const bell = (freq: number, level: number) => {
    if (!ctx || !master || !echo) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const shimmer = ctx.createOscillator();
    shimmer.type = 'sine';
    shimmer.frequency.value = freq * 2.01;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(level, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);
    const g2 = ctx.createGain();
    g2.gain.value = 0.25;
    osc.connect(g);
    shimmer.connect(g2);
    g2.connect(g);
    g.connect(master);
    g.connect(echo);
    osc.start(now);
    shimmer.start(now);
    osc.stop(now + 3.6);
    shimmer.stop(now + 3.6);
  };

  const scheduleBells = () => {
    const wait = 2200 + Math.random() * 3800;
    timers.push(
      window.setTimeout(() => {
        bell(BELLS[Math.floor(Math.random() * BELLS.length)], 0.05 + Math.random() * 0.04);
        scheduleBells();
      }, wait),
    );
  };

  return {
    start() {
      const c = ensure();
      void c.resume();
      if (timers.length) return; // 이미 재생 중
      master!.gain.cancelScheduledValues(c.currentTime);
      master!.gain.setValueAtTime(master!.gain.value, c.currentTime);
      master!.gain.linearRampToValueAtTime(MASTER, c.currentTime + 4);
      playChord();
      scheduleBells();
    },
    stop() {
      clearTimers();
      if (!ctx || !master) return;
      const c = ctx;
      master.gain.cancelScheduledValues(c.currentTime);
      master.gain.setValueAtTime(master.gain.value, c.currentTime);
      master.gain.linearRampToValueAtTime(0, c.currentTime + 2.5);
      const closing = c;
      ctx = null;
      master = null;
      echo = null;
      window.setTimeout(() => void closing.close(), 3000);
    },
    chime() {
      if (!ctx || !timers.length) return;
      bell(1046.5, 0.08);
      window.setTimeout(() => bell(1567.98, 0.05), 140);
    },
  };
}

const PREF_KEY = 'byeolsum:music';

export function loadMusicPref(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function saveMusicPref(on: boolean) {
  try {
    localStorage.setItem(PREF_KEY, on ? 'on' : 'off');
  } catch {
    /* 저장 못 해도 이번 화면에서는 동작한다 */
  }
}
