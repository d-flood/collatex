import { VariantGraph, type VariantGraphVertex } from './variant-graph.js';

export class VariantGraphRanking {
  readonly byVertex = new Map<VariantGraphVertex, number>();
  readonly byRank = new Map<number, VariantGraphVertex[]>();

  static of(graph: VariantGraph): VariantGraphRanking {
    return VariantGraphRanking.build(graph);
  }

  static ofOnlyCertainVertices(graph: VariantGraph, vertices: Set<VariantGraphVertex>): VariantGraphRanking {
    return VariantGraphRanking.build(graph, vertices);
  }

  private static build(graph: VariantGraph, rankedVertices?: Set<VariantGraphVertex>): VariantGraphRanking {
    const ranking = new VariantGraphRanking();
    const order = graph.topologicalVertices();
    for (const vertex of order) {
      let rank = -1;
      for (const predecessor of vertex.incoming().keys()) {
        rank = Math.max(rank, ranking.byVertex.get(predecessor) ?? -1);
      }
      if (!rankedVertices || rankedVertices.has(vertex)) {
        rank += 1;
      }
      ranking.byVertex.set(vertex, rank);
    }

    for (const [vertex, rank] of ranking.byVertex.entries()) {
      const list = ranking.byRank.get(rank) ?? [];
      list.push(vertex);
      ranking.byRank.set(rank, list);
    }

    return ranking;
  }

  apply(vertex: VariantGraphVertex): number {
    return this.byVertex.get(vertex) ?? 0;
  }
}
