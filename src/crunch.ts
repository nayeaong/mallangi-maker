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
