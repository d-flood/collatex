import type { Token } from './token.js';
import { VariantGraph, type VariantGraphVertex } from './variant-graph.js';
import { VariantGraphRanking } from './variant-graph-ranking.js';
import { EqualityTokenComparator, type TokenComparator } from './token-comparator.js';

export interface CollationAlgorithm {
  collate(graph: VariantGraph, witnesses: Iterable<Token>[]): void;
}

export interface InspectableCollationAlgorithm extends CollationAlgorithm {
  getPhraseMatches(): Match[][];
  getTranspositions(): Match[][];
  setMergeTranspositions(merge: boolean): void;
}

export class Match {
  constructor(
    readonly vertex: VariantGraphVertex,
    readonly token: Token,
  ) {}

  static createPhraseMatch(vertices: VariantGraphVertex[], tokens: Token[]): Match[] {
    return vertices.map((vertex, index) => new Match(vertex, tokens[index]!));
  }
}

class CollationAlgorithmBase {
  protected witnessTokenVertices = new Map<Token, VariantGraphVertex>();

  protected merge(
    graph: VariantGraph,
    witnessTokens: Iterable<Token>,
    alignments: Map<Token, VariantGraphVertex>,
  ): void {
    const tokens = [...witnessTokens];
    const witness = tokens[0]?.witness;
    if (!witness) return;
    this.witnessTokenVertices = new Map();
    let last = graph.getStart();
    const witnessSet = new Set([witness]);
    for (const token of tokens) {
      let vertex = alignments.get(token);
      if (!vertex) {
        vertex = graph.add(token);
      } else {
        vertex.addToken(token);
      }
      this.witnessTokenVertices.set(token, vertex);
      graph.connect(last, vertex, witnessSet);
      last = vertex;
    }
    graph.connect(last, graph.getEnd(), witnessSet);
  }

  protected mergeTranspositions(graph: VariantGraph, transpositions: Match[][]): void {
    for (const transposedPhrase of transpositions) {
      const transposed = new Set<VariantGraphVertex>();
      for (const match of transposedPhrase) {
        const witnessVertex = this.witnessTokenVertices.get(match.token);
        if (witnessVertex) transposed.add(witnessVertex);
        transposed.add(match.vertex);
      }
      if (transposed.size > 1) {
        graph.transpose(transposed);
      }
    }
  }
}

class PhraseMatchDetector {
  detect(linkedTokens: Map<Token, VariantGraphVertex>, base: VariantGraph, tokens: Iterable<Token>): Match[][] {
    const phraseMatches: Match[][] = [];
    const basePhrase: VariantGraphVertex[] = [];
    const witnessPhrase: Token[] = [];
    let previous = base.getStart();
    for (const token of tokens) {
      const baseVertex = linkedTokens.get(token);
      if (!baseVertex) {
        this.flush(phraseMatches, basePhrase, witnessPhrase);
        continue;
      }
      const sameTranspositions = this.sameTranspositions(previous, baseVertex);
      const sameWitnesses = this.sameWitnessSets(previous, baseVertex);
      const directedEdge = previous.outgoing().has(baseVertex);
      const isNear =
        sameTranspositions &&
        sameWitnesses &&
        directedEdge &&
        (previous.outgoing().size === 1 || baseVertex.incoming().size === 1);
      if (!isNear) {
        this.flush(phraseMatches, basePhrase, witnessPhrase);
      }
      basePhrase.push(baseVertex);
      witnessPhrase.push(token);
      previous = baseVertex;
    }
    this.flush(phraseMatches, basePhrase, witnessPhrase);
    return phraseMatches;
  }

  private flush(target: Match[][], vertices: VariantGraphVertex[], tokens: Token[]): void {
    if (vertices.length === 0) return;
    target.push(Match.createPhraseMatch([...vertices], [...tokens]));
    vertices.length = 0;
    tokens.length = 0;
  }

  private sameWitnessSets(a: VariantGraphVertex, b: VariantGraphVertex): boolean {
    const aw = a.witnesses();
    const bw = b.witnesses();
    return aw.size === bw.size && [...aw].every((witness) => bw.has(witness));
  }

  private sameTranspositions(a: VariantGraphVertex, b: VariantGraphVertex): boolean {
    const at = a.transpositions();
    const bt = b.transpositions();
    return at.size === bt.size && [...at].every((set) => bt.has(set));
  }
}

