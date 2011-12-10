package eu.interedition.collatex.implementation.graph.db;

import com.google.common.base.Function;
import com.google.common.base.Preconditions;
import com.google.common.collect.AbstractIterator;
import com.google.common.collect.Iterables;
import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import com.google.common.collect.RowSortedTable;
import com.google.common.collect.Sets;
import com.google.common.collect.TreeBasedTable;
import eu.interedition.collatex.implementation.output.Apparatus;
import eu.interedition.collatex.interfaces.Token;
import eu.interedition.collatex.interfaces.IWitness;
import org.neo4j.graphdb.GraphDatabaseService;
import org.neo4j.graphdb.Node;
import org.neo4j.graphdb.Path;
import org.neo4j.graphdb.Relationship;
import org.neo4j.graphdb.Transaction;
import org.neo4j.graphdb.traversal.Evaluation;
import org.neo4j.graphdb.traversal.Evaluator;
import org.neo4j.kernel.Traversal;
import org.neo4j.kernel.Uniqueness;

import java.util.ArrayDeque;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.Set;
import java.util.SortedSet;

import static com.google.common.collect.Iterables.transform;
import static eu.interedition.collatex.implementation.graph.db.VariantGraphRelationshipType.PATH;
import static java.util.Collections.singleton;
import static org.neo4j.graphdb.Direction.OUTGOING;

/**
 * @author <a href="http://gregor.middell.net/" title="Homepage">Gregor Middell</a>
 */
public class VariantGraph {
  private final GraphDatabaseService db;
  private final VariantGraphVertex start;
  private final VariantGraphVertex end;
  private final Resolver<IWitness> witnessResolver;
  private final Resolver<Token> tokenResolver;
  private Function<Node, VariantGraphVertex> vertexWrapper;
  private Function<Relationship, VariantGraphEdge> edgeWrapper;
  private Function<Relationship, VariantGraphTransposition> transpositionWrapper;

  public VariantGraph(Node start, Node end, Resolver<IWitness> witnessResolver, Resolver<Token> tokenResolver) {
    this.db = start.getGraphDatabase();
    this.start = new VariantGraphVertex(this, start);
    this.end = new VariantGraphVertex(this, end);
    this.witnessResolver = witnessResolver;
    this.tokenResolver = tokenResolver;
    this.vertexWrapper = VariantGraphVertex.createWrapper(this);
    this.edgeWrapper = VariantGraphEdge.createWrapper(this);
    this.transpositionWrapper = VariantGraphTransposition.createWrapper(this);

  }

  public Transaction newTransaction() {
    return db.beginTx();
  }

  public GraphDatabaseService getDb() {
    return db;
  }

  public VariantGraphVertex getStart() {
    return start;
  }

  public VariantGraphVertex getEnd() {
    return end;
  }

  public Resolver<IWitness> getWitnessResolver() {
    return witnessResolver;
  }

  public Resolver<Token> getTokenResolver() {
    return tokenResolver;
  }

  public Function<Node, VariantGraphVertex> getVertexWrapper() {
    return vertexWrapper;
  }

  public Function<Relationship, VariantGraphEdge> getEdgeWrapper() {
    return edgeWrapper;
  }

  public Function<Relationship, VariantGraphTransposition> getTranspositionWrapper() {
    return transpositionWrapper;
  }

  public Set<VariantGraphTransposition> transpositions() {
    final Set<VariantGraphTransposition> transpositions = Sets.newHashSet();
    for (VariantGraphVertex v : vertices()) {
      Iterables.addAll(transpositions, v.transpositions());
    }
    return transpositions;
  }

  public Iterable<VariantGraphVertex> vertices() {
    return vertices(null);
  }

