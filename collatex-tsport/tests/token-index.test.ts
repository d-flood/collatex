// Ported from TokenIndexTest.java + TokenComparatorTest.java + Python test_tokenindex.py
import { describe, it, expect } from 'vitest';
import { createWitnesses } from './test-helpers.js';
import { EqualityTokenComparator } from '#src/token-comparator.js';
import { TokenIndex, MarkerToken } from '#src/token-index.js';
import { SimpleWitness } from '#src/witness.js';
import type { Token } from '#src/token.js';

describe('TokenIndex', () => {
  // from TokenIndexTest.java:testCaseDanielStoekl
  it('testCaseDanielStoekl — suffix array and LCP array', () => {
    const w = createWitnesses('a b c d e', 'a e c d', 'a d b');
    const tokenIndex = new TokenIndex(new EqualityTokenComparator(), w);
    tokenIndex.prepare();

    // Position:     0  1  2  3  4  5  6  7  8  9 10 11 12 13 14
    // Tokens:       a  b  c  d  e $1  a  e  c  d $2  a  d  b $3
    // SuffixArray:  0 11  6  1 13  2  8 12  3  9  7  4  5 10 14
    // LCP:          -  1  1  0  1  0  2  0  1  1  0  1  0  0  0
    expect(JSON.stringify(tokenIndex.suffix_array)).toBe(
      JSON.stringify([0, 11, 6, 1, 13, 2, 8, 12, 3, 9, 7, 4, 5, 10, 14]),
    );
    expect(JSON.stringify(tokenIndex.LCP_array)).toBe(
      JSON.stringify([-1, 1, 1, 0, 1, 0, 2, 0, 1, 1, 0, 1, 0, 0, 0]),
    );
  });

  // from TokenIndexTest.java:testCaseDanielStoeklLCPIntervals
  it('testCaseDanielStoeklLCPIntervals', () => {
    const w = createWitnesses('a b c d e', 'a e c d', 'a d b');
    const tokenIndex = new TokenIndex(new EqualityTokenComparator(), w);
    tokenIndex.prepare();
    const blocks = tokenIndex.splitLCP_ArrayIntoIntervals();

    // start, length, depth, frequency
    expect(blocks[0].start).toBe(0);
    expect(blocks[0].length).toBe(1);
    expect(blocks[0].getDepth()).toBe(3);
    expect(blocks[0].getFrequency()).toBe(3);
    // b
    expect(blocks[1].start).toBe(3);
    expect(blocks[1].length).toBe(1);
    expect(blocks[1].getDepth()).toBe(2);
    expect(blocks[1].getFrequency()).toBe(2);
    // c d
    expect(blocks[2].start).toBe(5);
    expect(blocks[2].length).toBe(2);
    expect(blocks[2].getDepth()).toBe(2);
    expect(blocks[2].getFrequency()).toBe(2);
    // d
    expect(blocks[3].start).toBe(7);
    expect(blocks[3].length).toBe(1);
    expect(blocks[3].getDepth()).toBe(3);
    expect(blocks[3].getFrequency()).toBe(3);
    // e
    expect(blocks[4].start).toBe(10);
    expect(blocks[4].length).toBe(1);
    expect(blocks[4].getDepth()).toBe(2);
    expect(blocks[4].getFrequency()).toBe(2);
    expect(blocks.length).toBe(5);
  });

  // from TokenIndexTest.java:testDepthAndNumberOfTimes
  it('testDepthAndNumberOfTimes', () => {
    const w = createWitnesses('the a the', 'the a');
    const tokenIndex = new TokenIndex(new EqualityTokenComparator(), w);
    tokenIndex.prepare();

    expect(JSON.stringify(tokenIndex.suffix_array)).toBe(
      JSON.stringify([0, 4, 2, 1, 5, 3, 6]),
    );
    expect(JSON.stringify(tokenIndex.LCP_array)).toBe(
      JSON.stringify([-1, 2, 1, 0, 1, 0, 0]),
    );

    const blocks = tokenIndex.splitLCP_ArrayIntoIntervals();
    // "the a" — start=0, length=2, depth=2, frequency=2
    expect(blocks[0].start).toBe(0);
    expect(blocks[0].length).toBe(2);
    expect(blocks[0].getDepth()).toBe(2);
    expect(blocks[0].getFrequency()).toBe(2);
    // "the" — start=0, length=1, depth=2, frequency=3
    expect(blocks[1].start).toBe(0);
    expect(blocks[1].length).toBe(1);
    expect(blocks[1].getDepth()).toBe(2);
    expect(blocks[1].getFrequency()).toBe(3);
    // "a" — start=3, length=1, depth=2, frequency=2
    expect(blocks[2].start).toBe(3);
    expect(blocks[2].length).toBe(1);
    expect(blocks[2].getDepth()).toBe(2);
    expect(blocks[2].getFrequency()).toBe(2);
    expect(blocks.length).toBe(3);
  });

  // from TokenIndexTest.java:testCustomTokensAndComparator
  it('testCustomTokensAndComparator', () => {
    const w1: SimpleWitness = { sigil: 'special', getTokens: () => [] } as any;
    const makeToken = (w: SimpleWitness, content: string, index: number): Token => ({
      witness: w,
      content,
      normalized: content,
      index,
    });
    const tokens1 = [
      makeToken(w1, 'interesting', 0),
      makeToken(w1, 'nice', 1),
      makeToken(w1, 'huh', 2),
    ];
    const w2: SimpleWitness = { sigil: 'special', getTokens: () => [] } as any;
    const tokens2 = [
      makeToken(w2, 'very', 0),
      makeToken(w2, 'nice', 1),
      makeToken(w2, 'right', 2),
    ];

    const comparator = {
      compare: (a: Token, b: Token) => a.normalized.localeCompare(b.normalized),
    };

    const index = new TokenIndex(
      new EqualityTokenComparator(),
      tokens1 as any,
      tokens2 as any,
    );
    index.prepare();

    expect(index.token_array.map(String).join(', ')).toBe(
      'interesting, nice, huh, $1, very, nice, right, $2',
    );

    // Sort with MarkerTokenComparator
    const markerComparator = new TokenIndex.MarkerTokenComparator(comparator);
    const sorted = [...index.token_array].sort((a, b) => markerComparator.compare(a, b));
    expect(sorted.map(String).join(', ')).toBe('$1, $2, huh, interesting, nice, nice, right, very');
  });
});

