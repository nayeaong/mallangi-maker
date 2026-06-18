interface Props {
  sparkle: number;
  translucency: number;
  onSparkleChange: (v: number) => void;
  onTranslucencyChange: (v: number) => void;
}

export default function FinishSelector({
  sparkle,
  translucency,
  onSparkleChange,
  onTranslucencyChange,
}: Props) {
  return (
    <section className="card option">
      <h2 className="option-title">🌟 반짝이 &amp; 투명도</h2>

      <div className="finish-row">
        <label className="finish-label">
          반짝이 <span className="count-badge">{sparkle === 0 ? '없음' : sparkle}</span>
        </label>
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={sparkle}
          onChange={(e) => onSparkleChange(Number(e.target.value))}
          className="range range--sparkle"
          aria-label="반짝이 정도"
        />
      </div>

      <div className="finish-row">
        <label className="finish-label">
          반투명 <span className="count-badge">{translucency === 0 ? '불투명' : `${translucency * 10}%`}</span>
        </label>
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={translucency}
          onChange={(e) => onTranslucencyChange(Number(e.target.value))}
          className="range range--glass"
          aria-label="반투명 정도"
        />
      </div>
    </section>
  );
}
