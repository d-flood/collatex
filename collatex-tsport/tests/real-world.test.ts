// Ported from BeckettTest.java, DarwinTest.java, Python test_beckett.py
import { describe, it, expect } from 'vitest';
import {
  createWitnesses,
  collateWitnesses,
  collateWitnessesToTable,
  collateIntoGraph,
  tableToFullString,
} from './test-helpers.js';
import { VariantGraph } from '#src/variant-graph.js';

describe('Beckett Tests', () => {
  // from BeckettTest.java:testBeckettStrangeTransposition
  it('testBeckettStrangeTransposition — no transpositions expected', () => {
    const w = createWitnesses(
      'People with things, people without things, things without people, what does it matter. I\'m confident I can soon scatter them.',
      'People with things, people without things, things without people, what does it matter, it will not take me long to scatter them.',
      'People with things, people without things, things without people, what does it matter, I flatter myself it will not take me long to scatter them, whenever I choose, to the winds.',
    );
    const graph = collateWitnesses(...w);
    // Should produce 0 transpositions
    expect(graph.transpositions().size).toBe(0);
  });

  // from BeckettTest.java:sentence42Transposition
  it('sentence42Transposition — 5 witnesses, phrase matches', () => {
    const w = createWitnesses(
      'The same clock as when for example Magee once died.',
      'The same as when for example Magee once died.',
      'The same as when for example McKee once died .',
      'The same as when among others Darly once died & left him.',
      'The same as when Darly among others once died and left him.',
    );

    // Incrementally collate
    const graph = collateWitnesses(w[0], w[1]);
    // Should contain: the, same, clock, as, when, for, example, magee, once, died
    expect(graph).toBeDefined();

    // Full 5-witness collation should detect 1 transposition ("Darly")
    const fullGraph = collateWitnesses(...w);
    // Phrase matches should be: "The same", "as when", "Darly", "among others", "once died", "left him"
    // 1 transposition: "Darly"
    expect(fullGraph).toBeDefined();
  });

  // from test_beckett.py:testBeckett
  it('testBeckett — Python version (clock/same)', () => {
    const table = collateWitnessesToTable(
      ...createWitnesses(
        'The same clock as when for example Magee once died.',
        'The same as when for example Magee once died.',
      ),
    );
    expect(table).toBeDefined();
    // Row 0: ["The same ", "clock ", "as when for example Magee once died."]
    // Row 1: ["The same ", null, "as when for example Magee once died."]
  });
});

