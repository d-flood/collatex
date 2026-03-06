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

export class EditGraphAligner extends CollationAlgorithmBase implements InspectableCollationAlgorithm {
  private static readonly LARGE_ALIGNMENT_THRESHOLD = 50_000;
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

      let aligned: Map<Token, VariantGraphVertex>;
      const useFastPath = graph.vertices().length * tokens.length > EditGraphAligner.LARGE_ALIGNMENT_THRESHOLD;
      if (useFastPath) {
        aligned = this.alignGreedy(graph, tokens);
        this.phraseMatches = [];
        this.transpositions = [];
      } else {
        const linked = this.refineLinkedMatches(
          graph,
          tokens,
          this.augmentExactMatches(graph, tokens, this.alignWithLcs(graph, tokens)),
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
      if (this.mergeTranspositionSets && !useFastPath) {
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

  private alignWithLcs(graph: VariantGraph, tokens: Token[]): Map<Token, VariantGraphVertex> {
    const vertices = graph
      .vertices()
      .filter((vertex) => vertex !== graph.getStart() && vertex !== graph.getEnd());
    const height = tokens.length + 1;
    const width = vertices.length + 1;
    const dp = Array.from({ length: height }, () => new Array<number>(width).fill(0));

    for (let y = 1; y < height; y += 1) {
      for (let x = 1; x < width; x += 1) {
        const token = tokens[y - 1]!;
        const vertex = vertices[x - 1]!;
        const matches = vertex.tokens().some((candidate) => this.comparator.equals(token, candidate));
        if (matches) {
          dp[y]![x] = dp[y - 1]![x - 1]! + 1;
        } else {
          dp[y]![x] = Math.max(dp[y - 1]![x]!, dp[y]![x - 1]!);
        }
      }
    }

    const aligned = new Map<Token, VariantGraphVertex>();
    let y = tokens.length;
    let x = vertices.length;
    while (x > 0 && y > 0) {
      const token = tokens[y - 1]!;
      const vertex = vertices[x - 1]!;
      const matches = vertex.tokens().some((candidate) => this.comparator.equals(token, candidate));
      if (matches && dp[y]![x] === dp[y - 1]![x - 1]! + 1) {
        aligned.set(token, vertex);
        y -= 1;
        x -= 1;
      } else if (dp[y - 1]![x]! > dp[y]![x - 1]!) {
        y -= 1;
      } else {
        x -= 1;
      }
    }

    return new Map([...aligned.entries()].reverse());
  }

  private alignGreedy(graph: VariantGraph, tokens: Token[]): Map<Token, VariantGraphVertex> {
    const vertices = graph
      .vertices()
      .filter((vertex) => vertex !== graph.getStart() && vertex !== graph.getEnd());
    const byNormalized = new Map<string, number[]>();
    vertices.forEach((vertex, index) => {
      const normalizedValues = new Set(vertex.tokens().map((token) => token.normalized));
      for (const normalized of normalizedValues) {
        const list = byNormalized.get(normalized) ?? [];
        list.push(index);
        byNormalized.set(normalized, list);
      }
    });

    const aligned = new Map<Token, VariantGraphVertex>();
    const used = new Set<number>();
    let prevIndex = -1;
    for (const token of tokens) {
      const candidates = byNormalized.get(token.normalized) ?? [];
      const nextIndex = candidates.find((index) => index > prevIndex && !used.has(index));
      if (nextIndex === undefined) continue;
      aligned.set(token, vertices[nextIndex]!);
      used.add(nextIndex);
      prevIndex = nextIndex;
    }
    return aligned;
  }

  private augmentExactMatches(
    graph: VariantGraph,
    tokens: Token[],
    aligned: Map<Token, VariantGraphVertex>,
  ): Map<Token, VariantGraphVertex> {
    const linked = new Map(aligned);
    const usedVertices = new Set(aligned.values());
    const candidateVertices = graph
      .vertices()
      .filter((vertex) => vertex !== graph.getStart() && vertex !== graph.getEnd());

    for (const token of tokens) {
      if (linked.has(token)) continue;
      const candidate = candidateVertices.find(
        (vertex) =>
          !usedVertices.has(vertex) &&
          vertex.tokens().some((candidateToken) => this.comparator.equals(token, candidateToken)),
      );
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
  ): Map<Token, VariantGraphVertex> {
    const ranking = VariantGraphRanking.of(graph);
    const vertices = graph
      .vertices()
      .filter((vertex) => vertex !== graph.getStart() && vertex !== graph.getEnd());
    const tokenToIndex = new Map(tokens.map((token, index) => [token, index]));

    for (const token of tokens) {
      const candidates = vertices.filter((vertex) =>
        vertex.tokens().some((candidate) => this.comparator.equals(token, candidate)),
      );
      if (candidates.length <= 1) continue;

      const usedVertices = new Set(
        [...linked.entries()]
          .filter(([otherToken]) => otherToken !== token)
          .map(([, vertex]) => vertex),
      );
      const prev = this.findNeighborVertex(tokens, tokenToIndex.get(token) ?? 0, linked, -1);
      const next = this.findNeighborVertex(tokens, tokenToIndex.get(token) ?? 0, linked, 1);

      let best = linked.get(token) ?? null;
      let bestScore = best ? this.scoreCandidate(best, prev, next, ranking) : Number.NEGATIVE_INFINITY;
      for (const candidate of candidates) {
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
