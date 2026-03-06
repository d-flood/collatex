import type { Witness } from './witness.js';

export interface TokenData {
  t?: string;
  n?: string;
  [key: string]: unknown;
}

export interface Token {
  readonly witness: Witness;
  readonly content: string;
  readonly normalized: string;
  readonly index: number;
  tokenData?: TokenData;
  toString(): string;
}

export interface TokenLike {
  witness: Witness;
  content?: string;
  normalized?: string;
  index?: number;
  tokenData?: TokenData;
  toString?(): string;
}

export function normalizeTokenString(value: string): string {
  return value.replace(/\s+$/u, '').toLowerCase();
}

export function tokenContent(token: Token | TokenLike): string {
  if ('content' in token && typeof token.content === 'string') return token.content;
  if ('tokenData' in token && token.tokenData?.t && typeof token.tokenData.t === 'string') {
    return token.tokenData.t;
  }
  if (typeof token.toString === 'function') {
    return token.toString();
  }
  return '';
}

export function tokenNormalized(token: Token | TokenLike): string {
  if ('normalized' in token && typeof token.normalized === 'string') return token.normalized;
  if ('tokenData' in token) {
    const normalized = token.tokenData?.n;
    if (typeof normalized === 'string') return normalizeTokenString(normalized);
  }
  return normalizeTokenString(tokenContent(token));
}

export class SimpleToken implements Token {
  readonly witness: Witness;
  readonly content: string;
  readonly normalized: string;
  readonly index: number;
  readonly tokenData: TokenData;

  constructor(args: {
    witness: Witness;
    content?: string;
    normalized?: string;
    index: number;
    tokenData?: TokenData;
  }) {
    this.witness = args.witness;
    const content = args.content ?? args.tokenData?.t;
    this.content = typeof content === 'string' ? content : '';
    this.normalized = args.normalized ?? tokenNormalized({ content: this.content, tokenData: args.tokenData, witness: args.witness });
    this.index = args.index;
    this.tokenData = {
      ...(args.tokenData ?? {}),
      t: this.content,
      n: this.normalized,
    };
  }

  toString(): string {
    return this.normalized;
  }
}

export function coerceToken(token: Token | TokenLike, indexOverride?: number): Token {
  if ('tokenData' in token && 'content' in token && 'normalized' in token && typeof token.toString === 'function') {
    if (indexOverride === undefined) {
      return token as Token;
    }
  }
  return new SimpleToken({
    witness: token.witness,
    content: tokenContent(token),
    normalized: tokenNormalized(token),
    index: indexOverride ?? token.index ?? 0,
    tokenData: token.tokenData ?? { t: tokenContent(token), n: tokenNormalized(token) },
  });
}
