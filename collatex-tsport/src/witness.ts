import type { Token } from './token.js';

export interface Witness {
  readonly sigil: string;
}

export class SimpleWitness implements Witness {
  readonly sigil: string;
  private _tokens: Token[] = [];

  constructor(sigil: string, content?: string) {
    this.sigil = sigil;
    if (content !== undefined) {
      this._tokens = content
        .trim()
        .split(/\s+/)
        .filter((s) => s.length > 0)
        .map((word, index) => ({
          witness: this,
          content: word,
          normalized: word.toLowerCase(),
          index,
        }));
    }
  }

  getTokens(): Token[] {
    return this._tokens;
  }
}
