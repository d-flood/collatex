import { SimpleToken, type Token, type TokenData, normalizeTokenString } from './token.js';

export interface Witness {
  readonly sigil: string;
  getTokens(): Token[];
}

const WORD_PUNCTUATION_PATTERN = /[.?!,;:]+\s*|[^.?!,;:\s]+\s*/gu;

function tokenizePlainText(content: string): TokenData[] {
  const matches = content.match(WORD_PUNCTUATION_PATTERN) ?? [];
  return matches.map((piece) => ({
    t: piece,
    n: normalizeTokenString(piece),
  }));
}

export function tokenizePlainTextNormalized(content: string): string[] {
  return tokenizePlainText(content).map((token) => String(token.n ?? ''));
}

export class SimpleWitness implements Witness {
  readonly sigil: string;
  protected _tokens: Token[];

  constructor(sigil: string, content?: string) {
    this.sigil = sigil;
    this._tokens = [];
    if (content !== undefined) {
      this._tokens = tokenizePlainText(content).map(
        (tokenData, index) =>
          new SimpleToken({
            witness: this,
            content: tokenData.t,
            normalized: normalizeTokenString(String(tokenData.n ?? tokenData.t ?? '')),
            index,
            tokenData,
          }),
      );
    }
  }

  getTokens(): Token[] {
    return this._tokens;
  }
}

export class PretokenizedWitness implements Witness {
  readonly sigil: string;
  private readonly tokens: Token[];

  constructor(sigil: string, tokenData: TokenData[]) {
    this.sigil = sigil;
    this.tokens = tokenData.map(
      (data, index) =>
        new SimpleToken({
          witness: this,
          content: typeof data.t === 'string' ? data.t : '',
          normalized: normalizeTokenString(String(data.n ?? data.t ?? '')),
          index,
          tokenData: { ...data },
        }),
    );
  }

  getTokens(): Token[] {
    return this.tokens;
  }
}

export function witnessFromInput(input: { id: string; content?: string; tokens?: TokenData[] }): Witness {
  if (Array.isArray(input.tokens)) {
    return new PretokenizedWitness(input.id, input.tokens);
  }
  return new SimpleWitness(input.id, input.content ?? '');
}