class TranspositionDetector {
  detect(phraseMatches: Match[][], base: VariantGraph): Match[][] {
    if (phraseMatches.length === 0) return [];
    const matchedVertices = new Set(phraseMatches.map((phrase) => phrase[0]!.vertex));
    const ranking = VariantGraphRanking.ofOnlyCertainVertices(base, matchedVertices);
    const graphOrder = [...phraseMatches].sort((left, right) => {
      const rankDiff = ranking.apply(left[0]!.vertex) - ranking.apply(right[0]!.vertex);
      if (rankDiff !== 0) return rankDiff;
      return phraseMatches.indexOf(left) - phraseMatches.indexOf(right);
    });
    const phraseToGraphIndex = new Map(graphOrder.map((phrase, index) => [phrase, index]));
    const witnessIndices = phraseMatches.map((_, index) => index);
    const graphIndices = phraseMatches.map((phrase) => phraseToGraphIndex.get(phrase) ?? 0);
    const remaining = [...phraseMatches];
    const transpositions: Match[][] = [];

    while (remaining.length > 0) {
      const distances = new Map<Match[], number>();
      for (let i = 0; i < remaining.length; i += 1) {
        const phrase = remaining[i]!;
        const graphIndex = graphIndices[i]!;
        const witnessIndex = witnessIndices[i]!;
        distances.set(phrase, Math.abs(graphIndex - witnessIndex));
      }
      const maxDistance = Math.max(...distances.values(), 0);
      if (maxDistance === 0) break;
      const candidate = [...remaining].sort((left, right) => {
        const distanceDiff = (distances.get(right) ?? 0) - (distances.get(left) ?? 0);
        if (distanceDiff !== 0) return distanceDiff;
        const depthDiff = this.determineDepth(left) - this.determineDepth(right);
        if (depthDiff !== 0) return depthDiff;
        return this.determineSize(left) - this.determineSize(right);
      })[0]!;
      const transposedIndex = phraseToGraphIndex.get(candidate) ?? 0;
      const graphIndex = graphIndices.indexOf(transposedIndex);
      const linkedTransposedPhrase = graphOrder[witnessIndices[graphIndex]!]!;
      this.removePhrase(candidate, remaining, graphIndices, witnessIndices, phraseToGraphIndex, transpositions);
      const distance = distances.get(candidate) ?? 0;
      if ((distances.get(linkedTransposedPhrase) ?? -1) === distance && distance > 1) {
        this.removePhrase(linkedTransposedPhrase, remaining, graphIndices, witnessIndices, phraseToGraphIndex, transpositions);
      }
    }

    return transpositions;
  }

  private removePhrase(
    phrase: Match[],
    remaining: Match[][],
    graphIndices: number[],
    witnessIndices: number[],
    phraseToGraphIndex: Map<Match[], number>,
    transpositions: Match[][],
  ): void {
    const indexToRemove = phraseToGraphIndex.get(phrase);
    const remainingIndex = remaining.indexOf(phrase);
    if (remainingIndex >= 0) {
      remaining.splice(remainingIndex, 1);
    }
    transpositions.push(phrase);
    if (indexToRemove !== undefined) {
      const graphIndex = graphIndices.indexOf(indexToRemove);
      const witnessIndex = witnessIndices.indexOf(indexToRemove);
      if (graphIndex >= 0) {
        graphIndices.splice(graphIndex, 1);
      }
      if (witnessIndex >= 0) {
        witnessIndices.splice(witnessIndex, 1);
      }
    }
  }

  private determineSize(phrase: Match[]): number {
    return phrase.reduce((sum, match) => sum + match.token.normalized.length, 0);
  }

  private determineDepth(phrase: Match[]): number {
    return phrase.reduce((sum, match) => sum + match.vertex.witnesses().size, 0);
  }
}

function filterFalseTranspositions(
  graph: VariantGraph,
  witnessTokenVertices: Map<Token, VariantGraphVertex>,
  transpositions: Match[][],
): Match[][] {
  const ranking = VariantGraphRanking.of(graph);
  return transpositions.filter((transposedPhrase) => {
    const match = transposedPhrase[0];
    if (!match) return false;
    const witnessVertex = witnessTokenVertices.get(match.token);
    if (!witnessVertex) return false;
    const distance = Math.abs(ranking.apply(witnessVertex) - ranking.apply(match.vertex)) - 1;
    return distance <= transposedPhrase.length * 3;
  });
}

