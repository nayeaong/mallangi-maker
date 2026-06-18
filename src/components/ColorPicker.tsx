interface Props {
  value: string;
  onChange: (hex: string) => void;
}

// 빠르게 고를 수 있는 파스텔 프리셋
const PRESETS = ['#FFD6E8', '#FF9FCF', '#D9C7FF', '#BDF7E2', '#FFE89A', '#C2E9FF'];

export default function ColorPicker({ value, onChange }: Props) {
  return (
    <section className="card option">
      <h2 className="option-title">🎨 색깔</h2>
      <div className="color-row">
        <label className="color-input-wrap">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label="말랑이 색상 선택"
          />
        </label>
        <span className="hex-value">{value.toUpperCase()}</span>
      </div>
      <div className="preset-row">
        {PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            className={`swatch ${value.toUpperCase() === c.toUpperCase() ? 'swatch--active' : ''}`}
            style={{ background: c }}
            onClick={() => onChange(c)}
            aria-label={`색상 ${c}`}
          />
        ))}
      </div>
    </section>
  );
}
