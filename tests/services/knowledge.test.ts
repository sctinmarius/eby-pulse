import { describe, expect, it } from 'vitest';
import { FILE_TO_KIND, KIND_TO_FILE, titleFromMarkdown } from '../../src/services/knowledge.js';

describe('knowledge helpers', () => {
  it('maps kinds to files and back symmetrically', () => {
    for (const [kind, file] of Object.entries(KIND_TO_FILE)) {
      expect(FILE_TO_KIND[file]).toBe(kind);
    }
  });

  it('extracts the first heading as title', () => {
    expect(titleFromMarkdown('# Doctor Estimator — ce este\n\ntext', 'X')).toBe(
      'Doctor Estimator — ce este',
    );
    expect(titleFromMarkdown('intro\n\n# Later Heading\ntext', 'X')).toBe('Later Heading');
  });

  it('falls back when there is no heading', () => {
    expect(titleFromMarkdown('plain text only', 'PRODUCT')).toBe('PRODUCT');
  });
});
