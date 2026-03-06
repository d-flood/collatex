// Ported from Python test_string_similarity.py
import { describe, it, expect } from 'vitest';
import { similarityRatio, editDistance } from '#src/token-comparator.js';

describe('String Similarity', () => {
  // from test_string_similarity.py:test_ratio_is_normalized
  it('test_ratio_is_normalized — identical strings', () => {
    const score = similarityRatio('this', 'this');
    expect(score).toBeGreaterThanOrEqual(0.0);
    expect(score).toBeLessThanOrEqual(1.0);
    expect(score).toBe(1.0);
  });

  // from test_string_similarity.py:test_fallback_without_rapidfuzz
  it('test_similar_strings — score between 0 and 1', () => {
    const score = similarityRatio('abcd', 'abce');
    expect(score).toBeGreaterThanOrEqual(0.0);
    expect(score).toBeLessThanOrEqual(1.0);
    // edit distance is 1, max length is 4, so ratio = 1 - 1/4 = 0.75
    expect(score).toBe(0.75);
  });

  it('editDistance — basic cases', () => {
    expect(editDistance('', '')).toBe(0);
    expect(editDistance('abc', 'abc')).toBe(0);
    expect(editDistance('abc', 'abd')).toBe(1);
    expect(editDistance('abc', '')).toBe(3);
    expect(editDistance('kitten', 'sitting')).toBe(3);
  });

  it('similarityRatio — empty strings', () => {
    expect(similarityRatio('', '')).toBe(1.0);
  });

  it('similarityRatio — completely different', () => {
    const score = similarityRatio('abc', 'xyz');
    expect(score).toBe(0.0);
  });
});
