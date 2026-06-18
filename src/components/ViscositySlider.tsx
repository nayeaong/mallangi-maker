interface Props {
  value: number;
  onChange: (v: number) => void;
}

// 점도 값에 따른 느낌 라벨
function viscosityLabel(v: number): string {
  if (v <= 3) return '아주 말랑 🫧';
  if (v <= 6) return '적당히 말랑 🍮';
  if (v <= 8) return '꾸덕꾸덕 🍯';
  return '아주 꾸덕 🧱';
}

export default function ViscositySlider({ value, onChange }: Props) {
  return (
    <section className="card option">
      <h2 className="option-title">
        🥄 점도 <span className="count-badge">{value}</span>
      </h2>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range"
        aria-label="점도 조절"
      />
      <div className="range-labels">
        <span>물렁물렁</span>
        <strong>{viscosityLabel(value)}</strong>
        <span>꾸덕꾸덕</span>
      </div>
    </section>
  );
}
