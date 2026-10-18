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
    // Cada requisicao faz varias idas ao Postgres hospedado (um cadastro faz
    // quatro), mais hash argon2. Com o projeto fora do Brasil isso passa de
    // 1s por requisicao, e os 5s/10s padrao do Vitest estouram. Pior que o
    // timeout em si: a requisicao abortada continua em voo e insere o usuario
    // depois que o beforeEach seguinte ja limpou, o que aparece como
    // "duplicate key" sem relacao aparente com a causa.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
