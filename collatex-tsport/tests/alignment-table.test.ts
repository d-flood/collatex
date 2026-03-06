// Ported from AlignmentTableTest.java
import { describe, it, expect } from 'vitest';
import {
  createWitnesses,
  collateToTable,
  collateWitnessesToTable,
  tableToString,
  tableToFullString,
} from './test-helpers.js';

describe('AlignmentTable', () => {
  // from AlignmentTableTest.java:emptyTable
  it('emptyTable', () => {
    const table = collateWitnessesToTable(...createWitnesses());
    expect(table.rows.length).toBe(0);
  });

  // from AlignmentTableTest.java:firstWitness
  it('firstWitness', () => {
    const w = createWitnesses('the black cat');
    const table = collateWitnessesToTable(...w);
    expect(table.witnessCount()).toBe(1);
    expect(tableToString(table, w[0])).toBe('|the|black|cat|');
  });

  // from AlignmentTableTest.java:everythingMatches
  it('everythingMatches', () => {
    const w = createWitnesses('the black cat', 'the black cat', 'the black cat');
    const table = collateWitnessesToTable(...w);
    expect(table.witnessCount()).toBe(3);
    expect(tableToString(table, w[0])).toBe('|the|black|cat|');
    expect(tableToString(table, w[1])).toBe('|the|black|cat|');
    expect(tableToString(table, w[2])).toBe('|the|black|cat|');
  });

  // from AlignmentTableTest.java:variant
  it('variant', () => {
    const w = createWitnesses(
      'the black cat',
      'the white cat',
      'the green cat',
      'the red cat',
      'the yellow cat',
    );
    const table = collateWitnessesToTable(...w);
    expect(table.witnessCount()).toBe(5);
    expect(tableToString(table, w[0])).toBe('|the|black|cat|');
    expect(tableToString(table, w[1])).toBe('|the|white|cat|');
    expect(tableToString(table, w[2])).toBe('|the|green|cat|');
    expect(tableToString(table, w[3])).toBe('|the|red|cat|');
    expect(tableToString(table, w[4])).toBe('|the|yellow|cat|');
  });

  // from AlignmentTableTest.java:omission
  it('omission', () => {
    const table = collateToTable('the black cat', 'the cat', 'the black cat');
    expect(tableToFullString(table)).toBe(
      'A: |the|black|cat|\nB: |the| |cat|\nC: |the|black|cat|\n',
    );
  });

  // from AlignmentTableTest.java:addition1
  it('addition1', () => {
    const table = collateToTable('the black cat', 'the white and black cat');
    expect(tableToFullString(table)).toBe(
      'A: |the| | |black|cat|\nB: |the|white|and|black|cat|\n',
    );
  });

  // from AlignmentTableTest.java:addition2
  it('addition2', () => {
    const table = collateToTable('the cat', 'before the cat', 'the black cat', 'the cat walks');
    expect(tableToFullString(table)).toBe(
      'A: | |the| |cat| |\nB: |before|the| |cat| |\nC: | |the|black|cat| |\nD: | |the| |cat|walks|\n',
    );
  });

  // from AlignmentTableTest.java:addition3
  it('addition3', () => {
    const table = collateToTable(
      'the cat',
      'before the cat',
      'the black cat',
      'just before midnight the cat walks',
    );
    expect(tableToFullString(table)).toBe(
      'A: | | | |the| |cat| |\nB: | |before| |the| |cat| |\nC: | | | |the|black|cat| |\nD: |just|before|midnight|the| |cat|walks|\n',
    );
  });

  // from AlignmentTableTest.java:transpositionAndReplacement
  it('transpositionAndReplacement', () => {
    const table = collateToTable(
      'the black dog chases a red cat',
      'a red cat chases the black dog',
      'a red cat chases the yellow dog',
    );
    expect(tableToFullString(table)).toBe(
      'A: |the|black|dog|chases|a|red|cat|\nB: |a|red|cat|chases|the|black|dog|\nC: |a|red|cat|chases|the|yellow|dog|\n',
    );
  });

  // from AlignmentTableTest.java:variation (Ignored in Java)
  it.skip('variation — left vs right alignment', () => {
    const table = collateToTable(
      'the black cat',
      'the black and white cat',
      'the black very special cat',
      'the black not very special cat',
    );
    expect(tableToFullString(table)).toBe(
      'A: |the|black| | | |cat|\nB: |the|black| |and|white|cat|\nC: |the|black| |very|special|cat|\nD: |the|black|not|very|special|cat|\n',
    );
  });

  // from AlignmentTableTest.java:witnessReorder
  it('witnessReorder', () => {
    const w = createWitnesses(
      'the black cat',
      'the black and white cat',
      'the black not very special cat',
      'the black very special cat',
    );
    const table = collateWitnessesToTable(...w);
    expect(tableToString(table, w[0])).toBe('|the|black| | | |cat|');
    expect(tableToString(table, w[1])).toBe('|the|black|and|white| |cat|');
    expect(tableToString(table, w[2])).toBe('|the|black|not|very|special|cat|');
    expect(tableToString(table, w[3])).toBe('|the|black| |very|special|cat|');
  });

  // from AlignmentTableTest.java:testSimpleSpencerHowe
  it('testSimpleSpencerHowe', () => {
    const w = createWitnesses('a', 'b', 'a b');
    const table = collateWitnessesToTable(...w);
    expect(table.witnessCount()).toBe(3);
    expect(tableToString(table, w[0])).toBe('|a| |');
    expect(tableToString(table, w[1])).toBe('| |b|');
    expect(tableToString(table, w[2])).toBe('|a|b|');
  });

  // from AlignmentTableTest.java:stringOutputOneWitness
  it('stringOutputOneWitness', () => {
    expect(tableToFullString(collateToTable('the black cat'))).toBe('A: |the|black|cat|\n');
  });

  // from AlignmentTableTest.java:stringOutputTwoWitnesses
  it('stringOutputTwoWitnesses', () => {
    const table = collateToTable('the black cat', 'the black cat');
    expect(tableToFullString(table)).toBe('A: |the|black|cat|\nB: |the|black|cat|\n');
  });

  // from AlignmentTableTest.java:stringOutputEmptyCells
  it('stringOutputEmptyCells', () => {
    expect(tableToFullString(collateToTable('the black cat', 'the'))).toBe(
      'A: |the|black|cat|\nB: |the| | |\n',
    );
  });
});
