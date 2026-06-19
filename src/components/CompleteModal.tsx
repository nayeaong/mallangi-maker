import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import MallangiPreview from './MallangiPreview';
import type { MallangiConfig } from '../types';

interface Props {
  open: boolean;
  config: MallangiConfig;
  name: string;
  onNameChange: (name: string) => void;
  onReset: () => void;
  onClose: () => void;
}

export default function CompleteModal({ open, config, name, onNameChange, onReset, onClose }: Props) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  // 미리보기 영역을 이미지로 저장
  const handleSave = async () => {
    if (!captureRef.current || saving) return;
    setSaving(true);
    try {
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: '#FFF7F0',
        scale: 2,
      });
      const safe = name.trim() ? name.trim().replace(/[\\/:*?"<>|]+/g, '_') : 'my-mallangi';
      const link = document.createElement('a');
      link.download = `${safe}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">내 말랑이 이름 짓기 🎀</h2>

        <input
          className="name-input"
          type="text"
          placeholder="예: 말랑콩이"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          maxLength={20}
        />

        {/* 저장 대상이 되는 미리보기 (정적, 드래그 비활성) */}
        <div className="capture" ref={captureRef}>
          <MallangiPreview
            shape={config.shape}
            color={config.color}
            toppings={config.toppings}
            viscosity={config.viscosity}
            sparkle={config.sparkle}
            translucency={config.translucency}
            coating={config.coating}
            waxLayers={config.waxLayers}
            isWaxBroken={config.isWaxBroken}
            waxDebris={config.waxDebris}
            interactive={false}
            scale={0.82}
          />
          <p className="capture-name">{name.trim() || '이름 없는 말랑이'}</p>
        </div>

        <div className="modal-buttons">
          <button type="button" className="btn btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중…' : '📷 이미지 저장하기'}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onReset}>
            🔄 다시 만들기
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
