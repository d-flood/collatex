import type { SimpleWitness } from './witness.js';
import type { VariantGraph } from './variant-graph.js';
import type { AlignmentTable } from './alignment-table.js';

export interface CollationOptions {
  nearMatch?: boolean;
  segmentation?: boolean;
  output?: 'table' | 'json' | 'tei' | 'graph';
  layout?: 'horizontal' | 'vertical';
}

export interface CollationAlgorithm {
  collate(graph: VariantGraph, witnesses: SimpleWitness[]): void;
}

export interface InspectableCollationAlgorithm extends CollationAlgorithm {
  getPhraseMatches(): string[][];
  getTranspositions(): string[][];
  setMergeTranspositions(merge: boolean): void;
}

export class Collation {
  private _witnesses: SimpleWitness[] = [];

  addPlainWitness(sigil: string, content: string): SimpleWitness {
    const { SimpleWitness: SW } = require('./witness.js');
    const w = new SW(sigil, content);
    this._witnesses.push(w);
    return w;
  }

  get witnesses(): SimpleWitness[] {
    return this._witnesses;
  }
}

export function collate(..._args: unknown[]): AlignmentTable {
  throw new Error('collate not implemented');
}
