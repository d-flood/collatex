package eu.interedition.collatex.dekker;

import java.util.Comparator;
import java.util.Map;

import eu.interedition.collatex.Token;
import eu.interedition.collatex.neo4j.VariantGraph;
import eu.interedition.collatex.neo4j.VariantGraphVertex;


public interface TokenLinker {

  Map<Token, VariantGraphVertex> link(VariantGraph base, Iterable<Token> witness, Comparator<Token> comparator);

}