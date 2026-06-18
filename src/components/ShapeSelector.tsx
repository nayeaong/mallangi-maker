import type { ShapeId, ShapeOption } from '../types';

const SHAPES: ShapeOption[] = [
  { id: 'hobbang', name: '호빵', emoji: '🥟', desc: '동그랗고 빵빵' },
  { id: 'pudding', name: '푸딩', emoji: '🍮', desc: '탱글탱글' },
  { id: 'butter', name: '버터', emoji: '🧈', desc: '네모 부드러움' },
  { id: 'bear', name: '곰돌이', emoji: '🐻', desc: '귀여운 곰' },
  { id: 'cheese', name: '치즈', emoji: '🧀', desc: '네모 숭숭' },
  { id: 'corn', name: '옥수수', emoji: '🌽', desc: '오동통 알갱이' },
];

interface Props {
  value: ShapeId;
  onChange: (id: ShapeId) => void;
}

export default function ShapeSelector({ value, onChange }: Props) {
  return (
    <section className="card option">
      <h2 className="option-title">🍡 모양</h2>
      <div className="chip-grid">
        {SHAPES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`chip ${value === s.id ? 'chip--active' : ''}`}
            onClick={() => onChange(s.id)}
          >
            <span className="chip-emoji">{s.emoji}</span>
            <span className="chip-name">{s.name}</span>
            <span className="chip-desc">{s.desc}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
