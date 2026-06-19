import { useState } from 'react';
import MallangiPreview from './components/MallangiPreview';
import ShapeSelector from './components/ShapeSelector';
import ColorPicker from './components/ColorPicker';
import FinishSelector from './components/FinishSelector';
import CoatingSelector from './components/CoatingSelector';
import ToppingSelector from './components/ToppingSelector';
import ViscositySlider from './components/ViscositySlider';
import WaxControl from './components/WaxControl';
import CompleteModal from './components/CompleteModal';
import { DEFAULT_CONFIG, type CoatingId, type ShapeId, type ToppingId, type WaxDebrisPiece } from './types';

// 왁스 깨짐 시 파편 생성(겹수가 많을수록 더 많고 큰 조각)
function makeWaxDebris(layers: number): WaxDebrisPiece[] {
  const n = Math.round(6 + layers * 2);
  const base = 5 + layers * 1.6;
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    x: 10 + Math.random() * 80,
    y: 8 + Math.random() * 84,
    size: base * (0.6 + Math.random() * 0.9),
    rot: Math.random() * 360,
    seed: Math.floor(Math.random() * 4294967296),
  }));
}

export default function App() {
  // ── 말랑이 설정 상태 ──
  const [selectedShape, setSelectedShape] = useState<ShapeId>(DEFAULT_CONFIG.shape);
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_CONFIG.color);
  const [selectedToppings, setSelectedToppings] = useState<ToppingId[]>(DEFAULT_CONFIG.toppings);
  const [viscosity, setViscosity] = useState<number>(DEFAULT_CONFIG.viscosity);
  const [sparkle, setSparkle] = useState<number>(DEFAULT_CONFIG.sparkle);
  const [translucency, setTranslucency] = useState<number>(DEFAULT_CONFIG.translucency);
  const [coating, setCoating] = useState<CoatingId>(DEFAULT_CONFIG.coating);
  // ── 왁스 ──
  const [waxLayers, setWaxLayers] = useState<number>(DEFAULT_CONFIG.waxLayers);
  const [isWaxBroken, setWaxBroken] = useState<boolean>(DEFAULT_CONFIG.isWaxBroken);
  const [waxDebris, setWaxDebris] = useState<WaxDebrisPiece[]>(DEFAULT_CONFIG.waxDebris);

  // 슬라이더로 왁스 겹수를 바꾸면 새 코팅 상태로 초기화(깨짐/파편 리셋)
  const changeWax = (v: number) => {
    setWaxLayers(v);
    setWaxBroken(false);
    setWaxDebris([]);
  };
  // 두 손 압축으로 왁스가 깨졌을 때
  const handleWaxBreak = () => {
    if (isWaxBroken) return;
    setWaxBroken(true);
    setWaxDebris(makeWaxDebris(waxLayers));
  };

  // ── 모달 / 이름 ──
  const [isModalOpen, setModalOpen] = useState(false);
  const [mallangiName, setMallangiName] = useState('');

  // 토핑 토글 (개수 제한 없음)
  const toggleTopping = (id: ToppingId) => {
    setSelectedToppings((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  // 모든 옵션을 초기 상태로 되돌리고 모달 닫기
  const handleReset = () => {
    setSelectedShape(DEFAULT_CONFIG.shape);
    setSelectedColor(DEFAULT_CONFIG.color);
    setSelectedToppings(DEFAULT_CONFIG.toppings);
    setViscosity(DEFAULT_CONFIG.viscosity);
    setSparkle(DEFAULT_CONFIG.sparkle);
    setTranslucency(DEFAULT_CONFIG.translucency);
    setCoating(DEFAULT_CONFIG.coating);
    setWaxLayers(DEFAULT_CONFIG.waxLayers);
    setWaxBroken(DEFAULT_CONFIG.isWaxBroken);
    setWaxDebris(DEFAULT_CONFIG.waxDebris);
    setMallangiName('');
    setModalOpen(false);
  };

  const config = {
    shape: selectedShape,
    color: selectedColor,
    toppings: selectedToppings,
    viscosity,
    sparkle,
    translucency,
    coating,
    waxLayers,
    isWaxBroken,
    waxDebris,
  };

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">나만의 말랑이 만들기</h1>
        <p className="subtitle">모양, 색깔, 토핑, 점도를 골라 나만의 말랑이를 만들어보세요!</p>
      </header>

      {/* 중앙 미리보기 — 드래그해서 만질 수 있음 */}
      <main className="preview-card card">
        {/* 말랑이 위 이름표 */}
        <input
          className="name-on-top"
          type="text"
          value={mallangiName}
          onChange={(e) => setMallangiName(e.target.value)}
          placeholder="이름을 입력하세요 ✏️"
          maxLength={20}
          aria-label="말랑이 이름"
        />
        <MallangiPreview
          shape={selectedShape}
          color={selectedColor}
          toppings={selectedToppings}
          viscosity={viscosity}
          sparkle={sparkle}
          translucency={translucency}
          coating={coating}
          waxLayers={waxLayers}
          isWaxBroken={isWaxBroken}
          waxDebris={waxDebris}
          onWaxBreak={handleWaxBreak}
        />
        {/* 왁스가 발려 있고 아직 안 깨졌으면 안내 말풍선 */}
        {waxLayers >= 1 && !isWaxBroken && (
          <div className="wax-hint">두 손으로 꾹 누르거나, 빠르게 두 번 톡톡 쳐서 뿌셔보세요! 🙌</div>
        )}
        <p className="preview-hint">👆 말랑이를 끌어당겨 만져보세요!</p>
      </main>

      {/* 하단 옵션 — 두 컬럼으로 깔끔하게 정렬 */}
      <div className="options">
        <div className="options-col">
          <ShapeSelector value={selectedShape} onChange={setSelectedShape} />
          <FinishSelector
            sparkle={sparkle}
            translucency={translucency}
            onSparkleChange={setSparkle}
            onTranslucencyChange={setTranslucency}
          />
          <ToppingSelector value={selectedToppings} onToggle={toggleTopping} />
        </div>
        <div className="options-col">
          <ColorPicker value={selectedColor} onChange={setSelectedColor} />
          <ViscositySlider value={viscosity} onChange={setViscosity} />
          <CoatingSelector value={coating} onChange={setCoating} />
          <WaxControl value={waxLayers} onChange={changeWax} />
        </div>
      </div>

      <div className="action-row">
        <button type="button" className="btn btn--primary complete-btn" onClick={() => setModalOpen(true)}>
          🎉 완성하기
        </button>
        <button type="button" className="btn btn--ghost reset-btn" onClick={handleReset}>
          🔄 초기화
        </button>
      </div>

      <CompleteModal
        open={isModalOpen}
        config={config}
        name={mallangiName}
        onNameChange={setMallangiName}
        onReset={handleReset}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
