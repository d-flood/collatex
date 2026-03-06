import { SimpleWitness, tokenizePlainTextNormalized } from '#src/witness.js';
import { VariantGraph, type VariantGraphVertex } from '#src/variant-graph.js';
import { AlignmentTable } from '#src/alignment-table.js';
import { EditGraphAligner } from '#src/collation.js';
import type { Token } from '#src/token.js';
import type { Witness } from '#src/witness.js';

const SIGLA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function createWitnesses(...contents: string[]): SimpleWitness[] {
  return contents.map((content, i) => new SimpleWitness(SIGLA[i]!, content));
}

export function collateToTable(...contents: string[]): AlignmentTable {
  const witnesses = createWitnesses(...contents);
  return collateWitnessesToTable(...witnesses);
}

export function collateWitnessesToTable(...witnesses: SimpleWitness[]): AlignmentTable {
  const graph = collateWitnesses(...witnesses);
  return AlignmentTable.from(graph);
}

export function collateWitnesses(...witnesses: SimpleWitness[]): VariantGraph {
  const graph = new VariantGraph();
  if (witnesses.length === 0) return graph;
  const algorithm = new EditGraphAligner();
  algorithm.setMergeTranspositions(true);
  algorithm.collate(graph, witnesses.map((witness) => witness.getTokens()));
  return graph;
}

export function collateIntoGraph(graph: VariantGraph, ...witnesses: SimpleWitness[]): void {
  if (witnesses.length === 0) return;
  const algorithm = new EditGraphAligner();
  algorithm.setMergeTranspositions(true);
  algorithm.collate(graph, witnesses.map((witness) => witness.getTokens()));
}

export function tableToString(table: AlignmentTable, witness: Witness): string {
  return table.toStringForWitness(witness);
}

export function tableToFullString(table: AlignmentTable): string {
  return table.toString();
}

function flattenWitnessPath(graph: VariantGraph, witness: Witness): Array<{
  token: Token;
  aligned: boolean;
  witnessCount: number;
}> {
  const path = graph.pathForWitness(witness);
  const flattened: Array<{ token: Token; aligned: boolean; witnessCount: number }> = [];
  for (const vertex of path) {
    if (vertex === graph.getStart() || vertex === graph.getEnd()) continue;
    const witnessTokens = vertex.tokens().filter((token) => token.witness.sigil === witness.sigil);
    const witnessCount = new Set(vertex.tokens().map((token) => token.witness.sigil)).size;
    for (const token of witnessTokens) {
      flattened.push({
        token,
        aligned: witnessCount > 1,
        witnessCount,
      });
    }
  }
  return flattened;
}

export class GraphExpectation {
  private readonly expectations: Array<{
    tokens: string[];
    aligned: boolean;
    numberOfWitnesses?: number;
  }> = [];

  constructor(
    private readonly graph: VariantGraph,
    private readonly witness: Witness,
  ) {}

  aligned(...tokens: string[]): this;
  aligned(numberOfWitnesses: number, ...tokens: string[]): this;
  aligned(...args: unknown[]): this {
    let numberOfWitnesses: number | undefined;
    let tokens: string[];
    if (typeof args[0] === 'number') {
      numberOfWitnesses = args[0] as number;
      tokens = args.slice(1) as string[];
    } else {
      tokens = args as string[];
    }
    for (const token of tokens) {
      this.expectations.push({ tokens: tokenizePlainTextNormalized(token), aligned: true, numberOfWitnesses });
    }
    return this;
  }

  nonAligned(...tokens: string[]): this {
    for (const token of tokens) {
      this.expectations.push({ tokens: tokenizePlainTextNormalized(token), aligned: false });
    }
    return this;
  }

  check(): void {
    const actual = flattenWitnessPath(this.graph, this.witness);
    const expected = this.expectations.flatMap((entry) =>
      entry.tokens.map((token) => ({
        token,
        aligned: entry.aligned,
        numberOfWitnesses: entry.numberOfWitnesses,
      })),
    );
    if (actual.length !== expected.length) {
      throw new Error(`Expected ${expected.length} tokens for ${this.witness.sigil}, found ${actual.length}`);
    }
    expected.forEach((entry, index) => {
      const actualEntry = actual[index]!;
      if (actualEntry.token.normalized !== entry.token.toLowerCase()) {
        throw new Error(`Token mismatch at ${index}: expected ${entry.token}, found ${actualEntry.token.normalized}`);
      }
      if (actualEntry.aligned !== entry.aligned) {
        throw new Error(`Alignment mismatch at ${index}: expected ${entry.aligned}, found ${actualEntry.aligned}`);
      }
      if (entry.numberOfWitnesses !== undefined && actualEntry.witnessCount !== entry.numberOfWitnesses) {
        throw new Error(
          `Witness-count mismatch at ${index}: expected ${entry.numberOfWitnesses}, found ${actualEntry.witnessCount}`,
        );
      }
    });
  }
}

export function expectGraph(graph: VariantGraph, witness: Witness): GraphExpectation {
  return new GraphExpectation(graph, witness);
}

export function expectGraphMatches(graph: VariantGraph, witness: Witness): GraphExpectation {
  return new GraphExpectation(graph, witness);
}