type AlignmentNode = {
  matches: number;
  depth: number;
  bestRun: number;
  lastRun: number;
  x: number;
  y: number;
  token: Token;
  vertex: VariantGraphVertex;
  prev: AlignmentNode | null;
};

function compareAlignmentNodes(left: AlignmentNode | null, right: AlignmentNode | null): number {
  if (!left && !right) return 0;
  if (!left) return -1;
  if (!right) return 1;
  if (left.matches !== right.matches) return left.matches - right.matches;
  if (left.depth !== right.depth) return left.depth - right.depth;
  if (left.bestRun !== right.bestRun) return left.bestRun - right.bestRun;
  if (left.lastRun !== right.lastRun) return left.lastRun - right.lastRun;
  if (left.y !== right.y) return left.y - right.y;
  return left.x - right.x;
}

class BestAlignmentIndex {
  private readonly tree: Array<AlignmentNode | null>;

  constructor(size: number) {
    this.tree = new Array<AlignmentNode | null>(size + 1).fill(null);
  }

  update(index: number, value: AlignmentNode): void {
    for (let current = index; current < this.tree.length; current += current & -current) {
      if (compareAlignmentNodes(value, this.tree[current] ?? null) >= 0) {
        this.tree[current] = value;
      }
    }
  }

  query(index: number): AlignmentNode | null {
    let best: AlignmentNode | null = null;
    for (let current = index; current > 0; current -= current & -current) {
      const candidate = this.tree[current] ?? null;
      if (compareAlignmentNodes(candidate, best) >= 0) {
        best = candidate;
      }
    }
    return best;
  }
}

export class EditGraphAligner extends CollationAlgorithmBase implements InspectableCollationAlgorithm {
  private phraseMatches: Match[][] = [];
  private transpositions: Match[][] = [];
  private mergeTranspositionSets = false;
  private readonly witnessSignatures = new Map<string, VariantGraphVertex[]>();

  constructor(private readonly comparator: TokenComparator = new EqualityTokenComparator()) {
    super();
  }

  collate(graph: VariantGraph, witnesses: Iterable<Token>[]): void {
    const witnessList = witnesses.map((tokens) => [...tokens]);
    this.witnessSignatures.clear();
    let firstWitness = true;

    for (const tokens of witnessList) {
      const witness = tokens[0]?.witness;
      if (!witness) continue;
      const signature = this.signatureFor(tokens);
      if (firstWitness) {
        this.merge(graph, tokens, new Map());
        this.witnessSignatures.set(signature, tokens.map((token) => this.witnessTokenVertices.get(token)!));
        firstWitness = false;
        continue;
      }

      const existingPath = this.witnessSignatures.get(signature);
      if (existingPath && existingPath.length === tokens.length) {
        const linked = new Map<Token, VariantGraphVertex>();
        tokens.forEach((token, index) => linked.set(token, existingPath[index]!));
        this.phraseMatches = [tokens.map((token, index) => new Match(existingPath[index]!, token))];
        this.transpositions = [];
        this.merge(graph, tokens, linked);
        continue;
      }

      const candidates = this.collectCandidateVertices(graph, tokens);
      const useLongWitnessFallback = tokens.length > 200;
      let aligned: Map<Token, VariantGraphVertex>;
      if (useLongWitnessFallback) {
        aligned = this.alignLongWitnessFallback(
          graph
            .vertices()
            .filter((vertex) => vertex !== graph.getStart() && vertex !== graph.getEnd()),
          tokens,
          candidates,
        );
        this.phraseMatches = [];
        this.transpositions = [];
      } else {
        const linked = this.refineLinkedMatches(
          graph,
          tokens,
          this.augmentExactMatches(tokens, this.alignWithLcs(graph, tokens, candidates), candidates),
          candidates,
        );
        this.phraseMatches = new PhraseMatchDetector().detect(linked, graph, tokens);
        this.transpositions = new TranspositionDetector().detect(this.phraseMatches, graph);
        aligned = new Map(linked);
        for (const transposedPhrase of this.transpositions) {
          for (const match of transposedPhrase) {
            aligned.delete(match.token);
          }
        }
      }
      this.merge(graph, tokens, aligned);
      this.transpositions = filterFalseTranspositions(graph, this.witnessTokenVertices, this.transpositions);
      if (this.mergeTranspositionSets && !useLongWitnessFallback) {
        this.mergeTranspositions(graph, this.transpositions);
      }
      this.witnessSignatures.set(signature, tokens.map((token) => this.witnessTokenVertices.get(token)!));
    }
  }

