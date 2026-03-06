import type { Token } from './token.js';
import type { Witness } from './witness.js';

export class VariantGraphVertex {
  private readonly graph: VariantGraph;
  private readonly tokenList: Token[] = [];
  private readonly outgoingEdges = new Map<VariantGraphVertex, Set<Witness>>();
  private readonly incomingEdges = new Map<VariantGraphVertex, Set<Witness>>();

  constructor(graph: VariantGraph) {
    this.graph = graph;
  }

  tokens(): Token[] {
    return this.tokenList;
  }

  addToken(token: Token): void {
    if (!this.tokenList.includes(token)) {
      this.tokenList.push(token);
    }
  }

  addTokens(tokens: Iterable<Token>): void {
    for (const token of tokens) {
      this.addToken(token);
    }
  }

  incoming(): Map<VariantGraphVertex, Set<Witness>> {
    return this.incomingEdges;
  }

  outgoing(): Map<VariantGraphVertex, Set<Witness>> {
    return this.outgoingEdges;
  }

  witnesses(): Set<Witness> {
    const result = new Set<Witness>();
    for (const token of this.tokenList) {
      result.add(token.witness);
    }
    for (const set of this.incomingEdges.values()) {
      for (const witness of set) result.add(witness);
    }
    for (const set of this.outgoingEdges.values()) {
      for (const witness of set) result.add(witness);
    }
    return result;
  }

  transpositions(): Set<Set<VariantGraphVertex>> {
    return this.graph.transpositionSetsFor(this);
  }

  toString(): string {
    if (this.tokenList.length === 0) return '[]';
    return `[${this.tokenList
      .map((token) => `${token.witness.sigil}:${token.index}:'${token.normalized}'`)
      .join(', ')}]`;
  }
}

export class VariantGraph {
  private readonly start: VariantGraphVertex;
  private readonly end: VariantGraphVertex;
  private readonly allVertices = new Set<VariantGraphVertex>();
  private readonly witnessSet = new Set<Witness>();
  private readonly transpositionIndex = new Map<VariantGraphVertex, Set<Set<VariantGraphVertex>>>();

  constructor() {
    this.start = new VariantGraphVertex(this);
    this.end = new VariantGraphVertex(this);
    this.allVertices.add(this.start);
    this.allVertices.add(this.end);
    this.connect(this.start, this.end, new Set());
  }

  getStart(): VariantGraphVertex {
    return this.start;
  }

  getEnd(): VariantGraphVertex {
    return this.end;
  }

  add(token: Token): VariantGraphVertex {
    const vertex = new VariantGraphVertex(this);
    vertex.addToken(token);
    this.allVertices.add(vertex);
    return vertex;
  }

  addVertex(token: Token): VariantGraphVertex {
    return this.add(token);
  }

  connect(from: VariantGraphVertex, to: VariantGraphVertex, witnesses: Witness | Set<Witness>): void {
    if (from === to) {
      throw new Error('Cannot create self edge');
    }
    const witnessSet = witnesses instanceof Set ? witnesses : new Set([witnesses]);
    const outgoing = from.outgoing();
    const incoming = to.incoming();
    const edgeWitnesses = outgoing.get(to) ?? new Set<Witness>();
    for (const witness of witnessSet) {
      edgeWitnesses.add(witness);
      this.witnessSet.add(witness);
    }
    outgoing.set(to, edgeWitnesses);
    incoming.set(from, edgeWitnesses);

    if (!(from === this.start && to === this.end)) {
      this.removeEdge(this.start, this.end);
    }
  }

  removeEdge(from: VariantGraphVertex, to: VariantGraphVertex): void {
    from.outgoing().delete(to);
    to.incoming().delete(from);
  }

  removeVertex(vertex: VariantGraphVertex): void {
    this.allVertices.delete(vertex);
    for (const previous of vertex.incoming().keys()) {
      previous.outgoing().delete(vertex);
    }
    for (const next of vertex.outgoing().keys()) {
      next.incoming().delete(vertex);
    }
    this.transpositionIndex.delete(vertex);
  }

  transpositionSetsFor(vertex: VariantGraphVertex): Set<Set<VariantGraphVertex>> {
    return this.transpositionIndex.get(vertex) ?? new Set();
  }

