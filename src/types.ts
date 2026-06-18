// 말랑이 모양 종류
export type ShapeId = 'hobbang' | 'pudding' | 'butter' | 'bear' | 'cheese' | 'corn';

// 토핑 종류
export type ToppingId = 'star' | 'button' | 'sprinkle' | 'heart' | 'strawberry' | 'oreo';

// 담그기(마감) 종류: 없음 / 물 / 파우더
export type CoatingId = 'none' | 'water' | 'powder';

export interface ShapeOption {
  id: ShapeId;
  name: string;
  emoji: string;
  desc: string;
}

export interface ToppingOption {
  id: ToppingId;
  name: string;
  emoji: string;
}

// 앱 전체에서 공유하는 말랑이 설정값
export interface MallangiConfig {
  shape: ShapeId;
  color: string;
  toppings: ToppingId[];
  viscosity: number;
  sparkle: number; // 반짝이 정도 0~10
  translucency: number; // 반투명 정도 0(불투명)~10(아주 투명)
  coating: CoatingId; // 담그기 마감
}

// 초기(기본) 상태
export const DEFAULT_CONFIG: MallangiConfig = {
  shape: 'hobbang',
  color: '#FFD6E8',
  toppings: [],
  viscosity: 5,
  sparkle: 0,
  translucency: 0,
  coating: 'none',
};
