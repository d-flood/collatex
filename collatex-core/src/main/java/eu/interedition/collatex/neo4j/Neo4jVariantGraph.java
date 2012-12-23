package eu.interedition.collatex.neo4j;

import static com.google.common.collect.Iterables.transform;
import static eu.interedition.collatex.neo4j.Neo4jGraphRelationships.PATH;
import static java.util.Collections.singleton;
import static org.neo4j.graphdb.Direction.OUTGOING;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Iterator;
import java.util.List;
import java.util.Set;

import eu.interedition.collatex.VariantGraph;
import eu.interedition.collatex.util.VariantGraphs;
import org.neo4j.graphdb.GraphDatabaseService;
import org.neo4j.graphdb.Node;
import org.neo4j.graphdb.Path;
import org.neo4j.graphdb.Relationship;
import org.neo4j.graphdb.Transaction;
import org.neo4j.graphdb.traversal.Evaluation;
import org.neo4j.graphdb.traversal.Evaluator;
import org.neo4j.kernel.Traversal;
import org.neo4j.kernel.Uniqueness;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.common.base.Function;
import com.google.common.base.Preconditions;
import com.google.common.collect.AbstractIterator;
import com.google.common.collect.Iterables;
import com.google.common.collect.Lists;
import com.google.common.collect.Ordering;
import com.google.common.collect.RowSortedTable;
import com.google.common.collect.Sets;
import com.google.common.collect.TreeBasedTable;

import eu.interedition.collatex.Token;
import eu.interedition.collatex.Witness;
import eu.interedition.collatex.simple.SimpleToken;

/**
 * @author <a href="http://gregor.middell.net/" title="Homepage">Gregor Middell</a>
 */
public class Neo4jVariantGraph implements VariantGraph {
  private static final Logger LOG = LoggerFactory.getLogger(Neo4jVariantGraph.class);

  final GraphDatabaseService database;
  final EntityMapper<Witness> witnessMapper;
  final EntityMapper<Token> tokenMapper;

  final Neo4jVariantGraphVertex start;
  final Neo4jVariantGraphVertex end;

  public Neo4jVariantGraph(GraphDatabaseService database, Node start, Node end, EntityMapper<Witness> witnessMapper, EntityMapper<Token> tokenMapper) {
    this.database = database;
    this.witnessMapper = witnessMapper;
    this.tokenMapper = tokenMapper;
    this.start = (Neo4jVariantGraphVertex) vertexWrapper.apply(start);
    this.end = (Neo4jVariantGraphVertex) vertexWrapper.apply(end);
  }

  public Transaction newTransaction() {
    return database.beginTx();
  }

  public GraphDatabaseService getDatabase() {
    return database;
  }

  @Override
  public Vertex getStart() {
    return start;
  }

  @Override
  public Vertex getEnd() {
    return end;
  }

  @Override
  public Set<Transposition> transpositions() {
    final Set<Transposition> transpositions = Sets.newHashSet();
    for (Vertex v : vertices()) {
      Iterables.addAll(transpositions, v.transpositions());
    }
    return transpositions;
  }

  @Override
  public Iterable<Vertex> vertices() {
    return vertices(null);
  }

  @Override
  public Iterable<Vertex> vertices(final Set<Witness> witnesses) {
    return VariantGraphs.vertices(this, witnesses);
  }

  @Override
  public Iterable<Edge> edges() {
    return edges(null);
  }

  @Override
  public Iterable<Edge> edges(final Set<Witness> witnesses) {
    return VariantGraphs.edges(this, witnesses);
  }

  @Override
  public Neo4jVariantGraphVertex add(Token token) {
    if (LOG.isTraceEnabled()) {
      LOG.trace("Creating new vertex with {}", token);
    }
    return new Neo4jVariantGraphVertex(this, singleton(token));
  }

