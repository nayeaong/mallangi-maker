import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // 상대 경로 → GitHub Pages 하위 경로(/저장소이름/)에서도 에셋이 깨지지 않음
  base: './',
  plugins: [react()],
});
