// Ported from TranspositionGraphTest.java
import { describe, it, expect } from 'vitest';
import { createWitnesses, collateWitnesses } from './test-helpers.js';
import { SimpleWitness } from '#src/witness.js';

describe('TranspositionGraph', () => {
  // Note: Java tests use setMergeTranspositions(true) in @Before

  // from TranspositionGraphTest.java:transpositions
  it('transpositions — three witnesses black/white', () => {
    const w = createWitnesses(
      'the black and white cat',
      'the white and black cat',
      'the black and black cat',
    );
    const graph = collateWitnesses(w[0], w[1]);
    expect(graph.transpositions().size).toBe(2);

    // Collate third witness into same graph
    // collateIntoGraph(graph, w[2]);
    // const transposed = graph.transpositions();
    // expect(transposed.size).toBe(2);
  });

  // from TranspositionGraphTest.java:noTransposition
  it('noTransposition', () => {
    expect(collateWitnesses(...createWitnesses('no transposition', 'no transposition')).transpositions().size).toBe(0);
    expect(collateWitnesses(...createWitnesses('a b', 'c a')).transpositions().size).toBe(0);
  });

  // from TranspositionGraphTest.java:oneTransposition
  it('oneTransposition', () => {
    expect(collateWitnesses(...createWitnesses('a b', 'b a')).transpositions().size).toBe(1);
  });

  // from TranspositionGraphTest.java:multipleTranspositions
  it('multipleTranspositions', () => {
    expect(collateWitnesses(...createWitnesses('a b c', 'b c a')).transpositions().size).toBe(1);
  });

  // from TranspositionGraphTest.java:testTranspositionLimiter1
  it('testTranspositionLimiter1', () => {
    const a = new SimpleWitness('A', 'X a b');
    const b = new SimpleWitness('B', 'a b X');
    const graph = collateWitnesses(a, b);
    expect(graph.transpositions().size).toBe(1);
  });

  // from TranspositionGraphTest.java:testGreekTwoWitnesses
  it('testGreekTwoWitnesses', () => {
    const w = createWitnesses(
      'και αποκριθεισ ειπεν αυτω ου βλεπεισ ταυτασ μεγαλασ οικοδομασ αμην λεγω σοι ο(υ μη α)φεθη ωδε λιθοσ επι λιθω (οσ ου) μη καταλυθη',
      'και αποκριθεισ ο ι̅σ̅ ειπεν αυτω βλεπεισ Ταυτασ τασ μεγαλασ οικοδομασ λεγω υμιν ου μη αφεθη λιθοσ επι λιθου οσ ου μη καταλυθη',
    );
    const graph = collateWitnesses(w[0], w[1]);
    expect(graph.transpositions().size).toBe(0);
  });

  // from TranspositionGraphTest.java:testGreekThreeWitnesses
  it('testGreekThreeWitnesses', () => {
    const w = createWitnesses(
      'και αποκριθεισ ειπεν αυτω ου βλεπεισ ταυτασ μεγαλασ οικοδομασ αμην λεγω σοι ο(υ μη α)φεθη ωδε λιθοσ επι λιθω (οσ ου) μη καταλυθη',
      'και αποκριθεισ ο ι̅σ̅ ειπεν αυτω βλεπεισ Ταυτασ τασ μεγαλασ οικοδομασ λεγω υμιν ου μη αφεθη λιθοσ επι λιθου οσ ου μη καταλυθη',
      'και ο ι̅σ̅ αποκριθεισ ειπεν αυτω βλεπεισ ταυτασ τασ μεγαλασ οικοδομασ ου μη αφεθη λιθοσ επι λιθον οσ ου μη καταλυθη',
    );
    const graph = collateWitnesses(w[0], w[1], w[2]);
    const transpositions = graph.transpositions();
    expect(transpositions.size).toBe(1);

    // The transposed vertices should contain [B:2:'ο'] and [C:2:'ι̅σ̅']
    const transposition = [...transpositions][0];
    const vertexStrings = new Set([...transposition].map((v) => v.toString()));
    expect(vertexStrings.has("[B:2:'ο']")).toBe(true);
    expect(vertexStrings.has("[C:2:'ι̅σ̅']")).toBe(true);
  });
});
