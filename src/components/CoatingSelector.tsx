import type { CoatingId } from '../types';

const COATINGS: { id: CoatingId; name: string; emoji: string; desc: string }[] = [
  { id: 'none', name: '그대로', emoji: '🍥', desc: '기본 마감' },
  { id: 'water', name: '물에 담그기', emoji: '💧', desc: '미끌하고 윤기' },
  { id: 'powder', name: '파우더 묻히기', emoji: '🌫️', desc: '뽀송뽀송 매트' },
];

interface Props {
  value: CoatingId;
  onChange: (id: CoatingId) => void;
}

export default function CoatingSelector({ value, onChange }: Props) {
  return (
    <section className="card option">
      <h2 className="option-title">🛁 담그기</h2>
      <div className="coat-grid">
        {COATINGS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`chip ${value === c.id ? 'chip--active' : ''}`}
            onClick={() => onChange(c.id)}
          >
            <span className="chip-emoji">{c.emoji}</span>
            <span className="chip-name">{c.name}</span>
            <span className="chip-desc">{c.desc}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
