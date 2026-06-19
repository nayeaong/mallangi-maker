import {
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react';
import type { CoatingId, ShapeId, ToppingId, WaxDebrisPiece } from '../types';
import { playCrunch, playWaxBreak } from '../crunch';

interface Props {
  shape: ShapeId;
  color: string;
  toppings: ToppingId[];
  viscosity: number;
  sparkle: number; // 반짝이 정도 0~10
  translucency: number; // 반투명 정도 0~10
  coating: CoatingId; // 담그기 마감
  waxLayers?: number; // 왁스 겹수 0~10
  isWaxBroken?: boolean; // 왁스 깨짐 여부
  waxDebris?: WaxDebrisPiece[]; // 부서진 왁스 파편
  onWaxBreak?: () => void; // 왁스가 깨질 때 알림(두 손 압축)
  interactive?: boolean; // 모달의 정적 미리보기 등에서는 드래그를 끈다
  scale?: number; // 전체 크기 배율
}

type Pt = { x: number; y: number };

// 토핑/반짝이를 외곽 박스 안에서 흩뿌릴 위치(-1~1 기준의 퍼센트)
// 토핑 1개당 3자리씩(연속 3개)을 서로 멀리 떨어뜨려 골고루 퍼지게 한다.
const POSITIONS = [
  { x: 20, y: 30 }, { x: 74, y: 38 }, { x: 46, y: 74 },
  { x: 70, y: 66 }, { x: 28, y: 62 }, { x: 52, y: 22 },
  { x: 36, y: 46 }, { x: 80, y: 54 }, { x: 18, y: 44 },
  { x: 60, y: 50 }, { x: 42, y: 78 }, { x: 76, y: 26 },
];
const SPARKLE_POSITIONS = [
  { x: 28, y: 30 }, { x: 68, y: 28 }, { x: 50, y: 52 }, { x: 36, y: 66 },
  { x: 72, y: 60 }, { x: 22, y: 50 }, { x: 58, y: 40 }, { x: 44, y: 24 },
  { x: 64, y: 72 }, { x: 32, y: 44 },
];

const N = 72; // 외곽선 표본 점 개수

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return [255, 214, 232];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}
function shade([r, g, b]: [number, number, number], amt: number): [number, number, number] {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt)));
  return [c(r), c(g), c(b)];
}

// 타원 외곽 점
function ellipsePts(cx: number, cy: number, rx: number, ry: number): Pt[] {
  const a: Pt[] = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    a.push({ x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) });
  }
  return a;
}
// 슈퍼타원(둥근 사각형/정사각형) 외곽 점
function superPts(cx: number, cy: number, a: number, b: number, n: number): Pt[] {
  const r: Pt[] = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    r.push({
      x: cx + a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n),
      y: cy + b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n),
    });
  }
  return r;
}

// 다각형(사다리꼴 등)의 각 꼭짓점을 둥근 곡선으로 처리해 점 배열로 반환
function roundedPolyPts(corners: Pt[], r: number, steps = 7): Pt[] {
  const n = corners.length;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const prev = corners[(i - 1 + n) % n];
    const cur = corners[i];
    const next = corners[(i + 1) % n];
    const d1 = Math.hypot(cur.x - prev.x, cur.y - prev.y);
    const d2 = Math.hypot(next.x - cur.x, next.y - cur.y);
    const rr = Math.min(r, d1 / 2, d2 / 2);
    const v1x = (cur.x - prev.x) / d1;
    const v1y = (cur.y - prev.y) / d1;
    const v2x = (next.x - cur.x) / d2;
    const v2y = (next.y - cur.y) / d2;
    const ps = { x: cur.x - v1x * rr, y: cur.y - v1y * rr };
    const pe = { x: cur.x + v2x * rr, y: cur.y + v2y * rr };
    // ps → 꼭짓점(제어점) → pe 를 잇는 2차 베지어로 둥근 모서리 생성
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const mt = 1 - t;
      out.push({
        x: mt * mt * ps.x + 2 * mt * t * cur.x + t * t * pe.x,
        y: mt * mt * ps.y + 2 * mt * t * cur.y + t * t * pe.y,
      });
    }
  }
  return out;
}

// 모양 둘레로 캔버스에 둘 여백(이만큼은 늘려도 화면 안에 머무름)
const M = 120;
// 말랑이 표시 크기 배율
const SIZE = 1.25;

