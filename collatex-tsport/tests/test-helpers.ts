import { SimpleWitness } from '#src/witness.js';
import { VariantGraph, VariantGraphVertex } from '#src/variant-graph.js';
import { AlignmentTable } from '#src/alignment-table.js';
import type { Token } from '#src/token.js';
import type { Witness } from '#src/witness.js';

const SIGLA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Create SimpleWitness instances with sigla A, B, C, ...
 * Mirrors AbstractTest.createWitnesses()
 */
export function createWitnesses(...contents: string[]): SimpleWitness[] {
  return contents.map((content, i) => new SimpleWitness(SIGLA[i], content));
}

/**
 * Collate witnesses and return alignment table.
 * Delegates to the collation engine (throws until implemented).
 */
export function collateToTable(...contents: string[]): AlignmentTable {
  const witnesses = createWitnesses(...contents);
  return collateWitnessesToTable(...witnesses);
}

/**
 * Collate SimpleWitness instances and return alignment table.
 */
export function collateWitnessesToTable(...witnesses: SimpleWitness[]): AlignmentTable {
  const graph = collateWitnesses(...witnesses);
  return AlignmentTable.from(graph);
}

/**
 * Collate witnesses and return the variant graph.
 */
export function collateWitnesses(...witnesses: SimpleWitness[]): VariantGraph {
  // This will delegate to the DekkerAlgorithm once implemented
  throw new Error('collateWitnesses not implemented');
}

/**
 * Collate into an existing graph (for incremental collation).
 */
export function collateIntoGraph(graph: VariantGraph, ...witnesses: SimpleWitness[]): void {
  throw new Error('collateIntoGraph not implemented');
}

/**
 * Format alignment table row for a specific witness.
 * Produces |pipe|delimited|format| matching Java's AbstractTest.toString(table, witness).
 */
export function tableToString(table: AlignmentTable, witness: Witness): string {
  return table.toStringForWitness(witness);
}

/**
 * Format the full alignment table (all witnesses).
 * Produces "A: |...\nB: |...\n" format.
 */
export function tableToFullString(table: AlignmentTable): string {
  return table.toString();
}

// --- Fluent graph assertion builder ---

export class GraphExpectation {
  private graph: VariantGraph;
  private witness: Witness;
  private expectations: Array<{
    tokens: string[];
    aligned: boolean;
    numberOfWitnesses?: number;
  }> = [];

  constructor(graph: VariantGraph, witness: Witness) {
    this.graph = graph;
    this.witness = witness;
  }

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
      const split = token.split(' ');
      this.expectations.push({ tokens: split, aligned: true, numberOfWitnesses });
    }
    return this;
  }

  nonAligned(...tokens: string[]): this {
    for (const token of tokens) {
      const split = token.split(' ');
      this.expectations.push({ tokens: split, aligned: false });
    }
    return this;
  }

  /** Check expectations against the graph. Throws descriptive error on mismatch. */
  check(): void {
    // Walk graph vertices for this witness
    // This is a stub — will work once graph traversal is implemented
    throw new Error('GraphExpectation.check not implemented — graph traversal not yet available');
  }
}

/**
 * Fluent graph assertion: expectGraph(graph, witness).aligned("the").nonAligned("black").aligned("cat")
 *
 * In tests, call .check() or use expectGraphMatches() helper.
 */
export function expectGraph(graph: VariantGraph, witness: Witness): GraphExpectation {
  return new GraphExpectation(graph, witness);
}

/**
 * Assert that the graph matches the expected pattern for a witness.
 * This is the primary assertion helper for graph-based tests.
 */
export function expectGraphMatches(graph: VariantGraph, witness: Witness): GraphExpectation {
  return new GraphExpectation(graph, witness);
}
