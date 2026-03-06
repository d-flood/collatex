// Ported from DekkerAlgorithmTest.java
import { describe, it, expect } from 'vitest';
import {
  createWitnesses,
  collateWitnesses,
  collateWitnessesToTable,
  tableToString,
  tableToFullString,
  expectGraphMatches,
} from './test-helpers.js';

describe('DekkerAlgorithm', () => {
  // from DekkerAlgorithmTest.java:testExample1
  it('testExample1 — cat/birds complex', () => {
    const w = createWitnesses(
      'This morning the cat observed little birds in the trees.',
      'The cat was observing birds in the little trees this morning, it observed birds for two hours.',
    );
    const graph = collateWitnesses(...w);

    // Witness A: non-aligned("this", "morning"), aligned("the", "cat"), non-aligned("observed"),
    //            non-aligned("little"), aligned("birds", "in", "the"), aligned("trees", ".")
    expectGraphMatches(graph, w[0])
      .nonAligned('this', 'morning')
      .aligned('the', 'cat')
      .nonAligned('observed')
      .nonAligned('little')
      .aligned('birds', 'in', 'the')
      .aligned('trees', '.')
      .check();

    // Witness B: aligned("the", "cat"), non-aligned("was", "observing"),
    //            aligned("birds", "in", "the"), non-aligned("little"), aligned("trees"),
    //            non-aligned("this", "morning"), non-aligned(",", "it"),
    //            non-aligned("observed", "birds", "for", "two", "hours"), aligned(".")
    expectGraphMatches(graph, w[1])
      .aligned('the', 'cat')
      .nonAligned('was', 'observing')
      .aligned('birds', 'in', 'the')
      .nonAligned('little')
      .aligned('trees')
      .nonAligned('this', 'morning')
      .nonAligned(',', 'it')
      .nonAligned('observed', 'birds', 'for', 'two', 'hours')
      .aligned('.')
      .check();
  });

  // from DekkerAlgorithmTest.java:testCaseVariantGraphThreeWitnesses
  it('testCaseVariantGraphThreeWitnesses — quick/fast/red fox', () => {
    const w = createWitnesses(
      'The quick brown fox jumps over the lazy dog',
      'The fast brown fox jumps over the black dog',
      'The red fox jumps over the fence',
    );
    const graph = collateWitnesses(...w);

    expectGraphMatches(graph, w[0])
      .aligned('the')
      .nonAligned('quick')
      .aligned('brown', 'fox', 'jumps', 'over', 'the')
      .nonAligned('lazy')
      .aligned('dog')
      .check();

    expectGraphMatches(graph, w[1])
      .aligned('the')
      .nonAligned('fast')
      .aligned('brown', 'fox', 'jumps', 'over', 'the')
      .nonAligned('black')
      .aligned('dog')
      .check();

    expectGraphMatches(graph, w[2])
      .aligned('the')
      .nonAligned('red')
      .aligned('fox', 'jumps', 'over', 'the')
      .nonAligned('fence')
      .check();
  });

  // from DekkerAlgorithmTest.java:test3dMatching1
  it('test3dMatching1 — four witnesses: a, b, c, a b c', () => {
    const w = createWitnesses('a', 'b', 'c', 'a b c');
    const graph = collateWitnesses(...w);
    expectGraphMatches(graph, w[3]).aligned('a', 'b', 'c').check();
  });

  // from DekkerAlgorithmTest.java:testCaseVariantGraphTwoDifferentWitnesses
  it('testCaseVariantGraphTwoDifferentWitnesses', () => {
    const w = createWitnesses(
      'The quick brown fox jumps over the lazy dog',
      'The fast brown fox jumps over the black dog',
    );
    const graph = collateWitnesses(...w);

    expectGraphMatches(graph, w[0])
      .aligned('the')
      .nonAligned('quick')
      .aligned('brown', 'fox', 'jumps', 'over', 'the')
      .nonAligned('lazy')
      .aligned('dog')
      .check();

    expectGraphMatches(graph, w[1])
      .aligned('the')
      .nonAligned('fast')
      .aligned('brown', 'fox', 'jumps', 'over', 'the')
      .nonAligned('black')
      .aligned('dog')
      .check();
  });

  // from DekkerAlgorithmTest.java:testTwoEqualWitnesses
  it('testTwoEqualWitnesses', () => {
    const w = createWitnesses('The same stuff', 'The same stuff');
    const graph = collateWitnesses(...w);
    expectGraphMatches(graph, w[0]).aligned('the', 'same', 'stuff').check();
    expectGraphMatches(graph, w[1]).aligned('the', 'same', 'stuff').check();
  });

  // from DekkerAlgorithmTest.java:testCaseTwoWitnessesReplacement
  it('testCaseTwoWitnessesReplacement', () => {
    const w = createWitnesses('The black cat', 'The red cat');
    const graph = collateWitnesses(...w);
    expectGraphMatches(graph, w[0]).aligned('the').nonAligned('black').aligned('cat').check();
    expectGraphMatches(graph, w[1]).aligned('the').nonAligned('red').aligned('cat').check();
  });

  // from DekkerAlgorithmTest.java:testDifficultCase1TranspositionOrTwoReplacements
  it('testDifficultCase1 — transposition or two replacements', () => {
    const w = createWitnesses('the cat and the dog', 'the dog and the cat');
    const graph = collateWitnesses(...w);
    expectGraphMatches(graph, w[0])
      .aligned('the')
      .nonAligned('cat')
      .aligned('and the')
      .nonAligned('dog')
      .check();
    expectGraphMatches(graph, w[1])
      .aligned('the')
      .nonAligned('dog')
      .aligned('and the')
      .nonAligned('cat')
      .check();
  });

  // from DekkerAlgorithmTest.java:testDifficultCase2HermansOverreachTest
  it('testDifficultCase2 — Hermans overreach', () => {
    const w = createWitnesses(
      'a b c d F g h i ! K ! q r s t',
      'a b c d F g h i ! q r s t',
      'a b c d E g h i ! q r s t',
    );
    const graph = collateWitnesses(...w);
    expectGraphMatches(graph, w[0])
      .aligned('a b c d f g h i !')
      .nonAligned('k !')
      .aligned('q r s t')
      .check();
    expectGraphMatches(graph, w[1]).aligned('a b c d f g h i ! q r s t').check();
    expectGraphMatches(graph, w[2])
      .aligned('a b c d')
      .nonAligned('e')
      .aligned('g h i ! q r s t')
      .check();
  });

  // from DekkerAlgorithmTest.java:testDifficultCase3DepthShouldMatter (Ignored in Java)
  it.skip('testDifficultCase3 — depth should matter', () => {
    const w = createWitnesses('a b c d e', 'a e c d', 'a d b');
    const graph = collateWitnesses(...w);
    expectGraphMatches(graph, w[0]).aligned('a b c d').nonAligned('e').check();
    expectGraphMatches(graph, w[1]).aligned('a').nonAligned('e').aligned('c d').check();
    expectGraphMatches(graph, w[2]).aligned('a').aligned('d').nonAligned('b').check();
  });

  // from DekkerAlgorithmTest.java:testDifficultCasePartialRightOverlapAndTranspositions
  it('testDifficultCasePartialRightOverlapAndTranspositions — Greek text', () => {
    const w = createWitnesses(
      'και αποκριθεισ ειπεν αυτω ου βλεπεισ ταυτασ μεγαλασ οικοδομασ αμην λεγω σοι ο(υ μη α)φεθη ωδε λιθοσ επι λιθω (οσ ου) μη καταλυθη',
      'και αποκριθεισ ο ι̅σ̅ ειπεν αυτω βλεπεισ Ταυτασ τασ μεγαλασ οικοδομασ λεγω υμιν ου μη αφεθη λιθοσ επι λιθου οσ ου μη καταλυθη',
      'και ο ι̅σ̅ αποκριθεισ ειπεν αυτω βλεπεισ ταυτασ τασ μεγαλασ οικοδομασ ου μη αφεθη λιθοσ επι λιθον οσ ου μη καταλυθη',
    );
    const table = collateWitnessesToTable(...w);
    expect(tableToString(table, w[0])).toBe(
      '|και| | |αποκριθεισ| | |ειπεν|αυτω|ου|βλεπεισ|ταυτασ| |μεγαλασ|οικοδομασ|αμην|λεγω|σοι|ο(υ|μη|α)φεθη|ωδε|λιθοσ|επι|λιθω|(οσ|ου)|μη|καταλυθη|',
    );
    expect(tableToString(table, w[1])).toBe(
      '|και| | |αποκριθεισ|ο|ι̅σ̅|ειπεν|αυτω| |βλεπεισ|ταυτασ|τασ|μεγαλασ|οικοδομασ| |λεγω|υμιν|ου|μη|αφεθη| |λιθοσ|επι|λιθου|οσ|ου|μη|καταλυθη|',
    );
    expect(tableToString(table, w[2])).toBe(
      '|και|ο|ι̅σ̅|αποκριθεισ| | |ειπεν|αυτω| |βλεπεισ|ταυτασ|τασ|μεγαλασ|οικοδομασ| | | |ου|μη|αφεθη| |λιθοσ|επι|λιθον|οσ|ου|μη|καταλυθη|',
    );
  });

  // from DekkerAlgorithmTest.java:testDifficultCasePartialDarwin
  it('testDifficultCasePartialDarwin', () => {
    const w = createWitnesses(
      'those to which the parent-species have been exposed under nature. There is, also, I think, some probability',
      'those to which the parent-species have been exposed under nature. There is also, I think, some probability',
      'those to which the parent-species had been exposed under nature. There is also, I think, some probability',
      'those to which the parent-species had been exposed under nature. There is, also, some probability',
    );
    const graph = collateWitnesses(...w);
    expectGraphMatches(graph, w[0])
      .aligned(
        'those to which the parent-species have been exposed under nature . there is , also , i think , some probability',
      )
      .check();
    expectGraphMatches(graph, w[1])
      .aligned(
        'those to which the parent-species have been exposed under nature . there is also , i think , some probability',
      )
      .check();
    expectGraphMatches(graph, w[2])
      .aligned(
        'those to which the parent-species had been exposed under nature . there is also , i think , some probability',
      )
      .check();
    expectGraphMatches(graph, w[3])
      .aligned('those to which the parent-species had been exposed under nature . there is , ')
      .aligned(4, 'also')
      .aligned(', some probability')
      .check();
  });
});
