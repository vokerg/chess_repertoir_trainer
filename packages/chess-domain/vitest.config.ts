import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: [
      'test/**/*.test.ts',
      'src/candidate-ranking*.test.ts',
      'src/stockfish-analysis.test.ts',
    ],
  },
});
