// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'coverage/', 'src/generated/'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // The agent core stays pure: extractable later as @eby/agent-core.
    files: ['src/agent/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['fastify*', '@prisma/*', 'grammy*', 'croner'], message: 'src/agent must stay framework-free (spec §4).' },
            { group: ['../modules/*', '../libs/prisma*', '../jobs/*'], message: 'src/agent must not depend on app modules (spec §4).' },
          ],
        },
      ],
    },
  },
);