// 모양별 기하 정보(좌표계 크기, 중심, 반경, 외곽선). 중심 둘레에 M만큼 여백을 둔다.
function getGeo(shape: ShapeId) {
  const build = (hw: number, hh: number, sigma: number, make: (cx: number, cy: number) => Pt[]) => {
    const cw = 2 * hw + 2 * M;
    const ch = 2 * hh + 2 * M;
    const cx = hw + M;
    const cy = hh + M;
    return { cw, ch, cx, cy, hw, hh, sigma, pts: make(cx, cy) };
  };
  switch (shape) {
    case 'hobbang':
      return build(120, 104, 66, (cx, cy) => ellipsePts(cx, cy, 120, 104));
    case 'pudding':
      // 사다리꼴(위 64% 좁고 아래 넓음) + 꼭짓점을 크게 둥글려 진짜 푸딩처럼
      return build(118, 104, 64, (cx, cy) =>
        roundedPolyPts(
          [
            { x: cx - 118 * 0.64, y: cy - 104 },
            { x: cx + 118 * 0.64, y: cy - 104 },
            { x: cx + 118, y: cy + 104 },
            { x: cx - 118, y: cy + 104 },
          ],
          46,
        ),
      );
    case 'butter':
      return build(134, 74, 72, (cx, cy) => superPts(cx, cy, 134, 74, 4.2));
    case 'bear':
      return build(100, 92, 60, (cx, cy) => ellipsePts(cx, cy, 100, 92));
    case 'cheese':
      return build(104, 104, 64, (cx, cy) => superPts(cx, cy, 104, 104, 4));
    case 'corn':
      return build(74, 112, 60, (cx, cy) => ellipsePts(cx, cy, 74, 112));
  }
}

// 닫힌 Catmull-Rom 곡선을 부드러운 베지어 path로 변환
function toPath(pts: Pt[]): string {
  const n = pts.length;
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)} `;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} `;
  }
  return d + 'Z';
}