  getPhraseMatches(): Match[][] {
    return this.phraseMatches;
  }

  getTranspositions(): Match[][] {
    return this.transpositions;
  }

  setMergeTranspositions(merge: boolean): void {
    this.mergeTranspositionSets = merge;
  }

  private signatureFor(tokens: Token[]): string {
    return tokens.map((token) => token.normalized).join('\u0001');
  }

  private collectCandidateVertices(graph: VariantGraph, tokens: Token[]): Map<Token, VariantGraphVertex[]> {
    const vertices = graph
      .vertices()
      .filter((vertex) => vertex !== graph.getStart() && vertex !== graph.getEnd());
    const candidateLookup = new Map<Token, VariantGraphVertex[]>();

    if (this.comparator instanceof EqualityTokenComparator) {
      const verticesByNormalized = new Map<string, VariantGraphVertex[]>();
      for (const vertex of vertices) {
        const normalizedValues = new Set(vertex.tokens().map((token) => token.normalized));
        for (const normalized of normalizedValues) {
          const existing = verticesByNormalized.get(normalized) ?? [];
          existing.push(vertex);
          verticesByNormalized.set(normalized, existing);
        }
      }
      for (const token of tokens) {
        candidateLookup.set(token, [...(verticesByNormalized.get(token.normalized) ?? [])]);
      }
      return candidateLookup;
    }

    for (const token of tokens) {
      candidateLookup.set(
        token,
        vertices.filter((vertex) => vertex.tokens().some((candidate) => this.comparator.equals(token, candidate))),
      );
    }
    return candidateLookup;
  }

  private alignWithLcs(
    graph: VariantGraph,
    tokens: Token[],
    candidates: Map<Token, VariantGraphVertex[]>,
  ): Map<Token, VariantGraphVertex> {
    const vertices = graph
      .vertices()
      .filter((vertex) => vertex !== graph.getStart() && vertex !== graph.getEnd());
    if (vertices.length === 0 || tokens.length === 0) {
      return new Map();
    }

    const totalCandidates = tokens.reduce((sum, token) => sum + (candidates.get(token)?.length ?? 0), 0);
    if (totalCandidates > (vertices.length * tokens.length) / 3) {
      return this.alignWithDenseDp(vertices, tokens, candidates);
    }

    return this.alignWithSparseChain(vertices, tokens, candidates);
  }

  private alignWithSparseChain(
    vertices: VariantGraphVertex[],
    tokens: Token[],
    candidates: Map<Token, VariantGraphVertex[]>,
  ): Map<Token, VariantGraphVertex> {

    const vertexPositions = new Map(vertices.map((vertex, index) => [vertex, index]));
    const prefix = new BestAlignmentIndex(vertices.length);
    let previousRow = new Map<number, AlignmentNode>();
    let best: AlignmentNode | null = null;

    for (let y = 0; y < tokens.length; y += 1) {
      const token = tokens[y]!;
      const rowStates = new Map<number, AlignmentNode>();
      for (const vertex of candidates.get(token) ?? []) {
        const x = vertexPositions.get(vertex);
        if (x === undefined) continue;
        const fromPrefix = prefix.query(x);
        const fromContiguous = previousRow.get(x - 1) ?? null;
        const states: AlignmentNode[] = [];
        if (fromPrefix) {
          states.push({
            matches: fromPrefix.matches + 1,
            depth: fromPrefix.depth + vertex.witnesses().size,
            bestRun: Math.max(fromPrefix.bestRun, 1),
            lastRun: 1,
            x,
            y,
            token,
            vertex,
            prev: fromPrefix,
          });
        } else {
          states.push({
            matches: 1,
            depth: vertex.witnesses().size,
            bestRun: 1,
            lastRun: 1,
            x,
            y,
            token,
            vertex,
            prev: null,
          });
        }
        if (fromContiguous) {
          const run = fromContiguous.lastRun + 1;
          states.push({
            matches: fromContiguous.matches + 1,
            depth: fromContiguous.depth + vertex.witnesses().size,
            bestRun: Math.max(fromContiguous.bestRun, run),
            lastRun: run,
            x,
            y,
            token,
            vertex,
            prev: fromContiguous,
          });
        }

        let bestAtPosition: AlignmentNode | null = rowStates.get(x) ?? null;
        for (const state of states) {
          if (compareAlignmentNodes(state, bestAtPosition) >= 0) {
            bestAtPosition = state;
          }
        }
        if (!bestAtPosition) continue;
        rowStates.set(x, bestAtPosition);
        if (compareAlignmentNodes(bestAtPosition, best) >= 0) {
          best = bestAtPosition;
        }
      }
      for (const state of rowStates.values()) {
        prefix.update(state.x + 1, state);
      }
      previousRow = rowStates;
    }

    const aligned = new Map<Token, VariantGraphVertex>();
    let current = best;
    while (current) {
      if (!aligned.has(current.token)) {
        aligned.set(current.token, current.vertex);
      }
      current = current.prev;
    }
    return new Map([...aligned.entries()].reverse());
  }

