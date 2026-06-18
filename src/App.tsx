import { useRef, useState } from 'react';
import MallangiPreview from './components/MallangiPreview';
import ShapeSelector from './components/ShapeSelector';
import ColorPicker from './components/ColorPicker';
import FinishSelector from './components/FinishSelector';
import CoatingSelector from './components/CoatingSelector';
import ToppingSelector from './components/ToppingSelector';
import ViscositySlider from './components/ViscositySlider';
import CompleteModal from './components/CompleteModal';
import { DEFAULT_CONFIG, type CoatingId, type ShapeId, type ToppingId } from './types';

export default function App() {
  // ── 말랑이 설정 상태 ──
  const [selectedShape, setSelectedShape] = useState<ShapeId>(DEFAULT_CONFIG.shape);
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_CONFIG.color);
  const [selectedToppings, setSelectedToppings] = useState<ToppingId[]>(DEFAULT_CONFIG.toppings);
  const [viscosity, setViscosity] = useState<number>(DEFAULT_CONFIG.viscosity);
  const [sparkle, setSparkle] = useState<number>(DEFAULT_CONFIG.sparkle);
  const [translucency, setTranslucency] = useState<number>(DEFAULT_CONFIG.translucency);
  const [coating, setCoating] = useState<CoatingId>(DEFAULT_CONFIG.coating);

  // ── 모달 / 이름 / 안내 메시지 ──
  const [isModalOpen, setModalOpen] = useState(false);
  const [mallangiName, setMallangiName] = useState('');
  const [toast, setToast] = useState('');
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = (msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 2200);
  };

  // 토핑 토글 (최대 2개). 초과 시 안내 메시지 표시
  const toggleTopping = (id: ToppingId) => {
    setSelectedToppings((prev) => {
      if (prev.includes(id)) return prev.filter((t) => t !== id);
      if (prev.length >= 4) {
        showToast('토핑은 최대 4개까지 넣을 수 있어요!');
        return prev;
      }
      return [...prev, id];
    });
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
        />
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

      {/* 안내 토스트 */}
      {toast && <div className="toast">{toast}</div>}

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