  public Iterable<VariantGraphVertex> vertices(final SortedSet<IWitness> witnesses) {
    return new Iterable<VariantGraphVertex>() {
      @Override
      public Iterator<VariantGraphVertex> iterator() {
        return new AbstractIterator<VariantGraphVertex>() {
          private Map<VariantGraphVertex, Integer> encountered = Maps.newHashMap();
          private Queue<VariantGraphVertex> queue = new ArrayDeque<VariantGraphVertex>(singleton(getStart()));

          @Override
          protected VariantGraphVertex computeNext() {
            if (queue.isEmpty()) {
              return endOfData();
            }
            final VariantGraphVertex next = queue.remove();
            for (VariantGraphEdge edge : next.outgoing(witnesses)) {
              final VariantGraphVertex end = edge.to();
              final int endIncoming = Iterables.size(end.incoming(witnesses));
              if (endIncoming == 1) {
                queue.add(end);
              } else if (encountered.containsKey(end)) {
                final int endEncountered = encountered.remove(end);
                if ((endIncoming - endEncountered) == 1) {
                  queue.add(end);
                } else {
                  encountered.put(end, endEncountered + 1);
                }
              } else {
                encountered.put(end, 1);
              }
            }
            return next;
          }
        };
      }
    };
  }

  public Iterable<VariantGraphEdge> edges() {
    return edges(null);
  }

  public Iterable<VariantGraphEdge> edges(final SortedSet<IWitness> witnesses) {
    return transform(Traversal.description().relationships(PATH, OUTGOING).uniqueness(Uniqueness.RELATIONSHIP_GLOBAL).breadthFirst().evaluator(new Evaluator() {

      @Override
      public Evaluation evaluate(Path path) {
        if (witnesses != null && !witnesses.isEmpty()) {
          final Relationship lastRel = path.lastRelationship();
          if (lastRel != null) {
            if (!new VariantGraphEdge(VariantGraph.this, lastRel).traversableWith(witnesses)) {
              return Evaluation.EXCLUDE_AND_PRUNE;
            }
          }
        }

        return Evaluation.INCLUDE_AND_CONTINUE;
      }
    }).traverse(start.getNode()).relationships(), edgeWrapper);
  }

  public VariantGraphVertex add(Token token) {
    return new VariantGraphVertex(this, Sets.newTreeSet(singleton(token)));
  }

  public VariantGraphEdge connect(VariantGraphVertex from, VariantGraphVertex to, SortedSet<IWitness> witnesses) {
    Preconditions.checkArgument(!from.equals(to));

    if (from.equals(start)) {
      final VariantGraphEdge startEndEdge = edgeBetween(start, end);
      if (startEndEdge != null) {
        startEndEdge.delete();
      }
    }

    for (VariantGraphEdge e : from.outgoing()) {
      if (to.equals(e.to())) {
        return e.add(witnesses);
      }
    }
    return new VariantGraphEdge(this, from, to, witnesses);
  }

  public VariantGraphTransposition transpose(VariantGraphVertex from, VariantGraphVertex to) {
    Preconditions.checkArgument(!from.equals(to));
    Preconditions.checkArgument(!from.tokens().isEmpty());
    Preconditions.checkArgument(!to.tokens().isEmpty());

    for (VariantGraphTransposition t : from.transpositions()) {
      if (t.other(from).equals(to)) {
        return t;
      }
    }
    
    return new VariantGraphTransposition(this, from, to);
  }

  public boolean verticesAreAdjacent(VariantGraphVertex a, VariantGraphVertex b) {
    return (edgeBetween(a, b) != null);
  }

  public VariantGraphEdge edgeBetween(VariantGraphVertex a, VariantGraphVertex b) {
    final Node aNode = a.getNode();
    final Node bNode = b.getNode();
    for (Relationship r : aNode.getRelationships(PATH)) {
      if (r.getOtherNode(aNode).equals(bNode)) {
        return new VariantGraphEdge(this, r);
      }
    }
    return null;
  }

  public SortedSet<IWitness> witnesses() {
    final SortedSet<IWitness> witnesses = Sets.newTreeSet();
    for (VariantGraphEdge e : start.outgoing()) {
      witnesses.addAll(e.getWitnesses());
    }
    return witnesses;
  }

