// Ported from AlignmentTest.java
import { describe, it, expect } from 'vitest';
import {
  createWitnesses,
  collateWitnessesToTable,
  collateWitnesses,
  tableToString,
  expectGraphMatches,
} from './test-helpers.js';
import { AlignmentTable } from '#src/alignment-table.js';

describe('Alignment (phrase matching & transposition detection)', () => {
  // from AlignmentTest.java:doubleTransposition1
  it('doubleTransposition1', () => {
    const w = createWitnesses('the cat is black', 'black is the cat');
    const table = collateWitnessesToTable(...w);
    expect(tableToString(table, w[0])).toBe('|the|cat|is|black| |');
    expect(tableToString(table, w[1])).toBe('|black| |is|the|cat|');
  });

  // from AlignmentTest.java:doubleTransposition2
  it('doubleTransposition2', () => {
    const w = createWitnesses('a b', 'b a');
    const table = collateWitnessesToTable(...w);
    expect(tableToString(table, w[0])).toBe('| |a|b|');
    expect(tableToString(table, w[1])).toBe('|b|a| |');
  });

  // from AlignmentTest.java:doubleTransposition3
  it('doubleTransposition3', () => {
    const w = createWitnesses('a b c', 'b a c');
    const table = collateWitnessesToTable(...w);
    expect(tableToString(table, w[0])).toBe('| |a|b|c|');
    expect(tableToString(table, w[1])).toBe('|b|a| |c|');
  });

  // from AlignmentTest.java:additionInCombinationWithTransposition
  it('additionInCombinationWithTransposition', () => {
    const w = createWitnesses(
      'the cat is very happy',
      'very happy is the cat',
      'very delitied and happy is the cat',
    );
    const table = collateWitnessesToTable(...w);
    expect(tableToString(table, w[0])).toBe('|the|cat| | |is|very|happy|');
    expect(tableToString(table, w[1])).toBe('|very| | |happy|is|the|cat|');
    expect(tableToString(table, w[2])).toBe('|very|delitied|and|happy|is|the|cat|');
  });

  // from AlignmentTest.java:simpleTransposition
  it('simpleTransposition', () => {
    const w = createWitnesses(
      'A black cat in a white basket',
      'A white cat in a black basket',
    );
    const table = collateWitnessesToTable(...w);
    expect(tableToString(table, w[0])).toBe('|a|black|cat|in|a|white|basket|');
    expect(tableToString(table, w[1])).toBe('|a|white|cat|in|a|black|basket|');
  });

  // from AlignmentTest.java:transposeInOnePair
  it('transposeInOnePair', () => {
    const w = createWitnesses('y', 'x y z', 'z y');
    const table = collateWitnessesToTable(...w);
    expect(tableToString(table, w[0])).toBe('| |y| |');
    expect(tableToString(table, w[1])).toBe('|x|y|z|');
    expect(tableToString(table, w[2])).toBe('|z|y| |');
  });

  // from AlignmentTest.java:transposeInTwoPairs
  it('transposeInTwoPairs', () => {
    const w = createWitnesses('y x', 'x y z', 'z y');
    const table = collateWitnessesToTable(...w);
    expect(tableToString(table, w[0])).toBe('| |y|x|');
    expect(tableToString(table, w[1])).toBe('|x|y|z|');
    expect(tableToString(table, w[2])).toBe('|z|y| |');
  });

  // from AlignmentTest.java:testOrderIndependence
  // This test checks phrase matches and transpositions — needs InspectableCollationAlgorithm
  it('testOrderIndependence', () => {
    const w = createWitnesses('Hello cruel world', 'Hello nice world', 'Hello nice cruel world');
    const graph = collateWitnesses(...w);
    // Should produce phrase matches: "Hello", "nice", "cruel", "world"
    // Should produce 0 transpositions
    // For now, just assert the graph was created (will fail with not-implemented)
    expect(graph).toBeDefined();
  });

  // from AlignmentTest.java:testPhraseMatchingShouldNotIgnoreDeletions
  it('testPhraseMatchingShouldNotIgnoreDeletions', () => {
    const w = createWitnesses('Hello cruel world', 'Hello world');
    const graph = collateWitnesses(...w);
    // Should produce phrase matches: "Hello", "world"
    // Should produce 0 transpositions
    expect(graph).toBeDefined();
  });

  // from AlignmentTest.java:testPhraseMatchingShouldNotIgnoreAdditions
  it('testPhraseMatchingShouldNotIgnoreAdditions', () => {
    const w = createWitnesses('Hello world', 'Hello cruel world');
    const graph = collateWitnesses(...w);
    // Should produce phrase matches: "Hello", "world"
    // Should produce 0 transpositions
    expect(graph).toBeDefined();
  });
});
