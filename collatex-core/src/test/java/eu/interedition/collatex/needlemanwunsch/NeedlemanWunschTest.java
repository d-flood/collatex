/*
 * Copyright (c) 2013 The Interedition Development Group.
 *
 * This file is part of CollateX.
 *
 * CollateX is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * CollateX is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with CollateX.  If not, see <http://www.gnu.org/licenses/>.
 */

package eu.interedition.collatex.needlemanwunsch;

import eu.interedition.collatex.AbstractTest;
import eu.interedition.collatex.CollationAlgorithm;
import eu.interedition.collatex.CollationAlgorithmFactory;
import eu.interedition.collatex.VariantGraph;
import eu.interedition.collatex.jung.JungVariantGraph;
import eu.interedition.collatex.matching.EqualityTokenComparator;
import eu.interedition.collatex.neo4j.Neo4jVariantGraph;
import org.junit.Test;

/**
 * @author <a href="http://gregor.middell.net/" title="Homepage">Gregor Middell</a>
 */
public class NeedlemanWunschTest extends AbstractTest {

  @Test
  public void simple() {
    final CollationAlgorithm collator = CollationAlgorithmFactory.needlemanWunsch(new EqualityTokenComparator());
    final VariantGraph graph = new JungVariantGraph();
    collator.collate(graph, createWitnesses("a b a b a", "a b a"));
    LOG.fine(toString(table(graph)));
  }
}
