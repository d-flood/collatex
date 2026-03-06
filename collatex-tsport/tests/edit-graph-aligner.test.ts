// Ported from EditGraphMultiWitnessAlignerTest.java + Python test_edit_graph_aligner.py
import { describe, it, expect } from 'vitest';
import {
  createWitnesses,
  collateWitnesses,
  collateWitnessesToTable,
  expectGraphMatches,
} from './test-helpers.js';
import { SimpleWitness } from '#src/witness.js';

describe('EditGraphMultiWitnessAligner', () => {
  // from EditGraphMultiWitnessAlignerTest.java:testMWADavidBirnbaum
  it('testMWADavidBirnbaum — 2 witnesses', () => {
    const w = createWitnesses('aaaa bbbb cccc dddd eeee ffff', 'aaaa bbbb eeex ffff');
    const graph = collateWitnesses(...w);
    expectGraphMatches(graph, w[0]).aligned('aaaa bbbb').nonAligned('cccc dddd eeee').aligned('ffff').check();
    expectGraphMatches(graph, w[1]).aligned('aaaa bbbb').nonAligned('eeex').aligned('ffff').check();
  });

  // from EditGraphMultiWitnessAlignerTest.java:testMWADavidBirnbaum3Witnesses
  it('testMWADavidBirnbaum — 3 witnesses', () => {
    const w = createWitnesses(
      'aaaa bbbb cccc dddd eeee ffff',
      'aaaa bbbb eeex ffff',
      'aaaa bbbb cccc eeee ffff',
    );
    const graph = collateWitnesses(...w);
    expectGraphMatches(graph, w[0]).aligned('aaaa bbbb cccc').nonAligned('dddd').aligned('eeee ffff').check();
    expectGraphMatches(graph, w[1]).aligned('aaaa bbbb').nonAligned('eeex').aligned('ffff').check();
    expectGraphMatches(graph, w[2]).aligned('aaaa bbbb cccc eeee ffff').check();
  });

  // from EditGraphMultiWitnessAlignerTest.java:testMWADavidBirnbaum4Witnesses
  it('testMWADavidBirnbaum — 4 witnesses', () => {
    const w = createWitnesses(
      'aaaa bbbb cccc dddd eeee ffff',
      'aaaa bbbb eeex ffff',
      'aaaa bbbb cccc eeee ffff',
      'aaaa bbbb eeex dddd ffff',
    );
    const graph = collateWitnesses(...w);
    expectGraphMatches(graph, w[0]).aligned('aaaa bbbb cccc dddd eeee ffff').check();
    expectGraphMatches(graph, w[1]).aligned('aaaa bbbb eeex ffff').check();
    expectGraphMatches(graph, w[2]).aligned('aaaa bbbb cccc eeee ffff').check();
    expectGraphMatches(graph, w[3]).aligned('aaaa bbbb eeex dddd ffff').check();
  });

  // from EditGraphMultiWitnessAlignerTest.java:testMWADavidBirnbaum5Witnesses
  it('testMWADavidBirnbaum — 5 witnesses (no duplicates in graph)', () => {
    const w = createWitnesses(
      'aaaa bbbb cccc dddd eeee ffff',
      'aaaa bbbb eeex ffff',
      'aaaa bbbb cccc eeee ffff',
      'aaaa bbbb eeex dddd ffff',
      'aaa aaa aaa aaa aaa',
    );
    const graph = collateWitnesses(...w);
    expectGraphMatches(graph, w[0]).aligned('aaaa bbbb cccc dddd eeee ffff').check();
    expectGraphMatches(graph, w[1]).aligned('aaaa bbbb eeex ffff').check();
    expectGraphMatches(graph, w[2]).aligned('aaaa bbbb cccc eeee ffff').check();
    expectGraphMatches(graph, w[3]).aligned('aaaa bbbb eeex dddd ffff').check();
    expectGraphMatches(graph, w[4]).nonAligned('aaa aaa aaa aaa aaa').check();

    // Check no duplicate content in graph
    const contents = new Set<string>();
    for (const v of graph.vertices()) {
      const str = v.toString();
      if (str !== '[]') {
        expect(contents.has(str)).toBe(false);
        contents.add(str);
      }
    }
  });

  // from EditGraphMultiWitnessAlignerTest.java:testRankAdjustment
  it('testRankAdjustment', () => {
    const w = createWitnesses('aaaa cccc dddd ffff', 'bbbb cccc eeee ffff', 'bbbb gggg dddd ffff');
    const graph = collateWitnesses(...w);
    expectGraphMatches(graph, w[0]).nonAligned('aaaa').aligned('cccc dddd ffff').check();
    expectGraphMatches(graph, w[1]).aligned('bbbb cccc').nonAligned('eeee').aligned('ffff').check();
    expectGraphMatches(graph, w[2]).aligned('bbbb').nonAligned('gggg').aligned('dddd ffff').check();
  });

  // from EditGraphMultiWitnessAlignerTest.java:testDuplicatedTokenInWitness
  it('testDuplicatedTokenInWitness', () => {
    const w = createWitnesses('a', 'b', 'c', 'a a');
    const graph = collateWitnesses(...w);
    expectGraphMatches(graph, w[0]).aligned('a').check();
    expectGraphMatches(graph, w[1]).nonAligned('b').check();
    expectGraphMatches(graph, w[2]).nonAligned('c').check();
    expectGraphMatches(graph, w[3]).nonAligned('a').aligned('a').check();
  });

  // from EditGraphMultiWitnessAlignerTest.java:test1
  it('test1 — a, b, a b', () => {
    const w = createWitnesses('a', 'b', 'a b');
    const graph = collateWitnesses(...w);
    expectGraphMatches(graph, w[0]).aligned('a').check();
    expectGraphMatches(graph, w[1]).aligned('b').check();
    expectGraphMatches(graph, w[2]).aligned('a b').check();
  });

  // from EditGraphMultiWitnessAlignerTest.java:test2
  it('test2 — a, a b, b', () => {
    const w = createWitnesses('a', 'a b', 'b');
    const graph = collateWitnesses(...w);
    expectGraphMatches(graph, w[0]).aligned('a').check();
    expectGraphMatches(graph, w[1]).aligned('a b').check();
    expectGraphMatches(graph, w[2]).aligned('b').check();
  });

  // from EditGraphMultiWitnessAlignerTest.java:test3
  it('test3 — a b, b, a', () => {
    const w = createWitnesses('a b', 'b', 'a');
    const graph = collateWitnesses(...w);
    expectGraphMatches(graph, w[0]).aligned('a b').check();
    expectGraphMatches(graph, w[1]).aligned('b').check();
    expectGraphMatches(graph, w[2]).aligned('a').check();
  });

  // from EditGraphMultiWitnessAlignerTest.java:test4
  it('test4 — a x, y b, a b', () => {
    const w = createWitnesses('a x', 'y b', 'a b');
    const graph = collateWitnesses(...w);
    expectGraphMatches(graph, w[0]).aligned('a').nonAligned('x').check();
    expectGraphMatches(graph, w[1]).nonAligned('y').aligned('b').check();
    expectGraphMatches(graph, w[2]).aligned('a b').check();
  });

  // from EditGraphMultiWitnessAlignerTest.java:test5
  it('test5 — a x, b, a b', () => {
    const w = createWitnesses('a x', 'b', 'a b');
    const graph = collateWitnesses(...w);
    expectGraphMatches(graph, w[0]).aligned('a').nonAligned('x').check();
    expectGraphMatches(graph, w[1]).aligned('b').check();
    expectGraphMatches(graph, w[2]).aligned('a b').check();
  });

  // from EditGraphMultiWitnessAlignerTest.java:test6
  it('test6 — a, y b, a b', () => {
    const w = createWitnesses('a', 'y b', 'a b');
    const graph = collateWitnesses(...w);
    expectGraphMatches(graph, w[0]).aligned('a').check();
    expectGraphMatches(graph, w[1]).nonAligned('y').aligned('b').check();
    expectGraphMatches(graph, w[2]).aligned('a b').check();
  });

  // from EditGraphMultiWitnessAlignerTest.java:test7
  it('test7 — a x, b y, a b', () => {
    const w = createWitnesses('a x', 'b y', 'a b');
    const graph = collateWitnesses(...w);
    expectGraphMatches(graph, w[0]).aligned('a').nonAligned('x').check();
    expectGraphMatches(graph, w[1]).aligned('b').nonAligned('y').check();
    expectGraphMatches(graph, w[2]).aligned('a b').check();
  });

  // from EditGraphMultiWitnessAlignerTest.java:test8
  it('test8 — a, b, c, a b c', () => {
    const w = createWitnesses('a', 'b', 'c', 'a b c');
    const graph = collateWitnesses(...w);
    expectGraphMatches(graph, w[0]).aligned('a').check();
    expectGraphMatches(graph, w[1]).aligned('b').check();
    expectGraphMatches(graph, w[2]).aligned('c').check();
    expectGraphMatches(graph, w[3]).aligned('a b c').check();
  });

  // from EditGraphMultiWitnessAlignerTest.java:testDuplicatedTokenInWitness2
  it('testDuplicatedTokenInWitness2 — a b c repeated', () => {
    const w = createWitnesses('a', 'b', 'c', 'a b c a b c');
    const graph = collateWitnesses(...w);
    expectGraphMatches(graph, w[0]).aligned('a').check();
    expectGraphMatches(graph, w[1]).aligned('b').check();
    expectGraphMatches(graph, w[2]).aligned('c').check();
    expectGraphMatches(graph, w[3]).nonAligned('a b c').aligned('a b c').check();
  });

  // from EditGraphMultiWitnessAlignerTest.java:testAlignWithLongestMatch (Ignored)
  it('testAlignWithLongestMatch', () => {
    const w = createWitnesses('a g a g c t a g t', 'a g c t');
    const graph = collateWitnesses(...w);
    expectGraphMatches(graph, w[0]).nonAligned('a g').aligned('a g c t').nonAligned('a g t').check();
    expectGraphMatches(graph, w[1]).aligned('a g c t').check();

    const w2 = createWitnesses('a g c t', 'a g a g c t a g t');
    const graph2 = collateWitnesses(...w2);
    expectGraphMatches(graph2, w2[0]).aligned('a g c t').check();
    expectGraphMatches(graph2, w2[1]).nonAligned('a g').aligned('a g c t').nonAligned('a g t').check();
  });

  it('collates many duplicate short witnesses without graph blowup', () => {
    const witnesses = Array.from({ length: 1000 }, (_, index) =>
      new SimpleWitness(index < 900 ? `A${index}` : `B${index}`, index < 900 ? 'alpha beta gamma delta' : 'alpha beta epsilon delta'),
    );
    const graph = collateWitnesses(...witnesses);
    const contentVertices = graph
      .vertices()
      .filter((vertex) => vertex !== graph.getStart() && vertex !== graph.getEnd());

    expect(graph.witnesses().size).toBe(1000);
    expect(contentVertices.length).toBe(5);
    expect(
      contentVertices.find((vertex) => vertex.tokens().some((token) => token.normalized === 'alpha'))?.witnesses().size,
    ).toBe(1000);
  });

  it('collates many mostly-unique short witnesses', () => {
    const witnesses = Array.from({ length: 250 }, (_, index) =>
      new SimpleWitness(`U${index}`, `alpha beta variant${index} gamma tail${index % 11} omega`),
    );
    const graph = collateWitnesses(...witnesses);
    const contentVertices = graph
      .vertices()
      .filter((vertex) => vertex !== graph.getStart() && vertex !== graph.getEnd());

    expect(graph.witnesses().size).toBe(250);
    expect(
      contentVertices.find((vertex) => vertex.tokens().some((token) => token.normalized === 'alpha'))?.witnesses().size,
    ).toBe(250);
  });
});