  private alignLongWitnessFallback(
    vertices: VariantGraphVertex[],
    tokens: Token[],
    candidates: Map<Token, VariantGraphVertex[]>,
  ): Map<Token, VariantGraphVertex> {
    const vertexPositions = new Map(vertices.map((vertex, index) => [vertex, index]));
    const aligned = new Map<Token, VariantGraphVertex>();
    const usedPositions = new Set<number>();
    let previousIndex = -1;

    for (const token of tokens) {
      const next = (candidates.get(token) ?? [])
        .map((vertex) => ({ vertex, index: vertexPositions.get(vertex) }))
        .find((candidate) => candidate.index !== undefined && candidate.index > previousIndex && !usedPositions.has(candidate.index));
      if (!next || next.index === undefined) continue;
      aligned.set(token, next.vertex);
      usedPositions.add(next.index);
      previousIndex = next.index;
    }

    return aligned;
  }

  private alignWithDenseDp(
    vertices: VariantGraphVertex[],
    tokens: Token[],
    candidates: Map<Token, VariantGraphVertex[]>,
  ): Map<Token, VariantGraphVertex> {
    type DenseState = {
      matches: number;
      depth: number;
      bestRun: number;
      lastRun: number;
      prevX: number;
      prevY: number;
      matched: boolean;
    };

    const width = vertices.length + 1;
    const height = tokens.length + 1;
    const vertexPositions = new Map(vertices.map((vertex, index) => [vertex, index]));
    const candidatePositions = new Map(
      tokens.map((token) => [token, new Set((candidates.get(token) ?? []).map((vertex) => vertexPositions.get(vertex)!))]),
    );
    const createState = (
      prevX: number,
      prevY: number,
      matched: boolean,
      overrides: Partial<Omit<DenseState, 'prevX' | 'prevY' | 'matched'>> = {},
    ): DenseState => ({
      matches: 0,
      depth: 0,
      bestRun: 0,
      lastRun: 0,
      prevX,
      prevY,
      matched,
      ...overrides,
    });
    const compareStates = (left: DenseState, right: DenseState): number => {
      if (left.matches !== right.matches) return left.matches - right.matches;
      if (left.depth !== right.depth) return left.depth - right.depth;
      if (left.bestRun !== right.bestRun) return left.bestRun - right.bestRun;
      if (left.lastRun !== right.lastRun) return left.lastRun - right.lastRun;
      return 0;
    };
    const copySkip = (state: DenseState, prevX: number, prevY: number): DenseState =>
      createState(prevX, prevY, false, {
        matches: state.matches,
        depth: state.depth,
        bestRun: state.bestRun,
        lastRun: 0,
      });

    const dp = Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) => createState(Math.max(0, x - 1), Math.max(0, y - 1), false)),
    );
    dp[0]![0] = createState(0, 0, false);
    for (let x = 1; x < width; x += 1) {
      dp[0]![x] = copySkip(dp[0]![x - 1]!, x - 1, 0);
    }
    for (let y = 1; y < height; y += 1) {
      dp[y]![0] = copySkip(dp[y - 1]![0]!, 0, y - 1);
    }

    for (let y = 1; y < height; y += 1) {
      const token = tokens[y - 1]!;
      const tokenCandidates = candidatePositions.get(token) ?? new Set<number>();
      for (let x = 1; x < width; x += 1) {
        const fromUp = copySkip(dp[y - 1]![x]!, x, y - 1);
        const fromLeft = copySkip(dp[y]![x - 1]!, x - 1, y);
        let best = compareStates(fromUp, fromLeft) > 0 ? fromUp : fromLeft;
        if (tokenCandidates.has(x - 1)) {
          const diagonal = dp[y - 1]![x - 1]!;
          const run = diagonal.matched ? diagonal.lastRun + 1 : 1;
          const matchState = createState(x - 1, y - 1, true, {
            matches: diagonal.matches + 1,
            depth: diagonal.depth + vertices[x - 1]!.witnesses().size,
            bestRun: Math.max(diagonal.bestRun, run),
            lastRun: run,
          });
          if (compareStates(matchState, best) >= 0) {
            best = matchState;
          }
        }
        dp[y]![x] = best;
      }
    }

    const aligned = new Map<Token, VariantGraphVertex>();
    let x = vertices.length;
    let y = tokens.length;
    while (x > 0 || y > 0) {
      const state = dp[y]![x]!;
      if (state.matched && x > 0 && y > 0) {
        aligned.set(tokens[y - 1]!, vertices[x - 1]!);
      }
      if (x === state.prevX && y === state.prevY) {
        break;
      }
      x = state.prevX;
      y = state.prevY;
    }

    return new Map([...aligned.entries()].reverse());
  }

  private augmentExactMatches(
    tokens: Token[],
    aligned: Map<Token, VariantGraphVertex>,
    candidates: Map<Token, VariantGraphVertex[]>,
  ): Map<Token, VariantGraphVertex> {
    const linked = new Map(aligned);
    const usedVertices = new Set(aligned.values());

    for (const token of tokens) {
      if (linked.has(token)) continue;
      const candidate = (candidates.get(token) ?? []).find((vertex) => !usedVertices.has(vertex));
      if (!candidate) continue;
      linked.set(token, candidate);
      usedVertices.add(candidate);
    }

    return linked;
  }

  private refineLinkedMatches(
    graph: VariantGraph,
    tokens: Token[],
    linked: Map<Token, VariantGraphVertex>,
    candidates: Map<Token, VariantGraphVertex[]>,
  ): Map<Token, VariantGraphVertex> {
    const ranking = VariantGraphRanking.of(graph);
    const tokenToIndex = new Map(tokens.map((token, index) => [token, index]));

    for (const token of tokens) {
      const tokenCandidates = candidates.get(token) ?? [];
      if (tokenCandidates.length <= 1) continue;

      const usedVertices = new Set(
        [...linked.entries()]
          .filter(([otherToken]) => otherToken !== token)
          .map(([, vertex]) => vertex),
      );
      const prev = this.findNeighborVertex(tokens, tokenToIndex.get(token) ?? 0, linked, -1);
      const next = this.findNeighborVertex(tokens, tokenToIndex.get(token) ?? 0, linked, 1);

      let best = linked.get(token) ?? null;
      let bestScore = best ? this.scoreCandidate(best, prev, next, ranking) : Number.NEGATIVE_INFINITY;
      for (const candidate of tokenCandidates) {
        if (usedVertices.has(candidate)) continue;
        const score = this.scoreCandidate(candidate, prev, next, ranking);
        if (score > bestScore || (score === bestScore && best && ranking.apply(candidate) < ranking.apply(best))) {
          best = candidate;
          bestScore = score;
        }
      }

      if (best) linked.set(token, best);
    }

    return linked;
  }

  private findNeighborVertex(
    tokens: Token[],
    index: number,
    linked: Map<Token, VariantGraphVertex>,
    direction: -1 | 1,
  ): VariantGraphVertex | null {
    for (let current = index + direction; current >= 0 && current < tokens.length; current += direction) {
      const token = tokens[current]!;
      const vertex = linked.get(token);
      if (vertex) return vertex;
    }
    return null;
  }

  private scoreCandidate(
    candidate: VariantGraphVertex,
    prev: VariantGraphVertex | null,
    next: VariantGraphVertex | null,
    ranking: VariantGraphRanking,
  ): number {
    let score = 0;
    const candidateRank = ranking.apply(candidate);
    if (prev) {
      const prevRank = ranking.apply(prev);
      score += prev.outgoing().has(candidate) ? 1000 : -Math.abs(candidateRank - prevRank);
      if (candidateRank < prevRank) {
        score -= 500;
      }
    }
    if (next) {
      const nextRank = ranking.apply(next);
      score += candidate.outgoing().has(next) ? 1000 : -Math.abs(nextRank - candidateRank);
      if (candidateRank > nextRank) {
        score -= 500;
      }
    }
    return score;
  }
}
