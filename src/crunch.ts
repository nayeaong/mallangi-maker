// "콰작" 크런치 효과음을 Web Audio로 합성한다(외부 파일 없음).
// intensity(=크런치 개수)가 클수록 더 크고 자글자글하게 들린다.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
  }
  return ctx;
}

export function playCrunch(intensity: number) {
  if (intensity <= 0) return; // 크런치가 없으면 소리도 없음
  const ac = getCtx();
  if (ac.state === 'suspended') void ac.resume(); // 사용자 제스처(터치) 시 깨우기

  const now = ac.currentTime;
  // 여러 개의 짧고 밝은 알갱이를 촘촘히 겹쳐 "자글자글한" 바삭함을 만든다
  const grains = 5 + intensity * 2; // 7 ~ 13개
  const baseGain = Math.min(0.42, 0.1 + intensity * 0.06);

  // 공통 하이패스: 저음 먹먹함(뭉툭함)을 제거해 또렷하게
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 900;
  const out = ac.createGain();
  out.gain.value = 1;
  hp.connect(out);
  out.connect(ac.destination);

  for (let i = 0; i < grains; i++) {
    const t = now + i * (0.006 + Math.random() * 0.008) + Math.random() * 0.004;
    const dur = 0.012 + Math.random() * 0.03; // 아주 짧게 → 바삭한 클릭들

    // 점점 작아지는 잡음(부서지는 소리). 약간의 톤 변화를 줘 자연스럽게.
    const len = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buffer = ac.createBuffer(1, len, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let j = 0; j < len; j++) {
      const env = Math.pow(1 - j / len, 2); // 빠른 감쇠 → 또렷한 어택
      data[j] = (Math.random() * 2 - 1) * env;
    }

    const src = ac.createBufferSource();
    src.buffer = buffer;

    // 고역대 밴드패스 + 적당한 공진으로 "바삭/콰작"한 음색
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2600 + Math.random() * 4200;
    bp.Q.value = 1.6 + Math.random() * 1.4;

    const g = ac.createGain();
    const peak = baseGain * (0.55 + Math.random() * 0.7);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.0015); // 날카로운 어택
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(bp);
    bp.connect(g);
    g.connect(hp);
    src.start(t);
    src.stop(t + dur);
  }
}

// 왁스 깨짐 "뿌짝" 소리. 겹수(layers)가 많을수록 더 낮고 묵직하며 되직하게 들린다.
export function playWaxBreak(layers: number) {
  if (layers <= 0) return;
  const ac = getCtx();
  if (ac.state === 'suspended') void ac.resume();
  const now = ac.currentTime;
  const heavy = Math.min(1, layers / 10); // 0.1~1 (두꺼울수록 묵직)

  // ── 묵직한 몸통(뿌): 저역 노이즈 — 겹수↑ → 더 먹먹하고 길고 큼 ──
  const bodyDur = 0.14 + layers * 0.022;
  const bodyLen = Math.max(1, Math.floor(ac.sampleRate * bodyDur));
  const buf = ac.createBuffer(1, bodyLen, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bodyLen; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bodyLen, 1.6);
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2200 - layers * 150; // 겹수↑ → 더 묵직
  lp.Q.value = 0.7;
  const bg = ac.createGain();
  const bodyGain = 0.18 + heavy * 0.4;
  bg.gain.setValueAtTime(0, now);
  bg.gain.linearRampToValueAtTime(bodyGain, now + 0.006);
  bg.gain.exponentialRampToValueAtTime(0.0001, now + bodyDur);
  src.connect(lp);
  lp.connect(bg);
  bg.connect(ac.destination);
  src.start(now);
  src.stop(now + bodyDur);

  // ── 저음 thud(되직한 무게감): 겹수↑ → 더 낮은 음 ──
  const osc = ac.createOscillator();
  osc.type = 'sine';
  const f0 = 150 - layers * 8; // 1→142Hz, 10→70Hz
  osc.frequency.setValueAtTime(f0 * 1.6, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, f0 * 0.6), now + bodyDur * 0.9);
  const og = ac.createGain();
  const thudGain = 0.1 + heavy * 0.5;
  og.gain.setValueAtTime(0, now);
  og.gain.linearRampToValueAtTime(thudGain, now + 0.008);
  og.gain.exponentialRampToValueAtTime(0.0001, now + bodyDur);
  osc.connect(og);
  og.connect(ac.destination);
  osc.start(now);
  osc.stop(now + bodyDur);

  // ── 날카로운 깨짐(짝): 짧고 밝은 노이즈 그레인 ──
  const grains = 3 + Math.round(layers * 0.5);
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1400;
  hp.connect(ac.destination);
  for (let i = 0; i < grains; i++) {
    const t = now + 0.005 + i * (0.01 + Math.random() * 0.012);
    const dur = 0.02 + Math.random() * 0.03;
    const len = Math.max(1, Math.floor(ac.sampleRate * dur));
    const b = ac.createBuffer(1, len, ac.sampleRate);
    const d = b.getChannelData(0);
    for (let j = 0; j < len; j++) d[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / len, 2);
    const s = ac.createBufferSource();
    s.buffer = b;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2200 + Math.random() * 3500;
    bp.Q.value = 1.4;
    const g = ac.createGain();
    const peak = (0.12 + heavy * 0.14) * (0.6 + Math.random() * 0.6);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bp);
    bp.connect(g);
    g.connect(hp);
    s.start(t);
    s.stop(t + dur);
  }
}
