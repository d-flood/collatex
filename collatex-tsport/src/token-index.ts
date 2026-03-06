import { coerceToken, tokenNormalized, type Token, type TokenLike } from './token.js';
import type { TokenComparator } from './token-comparator.js';
import type { SimpleWitness, Witness } from './witness.js';

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
  witness: Witness;
  tokens(): Token[];
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

class BlockImpl implements Block {
  readonly start: number;
  readonly length: number;
  private readonly tokenIndex: TokenIndex;
  private readonly end: number;
  private depth: number | null;

  constructor(tokenIndex: TokenIndex, start: number, end: number, length: number, depth: number | null = null) {
    this.tokenIndex = tokenIndex;
    this.start = start;
    this.end = end;
    this.length = length;
    this.depth = depth;
  }

  getDepth(): number {
    if (this.depth !== null) return this.depth;
    const witnesses = new Set<Witness>();
    for (const instance of this.getAllInstances()) {
      witnesses.add(instance.witness);
    }
    this.depth = witnesses.size;
    return this.depth;
  }

  getFrequency(): number {
    return this.end - this.start + 1;
  }

  getAllInstances(): BlockInstance[] {
    const instances: BlockInstance[] = [];
    for (let i = this.start; i <= this.end; i += 1) {
      const startToken = this.tokenIndex.suffix_array[i]!;
      instances.push(new BlockInstanceImpl(this, startToken, this.tokenIndex));
    }
    return instances;
  }

  toString(): string {
    return `LCP interval start at: ${this.start}, depth: ${this.getDepth()}, length: ${this.length} getFrequency:${this.getFrequency()}`;
  }
}

class BlockInstanceImpl implements BlockInstance {
  readonly block: Block;
  readonly startToken: number;
  readonly witness: Witness;
  private readonly tokenIndex: TokenIndex;

  constructor(block: Block, startToken: number, tokenIndex: TokenIndex) {
    this.block = block;
    this.startToken = startToken;
    this.tokenIndex = tokenIndex;
    const token = tokenIndex.token_array[startToken];
    if (token instanceof MarkerToken || !token) {
      throw new Error('Block instance may not start at a marker token');
    }
    this.witness = token.witness;
  }

  tokens(): Token[] {
    return this.tokenIndex.token_array.slice(this.startToken, this.startToken + this.block.length).filter((token): token is Token => !(token instanceof MarkerToken));
  }
}

type WitnessInput = Witness | Token[] | TokenLike[];

function isWitness(value: unknown): value is Witness {
  return !!value && typeof value === 'object' && typeof (value as Witness).getTokens === 'function';
}

function isConcreteToken(value: unknown): value is Token {
  return (
    !!value &&
    typeof value === 'object' &&
    'witness' in (value as Record<string, unknown>) &&
    'content' in (value as Record<string, unknown>) &&
    'normalized' in (value as Record<string, unknown>) &&
    'index' in (value as Record<string, unknown>) &&
    typeof (value as { toString?: unknown }).toString === 'function'
  );
}

function isMarker(token: Token | MarkerToken): token is MarkerToken {
  return token instanceof MarkerToken;
}

function suffixCompare(a: number, b: number, ranks: number[], k: number): number {
  if (ranks[a] !== ranks[b]) return ranks[a]! - ranks[b]!;
  const ra = a + k < ranks.length ? ranks[a + k]! : -1;
  const rb = b + k < ranks.length ? ranks[b + k]! : -1;
  return ra - rb;
}

function buildSuffixArray(values: number[]): number[] {
  const n = values.length;
  if (n === 0) return [];
  let sa = Array.from({ length: n }, (_, index) => index);
  let ranks = [...values];
  for (let k = 1; k < n; k *= 2) {
    sa.sort((a, b) => suffixCompare(a, b, ranks, k));
    const next = new Array<number>(n);
    next[sa[0]!] = 0;
    for (let i = 1; i < n; i += 1) {
      next[sa[i]!] = next[sa[i - 1]!] + (suffixCompare(sa[i - 1]!, sa[i]!, ranks, k) < 0 ? 1 : 0);
    }
    ranks = next;
    if (ranks[sa[n - 1]!] === n - 1) break;
  }
  return sa;
}

function buildLcpArray(values: number[], suffixArray: number[]): number[] {
  const n = values.length;
  if (n === 0) return [];
  const rank = new Array<number>(n);
  for (let i = 0; i < n; i += 1) rank[suffixArray[i]!] = i;
  const lcp = new Array<number>(n).fill(0);
  lcp[0] = -1;
  let h = 0;
  for (let i = 0; i < n; i += 1) {
    const r = rank[i]!;
    if (r === 0) continue;
    const j = suffixArray[r - 1]!;
    while (i + h < n && j + h < n && values[i + h] === values[j + h]) {
      h += 1;
    }
    lcp[r] = h;
    if (h > 0) h -= 1;
  }
  return lcp;
}

class MarkerTokenComparatorImpl {
  constructor(public readonly baseComparator: TokenComparator | { compare(a: Token, b: Token): number }) {}

  compare(a: Token | MarkerToken, b: Token | MarkerToken): number {
    const aMarker = isMarker(a);
    const bMarker = isMarker(b);
    if (aMarker && bMarker) return a.witnessIndex - b.witnessIndex;
    if (aMarker) return -1;
    if (bMarker) return 1;
    if ('compare' in this.baseComparator && typeof this.baseComparator.compare === 'function') {
      return this.baseComparator.compare(a, b);
    }
    const an = tokenNormalized(a);
    const bn = tokenNormalized(b);
    if (an === bn) return 0;
    return an < bn ? -1 : 1;
  }
}