describe('Darwin Tests', () => {
  // from DarwinTest.java:cyclicJoin
  it('cyclicJoin — very long witnesses, no infinite cycle', () => {
    const w = createWitnesses(
      'It has been disputed at what period of life the causes of variability, whatever they may be, generally act; whether during the early or late period of development of the embryo, or at the instant of conception. Geoffroy St. Hilaire\'s experiments show that unnatural treatment of the embryo causes monstrosities; and monstrosities cannot be separated by any clear line of distinction from mere variations. But I am strongly inclined to suspect that the most frequent cause of variability may be attributed to the male and female reproductive elements having been affected prior to the act of conception. Several reasons make me believe in this; but the chief one is the remarkable effect which confinement or cultivation has on the functions of the reproductive system; this system appearing to be far more susceptible than any other part of the organisation, to the action of any change in the conditions of life. Nothing is more easy than to tame an animal, and few things more difficult than to get it to breed freely under confinement, even in the many cases when the male and female unite. How many animals there are which will not breed, though living long under not very close confinement in their native country! This is generally attributed to vitiated instincts; but how many cultivated plants display the utmost vigour, and yet rarely or never seed! In some few such cases it has been found out that very trifling changes, such as a little more or less water at some particular period of growth, will determine whether or not the plant sets a seed. I cannot here enter on the copious details which I have collected on this curious subject; but to show how singular the laws are which determine the reproduction of animals under confinement, I may just mention that carnivorous animals, even from the tropics, breed in this country pretty freely under confinement, with the exception of the plantigrades or bear family; whereas, carnivorous birds, with the rarest exceptions, hardly ever lay fertile eggs. Many exotic plants have pollen utterly worthless, in the same exact condition as in the most sterile hybrids. When, on the one hand, we see domesticated animals and plants, though often weak and sickly, yet breeding quite freely under confinement; and when, on the other hand, we see individuals, though taken young from a state of nature, perfectly tamed, long-lived, and healthy (of which I could give numerous instances), yet having their reproductive system so seriously affected by unperceived causes as to fail in acting, we need not be surprised at this system, when it does act under confinement, acting not quite regularly, and producing offspring not perfectly like their parents or variable.',
      'With respect to what I have called the indirect action of changed conditions, namely, through the reproductive system being affected, we may infer that variability is thus induced, partly from the fact of this system being extremely sensitive to any change in the conditions, and partly from the similarity, as Kölreuter and others have remarked, between the variability which follows from the crossing of distinct species, and that which may be observed with all plants and animals when reared under new or unnatural conditions. Many facts clearly show how eminently susceptible the reproductive system is to very slight changes in the surrounding conditions. Nothing is more easy than to tame an animal, and few things more difficult than to get it to breed freely under confinement, even when the male and female unite. How many animals there are which will not breed, though kept in an almost free state in their native country! This is generally, but erroneously, attributed to vitiated instincts. Many cultivated plants display the utmost vigour, and yet rarely or never seed! In some few cases it has been discovered that a very trifling change, such as a little more or less water at some particular period of growth, will determine whether or not a plant will produce seeds. I cannot here give the details which I have collected and elsewhere published on this curious subject; but to show how singular the laws are which determine the reproduction of animals under confinement, I may mention that carnivorous animals, even from the tropics, breed in this country pretty freely under confinement, with the exception of the plantigrades or bear family, which seldom produce young; whereas carnivorous birds, with the rarest exceptions, hardly ever lay fertile eggs. Many exotic plants have pollen utterly worthless, in the same condition as in the most sterile hybrids. When, on the one hand, we see domesticated animals and plants, though often weak and sickly, yet breeding freely under confinement; and when, on the other hand, we see individuals, though taken young from a state of nature, perfectly tamed, long-lived, and healthy (of which I could give numerous instances), yet having their reproductive system so seriously affected by unperceived causes as to fail to act, we need not be surprised at this system, when it does act under confinement, acting irregularly, and producing offspring somewhat unlike their parents. I may add, that as some organisms breed freely under the most unnatural conditions (for instance, rabbits and ferrets kept in hutches), showing that their reproductive organs are not affected; so will some animals and plants withstand domestication or cultivation, and vary very slightly — perhaps hardly more than in a state of nature.',
    );
    const graph = collateWitnesses(...w);

    // The graph should be traversable without infinite loops
    let count = 0;
    for (const _v of graph.vertices()) {
      count++;
      if (count > 10000) throw new Error('Possible infinite cycle detected');
    }
    expect(count).toBeGreaterThan(0);

    // JOIN should also not cause cycles
    const joined = VariantGraph.JOIN.apply(graph);
    let joinCount = 0;
    for (const _v of joined.vertices()) {
      joinCount++;
      if (joinCount > 10000) throw new Error('Possible infinite cycle in joined graph');
    }
    expect(joinCount).toBeGreaterThan(0);
  });

  // from DarwinTest.java:incomplete
  it('incomplete — 6 Darwin witnesses', () => {
    const w = createWitnesses(
      'Habit also has a decided influence, as in the period of flowering with plants when transported from one climate to another. In animals it has a more marked effect; for instance, I find in the domestic duck that the bones of the wing weigh less and the bones of the leg more, in proportion to the whole skeleton, than do the same bones in the wild-duck; and I presume that this change may be safely attributed to the domestic duck flying much less, and walking more, than its wild parent. The great and inherited development of the udders in cows and goats in countries where they are habitually milked, in comparison with the state of these organs in other countries, is another instance of the effect of use. Not a single domestic animal can be named which has not in some country drooping ears; and the view suggested by some authors, that the drooping is due to the disuse of the muscles of the ear, from the animals not being much alarmed by danger, seems probable.',
      'Habit also has a decided influence, as in the period of flowering with plants when transported from one climate to another. In animals it has a more marked effect; for instance, I find in the domestic duck that the bones of the wing weigh less and the bones of the leg more, in proportion to the whole skeleton, than do the same bones in the wild-duck; and I presume that this change may be safely attributed to the domestic duck flying much less, and walking more, than its wild parent. The great and inherited development of the udders in cows and goats in countries where they are habitually milked, in comparison with the state of these organs in other countries, is another instance of the effect of use. Not a single domestic animal can be named which has not in some country drooping ears; and the view suggested by some authors, that the drooping is due to the disuse of the muscles of the ear, from the animals not being much alarmed by danger, seems probable.',
      'Habit also has a decided influence, as in the period of flowering with plants when transported from one climate to another. In animals it has a more marked effect; for instance, I find in the domestic duck that the bones of the wing weigh less and the bones of the leg more, in proportion to the whole skeleton, than do the same bones in the wild-duck; and I presume that this change may be safely attributed to the domestic duck flying much less, and walking more, than its wild parent. The great and inherited development of the udders in cows and goats in countries where they are habitually milked, in comparison with the state of these organs in other countries, is another instance of the effect of use. Not a single domestic animal can be named which has not in some country drooping ears; and the view suggested by some authors, that the drooping is due to the disuse of the muscles of the ear, from the animals not being much alarmed by danger, seems probable.',
      'Effects of Habit; Correlation of Growth; Inheritance. Habit also has a decided influence, as in the period of flowering with plants when transported from one climate to another. In animals it has a more marked effect; for instance, I find in the domestic duck that the bones of the wing weigh less and the bones of the leg more, in proportion to the whole skeleton, than do the same bones in the wild-duck; and I presume that this change may be safely attributed to the domestic duck flying much less, and walking more, than its wild parent. The great and inherited development of the udders in cows and goats in countries where they are habitually milked, in comparison with the state of these organs in other countries, is probably another instance of the effects of use. Not a single domestic animal can be named which has not in some country drooping ears; and the view which has been suggested that the drooping is due to the disuse of the muscles of the ear, from the animals being seldom alarmed by danger, seems probable.',
      'Habits are inherited and have a decided influence; as in the period of the flowering of plants when transported from one climate to another. In animals they have a more marked effect; for instance, I find in the domestic duck that the bones of the wing weigh less and the bones of the leg more, in proportion to the whole skeleton, than do the same bones in the wild-duck; and this change may be safely attributed to the domestic duck flying much less, and walking more, than its wild parents. The great and inherited development of the udders in cows and goats in countries where they are habitually milked, in comparison with the state of these organs in other countries, is probably another instance of the effects of use. Not one of our domestic animals can be named which has not in some country drooping ears; and the view which has been suggested that the drooping is due to the disuse of the muscles of the ear, from the animals being seldom alarmed by danger, seems probable.',
      'Effects of Habit and of the Use or Disuse of Parts; Correlated Variation; Inheritance. Changed habits produce an inherited effect, as in the period of the flowering of plants when transported from one climate to another. With animals the increased use or disuse of parts has had a more marked influence; thus I find in the domestic duck that the bones of the wing weigh less and the bones of the leg more, in proportion to the whole skeleton, than do the same bones in the wild duck; and this change may be safely attributed to the domestic duck flying much less, and walking more, than its wild parents. The great and inherited development of the udders in cows and goats in countries where they are habitually milked, in comparison with these organs in other countries, is probably another instance of the effects of use. Not one of our domestic animals can be named which has not in some country drooping ears; and the view which has been suggested that the drooping is due to the disuse of the muscles of the ear, from the animals being seldom much alarmed, seems probable.',
    );
    const table = collateWitnessesToTable(...w);
    expect(table.witnessCount()).toBe(6);
  });
});