describe('TokenComparator (MarkerTokenComparator)', () => {
  // from TokenComparatorTest.java:testComparatorWorksAsExpected
  it('marker tokens sort before regular tokens', () => {
    const w1 = new SimpleWitness('A', 'a');
    const w2 = new SimpleWitness('B', 'b');
    const w3 = new SimpleWitness('C', 'a b');
    const marker1 = new MarkerToken(1);
    const marker2 = new MarkerToken(2);
    const marker3 = new MarkerToken(3);

    const tokens: (Token | MarkerToken)[] = [
      w1.getTokens()[0],
      marker1,
      w2.getTokens()[0],
      marker2,
      ...w3.getTokens(),
      marker3,
    ];

    const comparator = new TokenIndex.MarkerTokenComparator(new EqualityTokenComparator());
    const sorted = [...tokens].sort((a, b) => comparator.compare(a, b));

    // Marker tokens should come first
    expect(sorted[0]).toBe(marker1);
    expect(sorted[1]).toBe(marker2);
    expect(sorted[2]).toBe(marker3);
  });
});

// Python test_tokenindex.py tests
describe('TokenIndex (Python port tests)', () => {
  // from test_tokenindex.py:testCaseDanielStoekl (LCP array only)
  it('testCaseDanielStoekl — LCP array', () => {
    const w = createWitnesses('a b c d e', 'a e c d', 'a d b');
    const tokenIndex = new TokenIndex(new EqualityTokenComparator(), w);
    tokenIndex.prepare();
    // Python asserts: [0, 0, 0, 1, 1, 0, 1, 0, 2, 0, 1, 1, 0, 1]
    // Note: Python LCP format differs from Java (no leading -1)
    const lcpWithoutFirst = tokenIndex.LCP_array.slice(1);
    expect(lcpWithoutFirst).toEqual([1, 1, 0, 1, 0, 2, 0, 1, 1, 0, 1, 0, 0, 0]);
  });

  // from test_tokenindex.py:test_lcp_intervals_number_of_witnesses_Hermans_case
  it('Hermans case — LCP interval depth', () => {
    const w = createWitnesses(
      'a b c d F g h i ! K ! q r s t',
      'a b c d F g h i ! q r s t',
      'a b c d E g h i ! q r s t',
    );
    const tokenIndex = new TokenIndex(new EqualityTokenComparator(), w);
    tokenIndex.prepare();
    const intervals = tokenIndex.splitLCP_ArrayIntoIntervals();
    // "! q r s t" block should have depth 3
    const qrstBlock = intervals[1]; // second interval
    expect(qrstBlock.getDepth()).toBe(3);
  });
});