export class TokenIndex {
  suffix_array: number[] = [];
  LCP_array: number[] = [];
  token_array: (Token | MarkerToken)[] = [];
  private readonly witnessStart = new Map<Witness, number>();
  private readonly witnessInstances = new Map<Witness, BlockInstance[]>();
  private readonly witnesses: Witness[] = [];

  constructor(
    private readonly comparator: TokenComparator,
    ...inputs: (SimpleWitness[] | [Token[], Token[]] | WitnessInput)[]
  ) {
    const flattened = inputs.length === 1 && Array.isArray(inputs[0]) ? (inputs[0] as WitnessInput[]) : (inputs as WitnessInput[]);
    this.witnesses = flattened.map((input, witnessIndex) => this.normalizeWitness(input, witnessIndex)).filter((witness): witness is Witness => witness !== null);
  }

  private normalizeWitness(input: WitnessInput, witnessIndex: number): Witness | null {
    if (isWitness(input)) {
      return input;
    }
    if (!Array.isArray(input)) {
      return null;
    }
    if (input.length === 0) {
      return {
        sigil: `W${witnessIndex}`,
        getTokens: () => [],
      };
    }
    const tokens = input.map((token, index) =>
      isConcreteToken(token) ? token : coerceToken(token as TokenLike, index),
    );
    const witness = tokens[0]!.witness;
    return {
      sigil: witness.sigil,
      getTokens: () => tokens,
    };
  }

  prepare(): void {
    this.prepareTokenArray();
    const encoded = this.encodeTokensForSuffixArray();
    this.suffix_array = buildSuffixArray(encoded);
    this.LCP_array = buildLcpArray(encoded, this.suffix_array);
    this.constructWitnessToBlockInstancesMap();
  }

  private prepareTokenArray(): void {
    this.token_array = [];
    this.witnessStart.clear();
    for (const [index, witness] of this.witnesses.entries()) {
      this.witnessStart.set(witness, this.token_array.length);
      const tokens = witness.getTokens().map((token, tokenIndex) => {
        const coerced = coerceToken(token, tokenIndex);
        const tokenData = coerced.tokenData ?? { t: coerced.content, n: coerced.normalized };
        tokenData._sigil = witness.sigil;
        tokenData._token_array_position = this.token_array.length + tokenIndex;
        (coerced as Token & { tokenData: typeof tokenData }).tokenData = tokenData;
        return coerced;
      });
      this.token_array.push(...tokens, new MarkerToken(index + 1));
    }
  }

  private encodeTokensForSuffixArray(): number[] {
    const termToRank = new Map<string, number>();
    let nextRank = 0;
    return this.token_array.map((token) => {
      if (token instanceof MarkerToken) {
        const markerKey = token.toString();
        if (!termToRank.has(markerKey)) {
          termToRank.set(markerKey, nextRank);
          nextRank += 1;
        }
        return termToRank.get(markerKey) ?? 0;
      }
      const normalized = tokenNormalized(token);
      if (!termToRank.has(normalized)) {
        termToRank.set(normalized, nextRank);
        nextRank += 1;
      }
      return termToRank.get(normalized) ?? 0;
    });
  }

  splitLCP_ArrayIntoIntervals(): Block[] {
    const closedIntervals: Block[] = [];
    let previous = 0;
    const open: Array<{ start: number; length: number }> = [];
    for (let index = 0; index < this.LCP_array.length; index += 1) {
      const lcp = this.LCP_array[index]!;
      if (lcp > previous) {
        open.push({ start: index - 1, length: lcp });
        previous = lcp;
      } else if (lcp < previous) {
        while (open.length > 0 && open[open.length - 1]!.length > lcp) {
          const interval = open.pop()!;
          closedIntervals.push(new BlockImpl(this, interval.start, index - 1, interval.length));
        }
        if (lcp > 0 && closedIntervals.length > 0) {
          const start = closedIntervals[closedIntervals.length - 1]!.start;
          open.push({ start, length: lcp });
        }
        previous = lcp;
      }
    }
    for (const interval of open) {
      if (interval.length > 0) {
        closedIntervals.push(new BlockImpl(this, interval.start, this.LCP_array.length - 1, interval.length));
      }
    }
    return closedIntervals;
  }

  private constructWitnessToBlockInstancesMap(): void {
    this.witnessInstances.clear();
    for (const block of this.splitLCP_ArrayIntoIntervals()) {
      for (const instance of block.getAllInstances()) {
        const list = this.witnessInstances.get(instance.witness) ?? [];
        list.push(instance);
        this.witnessInstances.set(instance.witness, list);
      }
    }
  }

  getStartTokenPositionForWitness(witness: Witness): number {
    return this.witnessStart.get(witness) ?? -1;
  }

  getBlockInstancesForWitness(witness: Witness): BlockInstance[] {
    return this.witnessInstances.get(witness) ?? [];
  }

  prepareIfNeeded(): void {
    if (this.suffix_array.length === 0 && this.token_array.length === 0) {
      this.prepare();
    }
  }

  static MarkerTokenComparator = MarkerTokenComparatorImpl;

  static MarkerToken = MarkerToken;
}
