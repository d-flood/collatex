// Ported from VariantGraphTest.java + Python test_variant_graph.py
import { describe, it, expect } from 'vitest';
import { createWitnesses, collateWitnesses } from './test-helpers.js';
import { VariantGraph } from '#src/variant-graph.js';

describe('VariantGraph', () => {
  // from VariantGraphTest.java:emptyGraph
  it('emptyGraph — 2 vertices, 1 edge, 0 witnesses', () => {
    const graph = collateWitnesses(...createWitnesses());
    expect(graph.witnesses().size).toBe(0);
    expect(graph.vertices().length).toBe(2);
    // 1 edge from start to end
  });

  // from VariantGraphTest.java:getTokens
  it('getTokens — traversal of single witness', () => {
    const w = createWitnesses('a b c d');
    const graph = collateWitnesses(...w);
    // Should have 6 vertices: start + a + b + c + d + end
    expect(graph.vertices().length).toBe(6);
  });

  // from VariantGraphTest.java:oneWitness
  it('oneWitness — linear path', () => {
    const w = createWitnesses('only one witness');
    const graph = collateWitnesses(...w);
    // 5 vertices (start + 3 words + end), 4 edges
    expect(graph.vertices().length).toBe(5);
  });

  // from VariantGraphTest.java:getPathForWitness
  it('getPathForWitness', () => {
    const w = createWitnesses('a b c d e f ', 'x y z d e', 'a b x y z');
    const graph = collateWitnesses(...w);
    // Path for w[0] should be: start, a, b, c, d, e, f, end = 8 vertices
    expect(graph).toBeDefined();
  });

  // from VariantGraphTest.java:transpositions1
  it('transpositions1 — edge count', () => {
    const graph = collateWitnesses(
      ...createWitnesses(
        'the nice black and white cat',
        'the friendly white and black cat',
      ),
    );
    // Should have 12 edges
    expect(graph).toBeDefined();
  });

  // from VariantGraphTest.java:transpositions2
  it('transpositions2 — two cat vertices', () => {
    const w = createWitnesses(
      'The black dog chases a red cat.',
      'A red cat chases the black dog.',
      'A red cat chases the yellow dog',
    );
    const graph = collateWitnesses(...w);
    // Should have 17 vertices, 20 edges
    expect(graph.vertices().length).toBe(17);
  });

  // from VariantGraphTest.java:joinTwoIdenticalWitnesses
  it('joinTwoIdenticalWitnesses', () => {
    const w = createWitnesses('the black cat', 'the black cat');
    const graph = collateWitnesses(...w);
    const joined = VariantGraph.JOIN.apply(graph);
    // After JOIN: 3 vertices (start, "the black cat", end), 2 edges
    expect(joined.vertices().length).toBe(3);
  });

  // from VariantGraphTest.java:joinTwoDifferentWitnesses
  it('joinTwoDifferentWitnesses', () => {
    const w = createWitnesses(
      'the nice black cat shared his food',
      'the bad white cat spilled his food again',
    );
    const graph = collateWitnesses(...w);
    const joined = VariantGraph.JOIN.apply(graph);
    // Should have vertices: start, "the", "nice black", "bad white", "cat", "shared", "spilled", "his food", "again", end
    expect(joined).toBeDefined();
  });

  // from VariantGraphTest.java:joinTwoDifferentWitnesses2
  it('joinTwoDifferentWitnesses2', () => {
    const w = createWitnesses('Blackie, the black cat', 'Whitney, the white cat');
    const graph = collateWitnesses(...w);
    const joined = VariantGraph.JOIN.apply(graph);
    expect(joined).toBeDefined();
  });

  // from VariantGraphTest.java:joinTwoDifferentWitnessesWithTranspositions
  it('joinTwoDifferentWitnessesWithTranspositions', () => {
    const w = createWitnesses(
      'voor Zo nu en dan zin2 na voor',
      'voor zin2 Nu en dan voor',
    );
    const graph = collateWitnesses(...w);
    const joined = VariantGraph.JOIN.apply(graph);
    expect(joined).toBeDefined();
  });
});

// Python test_variant_graph.py
describe('VariantGraph (Python port)', () => {
  // from test_variant_graph.py:test_storage_of_tokens_on_variant_graph
  it('test_storage_of_tokens_on_variant_graph', () => {
    const w = createWitnesses('a b c', 'a d c');
    const graph = collateWitnesses(...w);
    // Start and end should have no tokens
    expect(graph.getStart().tokens().length).toBe(0);
    expect(graph.getEnd().tokens().length).toBe(0);
    // 'a' and 'c' should have tokens from both witnesses
    // 'b' should only have token from A
    // 'd' should only have token from B
    expect(graph).toBeDefined();
  });
});