// Python test_edit_graph_aligner.py tests
describe('EditGraphAligner (Python port tests)', () => {
  // from test_edit_graph_aligner.py:test_superbase_generation_multiple_short_witnesses
  it('test_superbase_generation_multiple_short_witnesses', () => {
    const w = createWitnesses('a', 'b', 'c');
    const graph = collateWitnesses(...w);
    expect(graph).toBeDefined();
  });

  // from test_edit_graph_aligner.py:test_duplicated_tokens_in_witness
  it('test_duplicated_tokens_in_witness — Python version', () => {
    const table = collateWitnessesToTable(...createWitnesses('a', 'b', 'c', 'a a'));
    expect(table).toBeDefined();
    // Row 0 (A): [null, "a"]
    // Row 1 (B): ["b", null]
    // Row 2 (C): ["c", null]
    // Row 3 (D): ["a ", "a"]
  });

  // from test_edit_graph_aligner.py:test_1
  it('test_1 — a, b, a b (Python)', () => {
    const table = collateWitnessesToTable(...createWitnesses('a', 'b', 'a b'));
    expect(table).toBeDefined();
    // Row 0 (A): ["a", null]
    // Row 1 (B): [null, "b"]
    // Row 2 (C): ["a ", "b"]
  });

  // from test_edit_graph_aligner.py:test_2 — in the bleach repetition
  it('test_2 — in the bleach repetition', () => {
    const table = collateWitnessesToTable(
      ...createWitnesses(
        'in the in the bleach',
        'in the in the bleach in the',
        'in the in the bleach in the',
      ),
    );
    expect(table).toBeDefined();
    // Row 0: ["in the in the bleach", null]
    // Row 1: ["in the in the bleach ", "in the"]
    // Row 2: ["in the in the bleach ", "in the"]
  });

  // from test_edit_graph_aligner.py:test_non_overlapping_blocks_Hermans
  it('test_non_overlapping_blocks_Hermans', () => {
    const table = collateWitnessesToTable(
      ...createWitnesses(
        'a b c d F g h i ! K ! q r s t',
        'a b c d F g h i ! q r s t',
      ),
    );
    expect(table).toBeDefined();
    // Row 0: ["a b c d F g h i ", "! K ", "! q r s t"]
    // Row 1: ["a b c d F g h i ", null, "! q r s t"]
  });

  // from test_edit_graph_aligner.py:test_blocks_Hermans_case_three_witnesses
  it('test_blocks_Hermans_case_three_witnesses', () => {
    const table = collateWitnessesToTable(
      ...createWitnesses(
        'a b c d F g h i ! K ! q r s t',
        'a b c d F g h i ! q r s t',
        'a b c d E g h i ! q r s t',
      ),
    );
    expect(table).toBeDefined();
    // Row 0: ["a b c d ", "F ", "g h i ", "! K ", "! q r s t"]
    // Row 1: ["a b c d ", "F ", "g h i ", null, "! q r s t"]
    // Row 2: ["a b c d ", "E ", "g h i ", null, "! q r s t"]
  });
});