  transpose(vertices: Set<VariantGraphVertex>): Set<VariantGraphVertex> {
    if (vertices.size === 0) throw new Error('Cannot transpose empty set');
    const first = vertices.values().next().value as VariantGraphVertex;
    for (const existing of this.transpositionSetsFor(first)) {
      if (existing.size === vertices.size && [...existing].every((vertex) => vertices.has(vertex))) {
        return existing;
      }
    }
    const transposed = new Set(vertices);
    for (const vertex of transposed) {
      const current = this.transpositionIndex.get(vertex) ?? new Set<Set<VariantGraphVertex>>();
      current.add(transposed);
      this.transpositionIndex.set(vertex, current);
    }
    return transposed;
  }

  witnesses(): Set<Witness> {
    return this.witnessSet;
  }

  transpositions(): Set<Set<VariantGraphVertex>> {
    return new Set([...this.transpositionIndex.values()].flatMap((sets) => [...sets]));
  }

  vertices(): VariantGraphVertex[] {
    return this.topologicalVertices();
  }

  topologicalVertices(): VariantGraphVertex[] {
    const indegree = new Map<VariantGraphVertex, number>();
    for (const vertex of this.allVertices) {
      indegree.set(vertex, vertex.incoming().size);
    }
    const queue: VariantGraphVertex[] = [this.start, ...[...this.allVertices].filter((v) => v !== this.start && (indegree.get(v) ?? 0) === 0)];
    const seen = new Set<VariantGraphVertex>();
    const ordered: VariantGraphVertex[] = [];

    while (queue.length > 0) {
      const vertex = queue.shift()!;
      if (seen.has(vertex)) continue;
      seen.add(vertex);
      ordered.push(vertex);
      for (const next of vertex.outgoing().keys()) {
        indegree.set(next, (indegree.get(next) ?? 0) - 1);
        if ((indegree.get(next) ?? 0) <= 0) {
          queue.push(next);
        }
      }
    }

    for (const vertex of this.allVertices) {
      if (!seen.has(vertex)) ordered.push(vertex);
    }

    return ordered;
  }

  pathForWitness(witness: Witness): VariantGraphVertex[] {
    const path: VariantGraphVertex[] = [this.start];
    const visited = new Set<VariantGraphVertex>([this.start]);
    let current = this.start;

    while (current !== this.end) {
      const next = [...current.outgoing().entries()].find(([, witnesses]) => witnesses.has(witness))?.[0];
      if (!next) break;
      path.push(next);
      if (visited.has(next)) break;
      visited.add(next);
      current = next;
    }

    return path;
  }

  static JOIN = {
    apply(graph: VariantGraph): VariantGraph {
      const processed = new Set<VariantGraphVertex>();
      const queue = [...graph.getStart().outgoing().keys()];
      while (queue.length > 0) {
        const vertex = queue.shift()!;
        const transpositions = new Set(vertex.transpositions());
        if (vertex.outgoing().size === 1) {
          const joinCandidate = [...vertex.outgoing().keys()][0]!;
          const candidateTranspositions = new Set(joinCandidate.transpositions());
          const canJoin =
            joinCandidate !== graph.getEnd() &&
            joinCandidate.incoming().size === 1 &&
            transpositions.size === candidateTranspositions.size &&
            [...transpositions].every((t) => candidateTranspositions.has(t));

          if (canJoin) {
            vertex.addTokens(joinCandidate.tokens());
            for (const transposition of [...joinCandidate.transpositions()]) {
              const remapped = new Set(transposition);
              remapped.delete(joinCandidate);
              remapped.add(vertex);
              for (const member of transposition) {
                graph.transpositionSetsFor(member).delete(transposition);
              }
              graph.transpose(remapped);
            }
            const outgoingEntries = [...joinCandidate.outgoing().entries()];
            vertex.outgoing().clear();
            for (const [next, witnesses] of outgoingEntries) {
              vertex.outgoing().set(next, witnesses);
              next.incoming().delete(joinCandidate);
              next.incoming().set(vertex, witnesses);
            }
            graph.removeVertex(joinCandidate);
            queue.unshift(vertex);
            continue;
          }
        }
        processed.add(vertex);
        for (const next of vertex.outgoing().keys()) {
          if (!processed.has(next)) queue.push(next);
        }
      }
      return graph;
    },
  };
}
