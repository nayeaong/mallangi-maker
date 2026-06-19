import type { ToppingId, ToppingOption } from '../types';

const TOPPINGS: ToppingOption[] = [
  { id: 'star', name: '별 크런치', emoji: '⭐' },
  { id: 'button', name: '단추 크런치', emoji: '🔵' },
  { id: 'sprinkle', name: '스프링클', emoji: '🌈' },
  { id: 'heart', name: '하트 크런치', emoji: '💖' },
  { id: 'strawberry', name: '딸기 크런치', emoji: '🍓' },
  { id: 'oreo', name: '오레오 크런치', emoji: '🍪' },
  { id: 'pearl', name: '진주 크런치', emoji: '🫧' },
  { id: 'fruitring', name: '후르츠링 크런치', emoji: '🍩' },
];

interface Props {
  value: ToppingId[];
  onToggle: (id: ToppingId) => void;
}

export default function ToppingSelector({ value, onToggle }: Props) {
  return (
    <section className="card option">
      <h2 className="option-title">
        ✨ 토핑 <span className="count-badge">{value.length}</span>
      </h2>
      <div className="chip-grid">
        {TOPPINGS.map((t) => {
          const active = value.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              className={`chip ${active ? 'chip--active' : ''}`}
              onClick={() => onToggle(t.id)}
            >
              <span className="chip-check">{active ? '✓' : ''}</span>
              <span className="chip-emoji">{t.emoji}</span>
              <span className="chip-name">{t.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
