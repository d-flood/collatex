package eu.interedition.collatex.dekker;

import java.util.Comparator;
import java.util.Map;

import eu.interedition.collatex.Token;
import eu.interedition.collatex.graph.EditGraph;
import eu.interedition.collatex.graph.GraphFactory;
import eu.interedition.collatex.graph.VariantGraph;
import eu.interedition.collatex.graph.VariantGraphVertex;

@Deprecated
public class EditGraphTokenLinker implements TokenLinker {

  private final GraphFactory graphFactory;

  public EditGraphTokenLinker(GraphFactory graphFactory) {
    this.graphFactory = graphFactory;
  }

  @Override
  public Map<Token, VariantGraphVertex> link(VariantGraph base, Iterable<Token> witness, Comparator<Token> comparator) {
    final EditGraph editGraph = graphFactory.newEditGraph(base);
    final Map<Token, VariantGraphVertex> linkedTokens = editGraph.build(base, witness, comparator).linkedTokens();
    graphFactory.delete(editGraph);
    return linkedTokens;
  }
}
