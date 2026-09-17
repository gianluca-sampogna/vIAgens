import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Os specs e2e usam o mesmo banco Supabase compartilhado. Rodar os
    // arquivos em paralelo faz o beforeEach de um apagar usuarios que
    // outro arquivo acabou de criar (e cujo token ainda esta em uso),
    // causando 401/404 instaveis. Nao paralelizar por arquivo.
    fileParallelism: false,
  },
});
