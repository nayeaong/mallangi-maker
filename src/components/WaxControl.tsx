interface Props {
  value: number;
  onChange: (v: number) => void;
}

export default function WaxControl({ value, onChange }: Props) {
  return (
    <section className="card option">
      <h2 className="option-title">
        🕯️ 왁스 바르기 <span className="count-badge">{value === 0 ? '없음' : `${value}겹`}</span>
      </h2>
      <input
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range range--wax"
        aria-label="왁스 겹수"
      />
      <div className="range-labels">
        <span>안 바름</span>
        <strong>{value === 0 ? '왁스 없음' : `왁스 ${value}겹`}</strong>
        <span>두껍게</span>
      </div>
    </section>
  );
}