  @Override
  public Edge connect(VariantGraph.Vertex from, VariantGraph.Vertex to, Set<Witness> witnesses) {
    Preconditions.checkArgument(!from.equals(to));

    if (LOG.isTraceEnabled()) {
      LOG.trace("Connected {} and {} with {}", new Object[]{from, to, witnesses});
    }

    if (from.equals(start)) {
      final Edge startEndEdge = edgeBetween(start, end);
      if (startEndEdge != null) {
        startEndEdge.delete();
      }
    }

    for (Edge e : from.outgoing()) {
      if (to.equals(e.to())) {
        return e.add(witnesses);
      }
    }
    return new Neo4jVariantGraphEdge(this, (Neo4jVariantGraphVertex) from, (Neo4jVariantGraphVertex) to, witnesses);
  }

  @Override
  public Transposition transpose(Set<VariantGraph.Vertex> vertices) {
    Preconditions.checkArgument(!vertices.isEmpty());
    for (Transposition transposition : vertices.iterator().next().transpositions()) {
      if (Sets.newHashSet(transposition).equals(vertices)) {
        return transposition;
      }
    }
    return new Neo4jVariantGraphTransposition(this, vertices);
  }

  @Override
  public Edge edgeBetween(Vertex a, Vertex b) {
    final Node aNode = ((Neo4jVariantGraphVertex)a).getNode();
    final Node bNode = ((Neo4jVariantGraphVertex)b).getNode();
    for (Relationship r : aNode.getRelationships(PATH)) {
      if (r.getOtherNode(aNode).equals(bNode)) {
        return new Neo4jVariantGraphEdge(this, r);
      }
    }
    return null;
  }

  @Override
  public Set<Witness> witnesses() {
    final Set<Witness> witnesses = Sets.newHashSet();
    for (Edge e : start.outgoing()) {
      witnesses.addAll(e.witnesses());
    }
    return witnesses;
  }

  public VariantGraph adjustRanksForTranspositions() {
    for (Vertex v : vertices()) {
      Iterable<Transposition> transpositions = v.transpositions();
      for (Transposition vgt : transpositions) {
        Vertex from = null; // FIXME
        Vertex to = null; // FIXME
        if (from.equals(v)) {
          addNullVertex(v, from, to);
        } else if (to.equals(v)) {
          addNullVertex(v, to, from);
        }
      }
    }
    return this;
  }

  private void addNullVertex(Vertex v, Vertex from, Vertex to) {
    Set<Token> nullTokens = Sets.newHashSet();
    for (Witness w : to.witnesses()) {
      nullTokens.add(new SimpleToken(w, -1, "", ""));
    }
    Vertex nullVertex = new Neo4jVariantGraphVertex(this, nullTokens);
    //int rank = v.getRank();
    //nullVertex.setRank(rank);
    //v.setRank(rank + 1);
    for (Vertex ov : vertices()) {
      //if (!ov.equals(v) && ov.getRank() > rank) ov.setRank(ov.getRank() + 1);
    }
  }

  @Override
  public boolean equals(Object obj) {
    if (obj != null && obj instanceof Neo4jVariantGraph) {
      return start.equals(((Neo4jVariantGraph) obj).start);
    }
    return super.equals(obj);
  }

  @Override
  public int hashCode() {
    return start.hashCode();
  }

  @Override
  public String toString() {
    return Iterables.toString(witnesses());
  }

  final Function<Node, Vertex> vertexWrapper = new Function<Node, VariantGraph.Vertex>() {
    @Override
    public VariantGraph.Vertex apply(Node input) {
      return new Neo4jVariantGraphVertex(Neo4jVariantGraph.this, input);
    }
  };

  final Function<Relationship, Edge> edgeWrapper = new Function<Relationship, VariantGraph.Edge>() {
    @Override
    public VariantGraph.Edge apply(Relationship input) {
      return new Neo4jVariantGraphEdge(Neo4jVariantGraph.this, input);
    }
  };

  final Function<Node, Transposition> transpositionWrapper = new Function<Node, VariantGraph.Transposition>() {
    @Override
    public VariantGraph.Transposition apply(Node input) {
      return new Neo4jVariantGraphTransposition(Neo4jVariantGraph.this, input);
    }
  };
}