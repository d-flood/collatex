import type { Witness } from './witness.js';

export interface Token {
  readonly witness: Witness;
  readonly content: string;
  readonly normalized: string;
  readonly index: number;
}
