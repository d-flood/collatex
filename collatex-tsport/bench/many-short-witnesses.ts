import { Collation, collate, type VariantGraph } from '../src/index.js';

type Scenario = {
  name: string;
  count: number;
  contents: string[];
};

function makeDuplicateHeavy(count: number): Scenario {
  const pool = [
    'alpha beta gamma delta epsilon zeta',
    'alpha beta gamma delta epsilon eta',
    'alpha beta gamma theta epsilon zeta',
    'alpha beta iota delta epsilon zeta',
    'alpha beta gamma delta kappa zeta',
    'alpha lambda gamma delta epsilon zeta',
    'alpha beta gamma delta epsilon mu',
    'nu beta gamma delta epsilon zeta',
  ];
  return {
    name: `duplicate-heavy-${count}`,
    count,
    contents: Array.from({ length: count }, (_, index) => pool[index % pool.length]!),
  };
}

function makeMostlyUnique(count: number): Scenario {
  return {
    name: `mostly-unique-${count}`,
    count,
    contents: Array.from(
      { length: count },
      (_, index) => `alpha beta variant${index} gamma branch${index % 31} delta witness${index}`,
    ),
  };
}

function buildGraph(contents: string[]): VariantGraph {
  const collation = new Collation();
  contents.forEach((content, index) => {
    collation.addPlainWitness(`W${index}`, content);
  });
  return collate(collation, { output: 'graph' }) as VariantGraph;
}

function summarizeGraph(graph: VariantGraph): { contentVertices: number; maxWitnessSupport: number } {
  const contentVertices = graph
    .vertices()
    .filter((vertex) => vertex !== graph.getStart() && vertex !== graph.getEnd());
  const maxWitnessSupport = Math.max(
    0,
    ...contentVertices.map((vertex) => new Set(vertex.tokens().map((token) => token.witness.sigil)).size),
  );
  return { contentVertices: contentVertices.length, maxWitnessSupport };
}

function runScenario(scenario: Scenario): void {
  const start = performance.now();
  const graph = buildGraph(scenario.contents);
  const durationMs = performance.now() - start;
  const uniqueCount = new Set(scenario.contents).size;
  const { contentVertices, maxWitnessSupport } = summarizeGraph(graph);
  console.log(
    [
      scenario.name,
      `witnesses=${scenario.count}`,
      `unique=${uniqueCount}`,
      `vertices=${contentVertices}`,
      `max_support=${maxWitnessSupport}`,
      `ms=${durationMs.toFixed(2)}`,
    ].join(' '),
  );
}

for (const count of [100, 250, 500, 1000]) {
  runScenario(makeDuplicateHeavy(count));
}

for (const count of [100, 250, 500, 1000]) {
  runScenario(makeMostlyUnique(count));
}