// 시드 기반 의사난수(렌더마다 같은 모양이 나오도록 결정적)
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 딱딱한 왁스가 깨진 듯한 불규칙·각진 파편 polygon path (시드별로 모양이 다름)
function shardPath(s: number, seed: number): string {
  const rnd = mulberry32(seed);
  const verts = 5 + Math.floor(rnd() * 3); // 5~7개의 뾰족한 꼭짓점
  let d = '';
  for (let i = 0; i < verts; i++) {
    const ang = (i / verts) * Math.PI * 2 + (rnd() - 0.5) * 0.7; // 각도에 들쭉날쭉
    const r = s * (0.45 + rnd() * 0.75); // 반경도 들쭉날쭉 → 뾰족한 결정형
    const x = Math.cos(ang) * r;
    const y = Math.sin(ang) * r;
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)} `;
  }
  return d + 'Z';
}

// 토핑 한 조각 (SVG 그룹). 중심(0,0) 기준으로 그린다.
function ToppingShape({ type }: { type: ToppingId }) {
  switch (type) {
    case 'star':
      return (
        <path
          d="M0,-15 L4.6,-4.6 L15,-3.5 L7,3.5 L9,14 L0,8.5 L-9,14 L-7,3.5 L-15,-3.5 L-4.6,-4.6 Z"
          fill="#FFD54A"
          stroke="#F2B705"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      );
    case 'button':
      return (
        <>
          <circle r="13" fill="#9FD8F2" stroke="#5FB4DE" strokeWidth="1.4" />
          <circle cx="-4" cy="-4" r="1.8" fill="#4596c4" />
          <circle cx="4" cy="-4" r="1.8" fill="#4596c4" />
          <circle cx="-4" cy="4" r="1.8" fill="#4596c4" />
          <circle cx="4" cy="4" r="1.8" fill="#4596c4" />
        </>
      );
    case 'sprinkle':
      return (
        <g strokeLinecap="round" strokeWidth="4">
          <line x1="-11" y1="-4" x2="-5" y2="-9" stroke="#FF8FA3" />
          <line x1="5" y1="-8" x2="11" y2="-3" stroke="#FFC04D" />
          <line x1="-9" y1="7" x2="-3" y2="11" stroke="#7BD88F" />
          <line x1="6" y1="5" x2="11" y2="10" stroke="#7FB3FF" />
          <line x1="-2" y1="-1" x2="3" y2="3" stroke="#C79CFF" />
        </g>
      );
    case 'heart':
      return (
        <path
          d="M0,9 C-7,3 -11,-1 -9,-5 C-7.5,-8 -3.5,-8 0,-3.5 C3.5,-8 7.5,-8 9,-5 C11,-1 7,3 0,9 Z"
          fill="#FF8FB8"
          stroke="#F2679C"
          strokeWidth="1.2"
        />
      );
    case 'strawberry':
      return (
        <>
          <path d="M0,13 C-8,13 -12,7 -12,1 C-12,-5 -6,-8 0,-8 C6,-8 12,-5 12,1 C12,7 8,13 0,13 Z" fill="#FF5E7E" stroke="#E23E63" strokeWidth="1.2" />
          <g fill="#5FBF6A">
            <path d="M0,-11 l3,5 h-6 z" />
            <path d="M-6,-9 l5,4 -6,1.5 z" />
            <path d="M6,-9 l-5,4 6,1.5 z" />
          </g>
          <g fill="#FFE08A">
            <circle cx="-3" cy="2" r="1" /><circle cx="3" cy="0" r="1" /><circle cx="0" cy="5" r="1" />
            <circle cx="5" cy="4" r="1" /><circle cx="-5" cy="6" r="1" />
          </g>
        </>
      );
    case 'oreo':
      return (
        <>
          <rect x="-14" y="-9" width="28" height="7.5" rx="3.5" fill="#3a2c2c" />
          <rect x="-12" y="-2.5" width="24" height="5" rx="2" fill="#f7eede" />
          <rect x="-14" y="2.5" width="28" height="7.5" rx="3.5" fill="#3a2c2c" />
          <g fill="#5a4444">
            <circle cx="-7" cy="-5.5" r="1" /><circle cx="0" cy="-5.5" r="1" /><circle cx="7" cy="-5.5" r="1" />
          </g>
        </>
      );
    case 'pearl':
      // 작고 둥근 진주/비즈 무리 (흰색·아이보리·연핑크) + 은은한 반짝임
      return (
        <>
          {[
            { x: -6, y: -3, r: 5.5, c: '#ffffff' },
            { x: 5, y: -5, r: 4.5, c: '#fdeef2' },
            { x: 6, y: 4, r: 6, c: '#f7f3e8' },
            { x: -4, y: 6, r: 4, c: '#ffe6ef' },
          ].map((p, i) => (
            <g key={i} transform={`translate(${p.x},${p.y})`}>
              <circle r={p.r} fill={p.c} stroke="rgba(0,0,0,0.06)" strokeWidth="0.6" />
              <circle cx={-p.r * 0.35} cy={-p.r * 0.35} r={p.r * 0.3} fill="rgba(255,255,255,0.95)" />
            </g>
          ))}
        </>
      );
    case 'fruitring':
      // 반투명한 알록달록 후르츠링(도넛/링)
      return (
        <>
          {[
            { x: -5, y: -3, c: '#ff8fb8' },
            { x: 6, y: -1, c: '#7fb3ff' },
            { x: -1, y: 6, c: '#ffd54a' },
          ].map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="6" fill="none" stroke={p.c} strokeWidth="3.4" opacity="0.6" />
          ))}
        </>
      );
  }
}

export default function MallangiPreview({
  shape,
  color,
  toppings,
  viscosity,
  sparkle,
  translucency,
  coating,
  waxLayers = 0,
  isWaxBroken = false,
  waxDebris = [],
  onWaxBreak,
  interactive = true,
  scale = 1,
}: Props) {
  const uid = useId().replace(/:/g, '');
  const geo = getGeo(shape);

  // 단일 포인터 드래그(기존) 상태
  const pullRef = useRef<Pt>({ x: 0, y: 0 }); // 현재 당김 벡터(좌표계 단위)
  const velRef = useRef<Pt>({ x: 0, y: 0 }); // 복원 스프링 속도
  const grabRef = useRef<Pt>({ x: 0, y: 0 }); // 잡은 지점(좌표계 단위)
  const draggingRef = useRef(false);
  // 여러 포인터(두 손) 추적
  const pointersRef = useRef<Map<number, Pt>>(new Map());
  const multiRef = useRef({ baseDist: 0, stretch: 0, angle: 0, mx: 0, my: 0 });
  const rectRef = useRef({ left: 0, top: 0 });
  const ratioRef = useRef({ sx: 1, sy: 1 }); // 화면px → 좌표계 변환비
  const rafRef = useRef(0);
  const brokeFiredRef = useRef(false);
  const lastDownRef = useRef(0); // 더블탭(빠르게 두 번 누르기) 감지용
  const fxKeyRef = useRef(1);
  const fxTimer = useRef<number | undefined>(undefined);
  const [fx, setFx] = useState<{ asmr: string; key: number } | null>(null);
  const [, force] = useReducer((c) => c + 1, 0);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      window.clearTimeout(fxTimer.current);
    },
    [],
  );
  // 왁스가 다시 멀쩡해지면(슬라이더 변경 등) 깨짐 1회 발동 플래그 리셋
  useEffect(() => {
    if (!isWaxBroken) brokeFiredRef.current = false;
  }, [isWaxBroken, waxLayers]);

  const pull = pullRef.current;
  const G = grabRef.current;
  const sigma = geo.sigma;

  // ── 왁스가 점도/촉감에 주는 영향(왁스가 깨지지 않은 동안만) ──
  const waxActive = waxLayers > 0 && !isWaxBroken;
  const waxStretchScale = waxActive ? Math.max(0, 1 - waxLayers / 10) : 1; // 10겹 → 0(잠금)
  const effVisc = waxActive ? Math.min(10, viscosity + waxLayers * 0.6) : viscosity; // 왁스가 더 딱딱하게

  // 점도 기반 늘어남 정도(기존 그대로) × 왁스 코팅(딱딱함)
  const viscFactor = 1.4 - (viscosity - 1) * 0.085; // v1≈1.4, v10≈0.635
  const defFactor = viscFactor * waxStretchScale; // 왁스가 두꺼울수록 덜 늘어나고 10겹이면 0
  const epx = pull.x * defFactor;
  const epy = pull.y * defFactor;
  const offset = (x: number, y: number): Pt => {
    const ddx = x - G.x;
    const ddy = y - G.y;
    const w = Math.exp(-(ddx * ddx + ddy * ddy) / (2 * sigma * sigma));
    const we = 0.05 + 0.95 * w; // 5%만 전체가 살짝 따라오게(완전 고정 방지)
    return { x: epx * we, y: epy * we };
  };

  // 외곽선 변형 → path. 캔버스(=화면 안) 밖으로 나가지 않게 좌표를 가둔다.
  const PAD = 8;
  const deformed = geo.pts.map((p) => {
    const o = offset(p.x, p.y);
    return {
      x: Math.max(PAD, Math.min(geo.cw - PAD, p.x + o.x)),
      y: Math.max(PAD, Math.min(geo.ch - PAD, p.y + o.y)),
    };
  });
  const pathD = toPath(deformed);

  // 색/투명도. 구(球)처럼 보이도록 밝은 곳/어두운 곳 대비를 키운다.
  const rgb = hexToRgb(color);
  const alpha = 1 - translucency * 0.07; // 0=1.0 ~ 10≈0.3
  const hiStop = `rgba(${shade(rgb, 60).join(',')}, ${alpha})`; // 빛 받는 가장 밝은 부분
  const lightStop = `rgba(${shade(rgb, 34).join(',')}, ${alpha})`;
  const baseStop = `rgba(${rgb.join(',')}, ${alpha})`;
  const darkStop = `rgba(${shade(rgb, -42).join(',')}, ${alpha})`; // 그늘진 부분
  // 윤곽선은 아주 옅게(말랑한 느낌). 진한 테두리 대신 음영으로 형태를 표현.
  const strokeCol = `rgba(${shade(rgb, -20).join(',')}, ${Math.min(0.32, alpha * 0.35)})`;

  // 왁스 코팅 불투명도(겹수에 따라 점점 불투명) — 색은 바꾸지 않고 위에 덮는 레이어
  const waxAlpha = Math.min(0.92, waxLayers * 0.09 + 0.04);

  // 담그기 마감 필터(질감)
  const coatFilter =
    coating === 'water'
      ? 'saturate(1.12) brightness(1.04)'
      : coating === 'powder'
        ? 'saturate(0.9) brightness(1.06)'
        : '';
  const svgStyle: CSSProperties = {
    overflow: 'visible',
    display: 'block',
    width: '100%',
    height: 'auto',
    filter: `drop-shadow(0 14px 20px rgba(0,0,0,0.16)) ${coatFilter}`.trim(),
    cursor: interactive ? (draggingRef.current ? 'grabbing' : 'grab') : 'default',
    touchAction: 'none',
  };

  // 좌표계 도우미: -1~1 퍼센트 위치를 캔버스 좌표로
  const place = (px: number, py: number): Pt => ({
    x: geo.cx + ((px / 100) * 2 - 1) * geo.hw * 0.9,
    y: geo.cy + ((py / 100) * 2 - 1) * geo.hh * 0.9,
  });
  // 위치 + 변형오프셋을 합친 translate 문자열
  const placed = (px: number, py: number) => {
    const b = place(px, py);
    const o = offset(b.x, b.y);
    return `translate(${(b.x + o.x).toFixed(2)}, ${(b.y + o.y).toFixed(2)})`;
  };
  const anchored = (x: number, y: number) => {
    const o = offset(x, y);
    return `translate(${(x + o.x).toFixed(2)}, ${(y + o.y).toFixed(2)})`;
  };

  const toppingInstances = toppings.flatMap((t, ti) =>
    [0, 1, 2].map((k) => ({ type: t, key: `${t}-${k}`, p: POSITIONS[(ti * 3 + k) % POSITIONS.length] })),
  );
  const sparkleInstances = SPARKLE_POSITIONS.slice(0, sparkle);

  const clipId = `clip-${uid}`;
  const bodyId = `body-${uid}`;
  const glossId = `gloss-${uid}`;

  // ── 두 손(멀티포인터) 변형 transform ──
  const multiActive = pointersRef.current.size >= 2;
  const m = multiRef.current;
  const ma = (m.angle * 180) / Math.PI;
  const msx = 1 + m.stretch;
  const msy = 1 - m.stretch * 0.4;
  const multiTransform = `translate(${m.mx.toFixed(2)}px, ${m.my.toFixed(2)}px) rotate(${ma.toFixed(2)}deg) scale(${msx.toFixed(3)}, ${msy.toFixed(3)}) rotate(${(-ma).toFixed(2)}deg) translate(${(-m.mx).toFixed(2)}px, ${(-m.my).toFixed(2)}px)`;
  const mDur = (0.35 + effVisc * 0.09).toFixed(2);
  const mOver = (2.2 - effVisc * 0.13).toFixed(2);
  const wrapStyle: CSSProperties = {
    transform: multiTransform,
    transition: multiActive ? 'none' : `transform ${mDur}s cubic-bezier(0.34, ${mOver}, 0.3, 1)`,
  };

  // ── 포인터 좌표 변환 ──
  const toCanvas = (clientX: number, clientY: number): Pt => ({
    x: (clientX - rectRef.current.left) * ratioRef.current.sx,
    y: (clientY - rectRef.current.top) * ratioRef.current.sy,
  });

  // 두 손 압축으로 왁스가 깨질 때
  const triggerBreak = () => {
    onWaxBreak?.();
    playWaxBreak(waxLayers); // "뿌짝" — 겹수↑ 일수록 더 묵직하게
    const words = ['파삭', '쩍', '콰작', '우두둑'];
    const w = words[Math.floor(Math.random() * words.length)];
    setFx({ asmr: w, key: fxKeyRef.current++ });
    window.clearTimeout(fxTimer.current);
    fxTimer.current = window.setTimeout(() => setFx(null), 1000);
  };

  // 단일 포인터 드래그 갱신(기존 촉감 유지)
  const updateSingle = () => {
    const p = pointersRef.current.values().next().value;
    if (!p) return;
    let px = p.x - grabRef.current.x;
    let py = p.y - grabRef.current.y;
    const cap = (M - 16) * Math.min(1, defFactor);
    const maxPull = defFactor > 0.001 ? cap / defFactor : 0;
    const mag = Math.hypot(px, py);
    if (maxPull === 0) {
      px = 0;
      py = 0;
    } else if (mag > maxPull) {
      px *= maxPull / mag;
      py *= maxPull / mag;
    }
    pullRef.current = { x: px, y: py };
  };

  // 두 손 변형 갱신
  const updateMulti = () => {
    const arr = Array.from(pointersRef.current.values());
    const a = arr[0];
    const b = arr[1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return;
    if (m.baseDist === 0) m.baseDist = d;
    m.mx = (a.x + b.x) / 2;
    m.my = (a.y + b.y) / 2;
    m.angle = Math.atan2(dy, dx);
    const ratio = (d - m.baseDist) / m.baseDist; // 벌리면 +, 모으면 -
    const softness = 0.4 + 0.4 * (viscFactor / 1.4);
    m.stretch = Math.max(-0.5, Math.min(0.9, ratio)) * softness * waxStretchScale;
    // 압축(squeeze)이 임계를 넘으면 왁스가 깨짐
    const squeeze = m.baseDist - d;
    if (onWaxBreak && waxLayers >= 1 && !isWaxBroken && !brokeFiredRef.current && squeeze > Math.max(22, m.baseDist * 0.1)) {
      brokeFiredRef.current = true;
      triggerBreak();
    }
  };

  // 모두 떼면 점도 기반 스프링으로 복원(기존 로직 + 왁스 반영 effVisc)
  const startSpring = () => {
    const stiff = 0.3 - effVisc * 0.022;
    const damp = 0.9 - effVisc * 0.045;
    const step = () => {
      const p = pullRef.current;
      const v = velRef.current;
      v.x += -stiff * p.x;
      v.y += -stiff * p.y;
      v.x *= damp;
      v.y *= damp;
      p.x += v.x;
      p.y += v.y;
      force();
      if (Math.abs(p.x) < 0.3 && Math.abs(p.y) < 0.3 && Math.abs(v.x) < 0.3 && Math.abs(v.y) < 0.3) {
        pullRef.current = { x: 0, y: 0 };
        velRef.current = { x: 0, y: 0 };
        force();
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  };

  // ── 포인터 이벤트(여러 포인터 동시 추적) ──
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const r = el.getBoundingClientRect();
    rectRef.current = { left: r.left, top: r.top };
    ratioRef.current = { sx: geo.cw / r.width, sy: geo.ch / r.height };
    pointersRef.current.set(e.pointerId, toCanvas(e.clientX, e.clientY));
    cancelAnimationFrame(rafRef.current);
    velRef.current = { x: 0, y: 0 };
    playCrunch(toppings.length); // 만질 때마다 콰작
    // 어디서나(마우스 포함) 깨뜨릴 수 있게: 빠르게 두 번 누르면(더블탭/더블클릭) 왁스가 깨진다
    const downAt = performance.now();
    if (onWaxBreak && waxLayers >= 1 && !isWaxBroken && !brokeFiredRef.current && downAt - lastDownRef.current < 400) {
      brokeFiredRef.current = true;
      triggerBreak();
    }
    lastDownRef.current = downAt;
    if (pointersRef.current.size >= 2) {
      // 두 손 모드 진입
      draggingRef.current = false;
      pullRef.current = { x: 0, y: 0 };
      m.baseDist = 0;
    } else {
      // 한 손 드래그(기존)
      grabRef.current = { ...pointersRef.current.get(e.pointerId)! };
      pullRef.current = { x: 0, y: 0 };
      draggingRef.current = true;
    }
    force();
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, toCanvas(e.clientX, e.clientY));
    if (pointersRef.current.size >= 2) updateMulti();
    else if (draggingRef.current) updateSingle();
    force();
  };
  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.delete(e.pointerId);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    const size = pointersRef.current.size;
    if (size >= 2) {
      m.baseDist = 0; // 남은 두 손가락 기준 재설정
    } else if (size === 1) {
      // 2→1: 두 손 변형은 복원하고, 남은 손가락으로 한 손 드래그 이어가기
      m.stretch = 0;
      m.baseDist = 0;
      grabRef.current = { ...pointersRef.current.values().next().value! };
      pullRef.current = { x: 0, y: 0 };
      draggingRef.current = true;
    } else {
      // 모두 뗌 → 복원
      draggingRef.current = false;
      m.stretch = 0;
      startSpring();
    }
    force();
  };

  // 곰돌이 귀 y 위치(캔버스 좌표)
  const earY = geo.cy - 74;

  return (
    <div className="stage" style={scale !== 1 ? { transform: `scale(${scale})` } : undefined}>
      <div
        className="blob-canvas"
        style={{ width: geo.cw * SIZE, maxWidth: '100%' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <svg width={geo.cw} height={geo.ch} viewBox={`0 0 ${geo.cw} ${geo.ch}`} style={svgStyle}>
          <defs>
            <clipPath id={clipId}>
              <path d={pathD} />
            </clipPath>
            {/* 좌상단에서 빛을 받는 구형 음영(입체감) */}
            <radialGradient id={bodyId} cx="36%" cy="30%" r="78%">
              <stop offset="0%" stopColor={hiStop} />
              <stop offset="32%" stopColor={lightStop} />
              <stop offset="68%" stopColor={baseStop} />
              <stop offset="100%" stopColor={darkStop} />
            </radialGradient>
            <radialGradient id={glossId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
            {/* 아래쪽 그늘(앰비언트 오클루전)로 부피감 강조 */}
            <radialGradient id={`shade-${uid}`} cx="50%" cy="92%" r="65%">
              <stop offset="0%" stopColor="rgba(0,0,0,0.22)" />
              <stop offset="55%" stopColor="rgba(0,0,0,0.06)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
          </defs>

          {/* 두 손으로 잡으면 본체 전체가 늘어나거나 눌리는 변형(기존 촉감 위에 얹음) */}
          <g style={wrapStyle}>
            {/* 곰돌이 귀(몸통 뒤에 그려서 자연스럽게 붙음) */}
            {shape === 'bear' && (
              <>
                <g transform={anchored(geo.cx - 66, earY)}>
                  <circle r="36" fill={baseStop} stroke={strokeCol} strokeWidth="1" />
                </g>
                <g transform={anchored(geo.cx + 66, earY)}>
                  <circle r="36" fill={baseStop} stroke={strokeCol} strokeWidth="1" />
                </g>
              </>
            )}

            {/* 본체 */}
            <path d={pathD} fill={`url(#${bodyId})`} stroke={strokeCol} strokeWidth="1" />

            {/* 본체 모양으로 클립되는 내부 요소들 */}
            <g clipPath={`url(#${clipId})`}>
              {/* 아래쪽 그늘로 부피감 */}
              <rect x="0" y="0" width={geo.cw} height={geo.ch} fill={`url(#shade-${uid})`} />
              {/* 옥수수 알갱이 무늬 */}
              {shape === 'corn' &&
                Array.from({ length: 11 }).map((_, row) =>
                  Array.from({ length: 5 }).map((__, col) => {
                    const x = geo.cx - 60 + col * 30 + (row % 2 ? 15 : 0);
                    const y = geo.cy - 110 + row * 21;
                    return (
                      <g key={`k-${row}-${col}`} transform={anchored(x, y)}>
                        <ellipse rx="11" ry="9" fill="rgba(255,255,255,0.32)" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
                      </g>
                    );
                  }),
                )}

              {/* 치즈 구멍 */}
              {shape === 'cheese' && (
                <>
                  {[
                    { x: -34, y: -28, r: 14 }, { x: 30, y: -38, r: 9 }, { x: 6, y: 18, r: 16 },
                    { x: 44, y: 30, r: 10 }, { x: -30, y: 36, r: 8 },
                  ].map((h, i) => (
                    <g key={`h-${i}`} transform={anchored(geo.cx + h.x, geo.cy + h.y)}>
                      <circle r={h.r} fill="rgba(0,0,0,0.16)" />
                      <circle r={h.r} cy="-1.5" fill="rgba(0,0,0,0.10)" />
                    </g>
                  ))}
                </>
              )}

              {/* 광택(파우더면 흐리게) */}
              <g transform={anchored(geo.cx - geo.hw * 0.32, geo.cy - geo.hh * 0.42)} opacity={coating === 'powder' ? 0.22 : 1}>
                <ellipse rx={geo.hw * 0.42} ry={geo.hh * 0.3} fill={`url(#${glossId})`} />
              </g>

              {/* 담그기: 물 = 촉촉한 강한 윤기/반사 */}
              {coating === 'water' && (
                <>
                  <g transform={anchored(geo.cx - geo.hw * 0.28, geo.cy - geo.hh * 0.42)}>
                    <ellipse rx={geo.hw * 0.52} ry={geo.hh * 0.36} fill={`url(#${glossId})`} />
                  </g>
                  <g transform={anchored(geo.cx + geo.hw * 0.34, geo.cy + geo.hh * 0.34)}>
                    <ellipse rx={geo.hw * 0.28} ry={geo.hh * 0.18} fill={`url(#${glossId})`} opacity="0.8" />
                  </g>
                  <rect x="0" y="0" width={geo.cw} height={geo.ch} fill="rgba(255,255,255,0.1)" />
                </>
              )}
              {/* 담그기: 파우더 = 뽀얀 매트 베일 + 미세 입자 */}
              {coating === 'powder' && (
                <>
                  <rect x="0" y="0" width={geo.cw} height={geo.ch} fill="rgba(255,255,255,0.34)" />
                  {Array.from({ length: 90 }).map((_, i) => {
                    const x = (i * 53) % geo.cw;
                    const y = (i * 97) % geo.ch;
                    return <circle key={`pw-${i}`} cx={x} cy={y} r="0.9" fill="rgba(255,255,255,0.7)" />;
                  })}
                </>
              )}

              {/* 곰돌이 얼굴 */}
              {shape === 'bear' && (
                <>
                  <g transform={anchored(geo.cx - 30, geo.cy - 6)}>
                    <ellipse rx="7" ry="9" fill="#5b4636" />
                  </g>
                  <g transform={anchored(geo.cx + 30, geo.cy - 6)}>
                    <ellipse rx="7" ry="9" fill="#5b4636" />
                  </g>
                  <g transform={anchored(geo.cx, geo.cy + 24)}>
                    <ellipse rx="33" ry="24" fill="rgba(255,255,255,0.5)" />
                    <ellipse cy="-6" rx="8" ry="5.5" fill="#5b4636" />
                  </g>
                </>
              )}

              {/* 반짝이 */}
              {sparkleInstances.map((p, i) => (
                <g key={`sp-${i}`} transform={placed(p.x, p.y)}>
                  <path
                    className="sparkle-svg"
                    style={{ animationDelay: `${(i % 5) * 0.3}s` }}
                    d="M0,-7 L1.8,-1.8 L7,0 L1.8,1.8 L0,7 L-1.8,1.8 L-7,0 L-1.8,-1.8 Z"
                    fill="#fff"
                  />
                </g>
              ))}

              {/* 토핑 */}
              {toppingInstances.map((inst) => (
                <g key={inst.key} transform={placed(inst.p.x, inst.p.y)}>
                  <ToppingShape type={inst.type} />
                </g>
              ))}

              {/* 왁스 코팅(겹수만큼 불투명. 색은 안 바꾸고 위에 덮는 레이어) */}
              {waxActive && (
                <>
                  <rect x="0" y="0" width={geo.cw} height={geo.ch} fill={`rgba(245,240,228,${waxAlpha.toFixed(2)})`} />
                  <g transform={anchored(geo.cx - geo.hw * 0.3, geo.cy - geo.hh * 0.4)}>
                    <ellipse rx={geo.hw * 0.5} ry={geo.hh * 0.34} fill="rgba(255,255,255,0.25)" />
                  </g>
                </>
              )}
            </g>

            {/* 옥수수 껍질잎(맨 아래) */}
            {shape === 'corn' && (
              <g transform={anchored(geo.cx, geo.cy + geo.hh - 6)}>
                <ellipse cx="-15" cy="22" rx="12" ry="28" fill="#7cc85f" transform="rotate(20 -15 22)" />
                <ellipse cx="15" cy="22" rx="12" ry="28" fill="#6cbf57" transform="rotate(-20 15 22)" />
              </g>
            )}
          </g>

          {/* 왁스 깨짐 균열 플래시 */}
          {fx && (
            <g key={`crack-${fx.key}`} className="wax-crack" transform={`translate(${geo.cx}, ${geo.cy})`}>
              {[0, 52, 104, 156, 208, 260, 312].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const r2 = Math.min(geo.hw, geo.hh) * 0.95;
                return (
                  <line
                    key={deg}
                    x1={Math.cos(rad) * 8}
                    y1={Math.sin(rad) * 8}
                    x2={Math.cos(rad) * r2}
                    y2={Math.sin(rad) * r2}
                    stroke="rgba(255,255,255,0.95)"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                  />
                );
              })}
            </g>
          )}

          {/* 부서진 왁스 파편(깨진 뒤 남아 있음) */}
          {isWaxBroken &&
            waxDebris.map((d) => (
              <g key={`db-${d.id}`} transform={`${placed(d.x, d.y)} rotate(${d.rot})`}>
                <path d={shardPath(d.size, d.seed)} fill="rgba(248,244,233,0.92)" stroke="rgba(206,196,176,0.75)" strokeWidth="0.7" strokeLinejoin="round" />
                <path d={shardPath(d.size * 0.5, d.seed)} fill="rgba(255,255,255,0.5)" />
              </g>
            ))}
        </svg>

        {/* 왁스 깨짐 ASMR 텍스트 */}
        {fx && (
          <span key={`asmr-${fx.key}`} className="asmr-pop">
            {fx.asmr}
          </span>
        )}
      </div>
    </div>
  );
}
