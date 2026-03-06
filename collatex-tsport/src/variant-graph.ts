import type { Token } from './token.js';
import type { Witness } from './witness.js';

export class VariantGraphVertex {
  private _tokens: Token[] = [];

  tokens(): Token[] {
    return this._tokens;
  }

  addToken(token: Token): void {
    this._tokens.push(token);
  }

  toString(): string {
    if (this._tokens.length === 0) return '[]';
    return (
      '[' +
      this._tokens
        .map((t) => `${t.witness.sigil}:${t.index}:'${t.normalized}'`)
        .join(', ') +
      ']'
    );
  }
}

export class VariantGraph {
  private _start: VariantGraphVertex;
  private _end: VariantGraphVertex;
  private _vertices: VariantGraphVertex[] = [];
  private _edges: Map<VariantGraphVertex, Map<VariantGraphVertex, Set<Witness>>> = new Map();
  private _witnesses: Set<Witness> = new Set();
  private _transpositions: Set<Set<VariantGraphVertex>> = new Set();

  constructor() {
    this._start = new VariantGraphVertex();
    this._end = new VariantGraphVertex();
    this._vertices.push(this._start, this._end);
    this._edges.set(this._start, new Map([[this._end, new Set()]]));
  }

  getStart(): VariantGraphVertex {
    return this._start;
  }

  getEnd(): VariantGraphVertex {
    return this._end;
  }

  vertices(): VariantGraphVertex[] {
    return this._vertices;
  }

  witnesses(): Set<Witness> {
    return this._witnesses;
  }

  transpositions(): Set<Set<VariantGraphVertex>> {
    return this._transpositions;
  }

  addVertex(token: Token): VariantGraphVertex {
    const v = new VariantGraphVertex();
    v.addToken(token);
    this._vertices.push(v);
    return v;
  }

  addEdge(from: VariantGraphVertex, to: VariantGraphVertex, witness: Witness): void {
    if (!this._edges.has(from)) {
      this._edges.set(from, new Map());
    }
    const outgoing = this._edges.get(from)!;
    if (!outgoing.has(to)) {
      outgoing.set(to, new Set());
    }
    outgoing.get(to)!.add(witness);
    this._witnesses.add(witness);
  }

  outgoing(vertex: VariantGraphVertex): Map<VariantGraphVertex, Set<Witness>> {
    return this._edges.get(vertex) ?? new Map();
  }

  static JOIN = {
    apply(graph: VariantGraph): VariantGraph {
      // Stub: JOIN operation not yet implemented
      throw new Error('VariantGraph.JOIN not implemented');
    },
  };
}