  public VariantGraph join() {
    final Queue<VariantGraphVertex> queue = new ArrayDeque<VariantGraphVertex>();
    for (VariantGraphEdge startingEdges : start.outgoing()) {
      queue.add(startingEdges.to());
    }

    while (!queue.isEmpty()) {
      final VariantGraphVertex vertex = queue.remove();
      final List<VariantGraphEdge> outgoing = Lists.newArrayList(vertex.outgoing());
      if (outgoing.size() == 1) {
        final VariantGraphEdge joinCandidateSingleIncoming = outgoing.get(0);
        final VariantGraphVertex joinCandidate = joinCandidateSingleIncoming.to();
        if (Iterables.size(joinCandidate.incoming()) == 1) {
          final SortedSet<IWitness> incomingWitnesses = joinCandidateSingleIncoming.getWitnesses();
          final SortedSet<IWitness> outgoingWitnesses = Sets.newTreeSet();
          final List<VariantGraphEdge> joinCandidateOutgoing = Lists.newArrayList(joinCandidate.outgoing());
          for (VariantGraphEdge e : joinCandidateOutgoing) {
            outgoingWitnesses.addAll(e.getWitnesses());
          }
          if (incomingWitnesses.equals(outgoingWitnesses)) {
            vertex.add(joinCandidate.tokens());
            for (VariantGraphTransposition t : joinCandidate.transpositions()) {
              transpose(vertex, t.other(joinCandidate));
              t.delete();
            }
            for (VariantGraphEdge e : joinCandidateOutgoing) {
              connect(vertex, e.to(), e.getWitnesses());
              e.delete();
            }
            joinCandidateSingleIncoming.delete();
            joinCandidate.delete();

            outgoing.remove(joinCandidateSingleIncoming);
            queue.add(vertex);
          }
        }
      }
      for (VariantGraphEdge e : outgoing) {
        queue.offer(e.to());
      }
    }

    return this;
  }

  public VariantGraph rank() {
    for (VariantGraphVertex v : vertices()) {
      int rank = -1;
      for (VariantGraphEdge e : v.incoming()) {
        rank = Math.max(rank, e.from().getRank());
      }
      v.setRank(rank + 1);
    }

    return this;
  }

  /**
   * Factory method that builds a ParallelSegmentationApparatus from a VariantGraph
   */
  public Apparatus toApparatus() {
    join();
    rank();

    List<Apparatus.Entry> entries = Lists.newArrayList();
    for (VariantGraphVertex v : vertices()) {
      if (v.equals(getStart()) || v.equals(getEnd())) {
        continue;
      }
      Apparatus.Entry entry;
      int rank = v.getRank();
      if (rank > entries.size()) {
        entry = new Apparatus.Entry(witnesses());
        entries.add(entry);
      } else {
        entry = entries.get(rank - 1);
      }
      entry.add(v);
    }

    return new Apparatus(witnesses(), entries);
  }

  public RowSortedTable<Integer, IWitness, SortedSet<Token>> toTable() {
    final TreeBasedTable<Integer, IWitness, SortedSet<Token>> table = TreeBasedTable.create();
    for (VariantGraphVertex v : rank().vertices()) {
      for (Token token : v.tokens()) {
        final int row = v.getRank();
        final IWitness column = token.getWitness();

        SortedSet<Token> cell = table.get(row, column);
        if (cell == null) {
          table.put(row, column, cell = Sets.newTreeSet());
        }
        cell.add(token);
      }
    }
    return table;
  }

  @Override
  public int hashCode() {
    return start.hashCode();
  }

  @Override
  public boolean equals(Object obj) {
    if (obj != null && obj instanceof VariantGraph) {
      return start.equals(((VariantGraph) obj).start);
    }
    return super.equals(obj);
  }

  @Override
  public String toString() {
    return Iterables.toString(witnesses());
  }
}
