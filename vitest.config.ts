import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        'postgresql://ebypulse:ebypulse@localhost:5433/ebypulse_test',
      BOOTSTRAP_TOKEN: 'test-bootstrap-token-0123456789',
    },
    // Integration tests share one database; avoid cross-file races.
    fileParallelism: false,
  },
});
