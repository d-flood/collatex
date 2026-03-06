import type { Token } from './token.js';
import type { TokenComparator } from './token-comparator.js';
import type { SimpleWitness } from './witness.js';

export interface Block {
  start: number;
  length: number;
  getDepth(): number;
  getFrequency(): number;
  getAllInstances(): BlockInstance[];
  toString(): string;
}

export interface BlockInstance {
  block: Block;
  startToken: number;
}

export class MarkerToken {
  readonly witnessIndex: number;

  constructor(witnessIndex: number) {
    this.witnessIndex = witnessIndex;
  }

  toString(): string {
    return `$${this.witnessIndex}`;
  }
}

export class TokenIndex {
  suffix_array: number[] = [];
  LCP_array: number[] = [];
  token_array: (Token | MarkerToken)[] = [];

  constructor(
    _comparator: TokenComparator,
    ..._witnesses: (SimpleWitness[] | [Token[], Token[]])
  ) {
    // Stub: not yet implemented
  }

  prepare(): void {
    throw new Error('TokenIndex.prepare not implemented');
  }

  splitLCP_ArrayIntoIntervals(): Block[] {
    throw new Error('TokenIndex.splitLCP_ArrayIntoIntervals not implemented');
  }

  static MarkerTokenComparator = class {
    constructor(_baseComparator: TokenComparator | { compare(a: Token, b: Token): number }) {}

    compare(_a: Token | MarkerToken, _b: Token | MarkerToken): number {
      throw new Error('MarkerTokenComparator.compare not implemented');
    }
  };

  static MarkerToken = MarkerToken;
}
