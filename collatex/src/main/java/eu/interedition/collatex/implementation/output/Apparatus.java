/**
 * CollateX - a Java library for collating textual sources,
 * for example, to produce an apparatus.
 *
 * Copyright (C) 2010 ESF COST Action "Interedition".
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

package eu.interedition.collatex.implementation.output;

import com.google.common.base.Function;
import com.google.common.base.Joiner;
import com.google.common.collect.ArrayListMultimap;
import com.google.common.collect.Iterables;
import com.google.common.collect.Maps;
import com.google.common.collect.Multimap;
import com.google.common.collect.Sets;
import eu.interedition.collatex.implementation.graph.db.VariantGraphVertex;
import eu.interedition.collatex.implementation.input.SimpleToken;
import eu.interedition.collatex.interfaces.Token;
import eu.interedition.collatex.interfaces.IWitness;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.SortedMap;
import java.util.SortedSet;
import java.util.TreeSet;

public class Apparatus {
  public static final String TEI_NS = "http://www.tei-c.org/ns/1.0";

  private final List<Entry> entries;
  private final SortedSet<IWitness> witnesses;

  public Apparatus(SortedSet<IWitness> witnesses, final List<Entry> entries) {
    this.witnesses = witnesses;
    this.entries = entries;
  }

  public List<Entry> getEntries() {
    return entries;
  }

  public SortedSet<IWitness> getWitnesses() {
    return witnesses;
  }

  public void serialize(Node parent) {
    Document doc = (parent.getNodeType() == Node.DOCUMENT_NODE ? (Document) parent : parent.getOwnerDocument());
    // FIXME: this should be dealt with on the tokenizer level!
    final String separator = " ";
    for (final Apparatus.Entry entry : entries) {
      // group together similar phrases
      final Multimap<String, String> content2WitMap = ArrayListMultimap.create();
      for (IWitness witness : entry.getWitnesses()) {
        content2WitMap.put(SimpleToken.toString(entry.getReadingOf(witness)), witness.getSigil());
      }

      if ((content2WitMap.keySet().size() == 1) && !entry.hasEmptyCells()) {
        // common content, there is no apparatus tag needed, just output the
        // segment
        parent.appendChild(doc.createTextNode(content2WitMap.keys().iterator().next()));
      } else {
        // convert the multimap to a normal map indexed by segment content and
        // containing a sorted set of witness identifiers
        Map<String, SortedSet<String>> readings = Maps.newHashMap();
        for (final String content : content2WitMap.keySet()) {
          readings.put(content, Sets.newTreeSet(content2WitMap.get(content)));
        }

        SortedMap<String, String> readingMap = Maps.newTreeMap();
        for (Map.Entry<String, SortedSet<String>> reading : readings.entrySet()) {
          readingMap.put(Joiner.on(" ").join(Iterables.transform(reading.getValue(), WIT_TO_XML_ID)), reading.getKey());
        }

        Element app = doc.createElementNS(TEI_NS, "app");
        parent.appendChild(app);
        for (Map.Entry<String, String> reading : readingMap.entrySet()) {
          Element rdg = doc.createElementNS(TEI_NS, "rdg");
          app.appendChild(rdg);
          rdg.setAttribute("wit", reading.getKey());
          String content = reading.getValue();
          if (!content.isEmpty()) {
            rdg.setTextContent(content);
          }
        }
      }
      parent.appendChild(doc.createTextNode(separator));
    }
    // FIXME: whitespace handling in the tokenizer!
    if (!entries.isEmpty()) {
      parent.removeChild(parent.getLastChild());
    }
  }

  public static class Entry {

    private final Set<VariantGraphVertex> contents = Sets.newLinkedHashSet();
    private final SortedSet<IWitness> witnesses;

    public Entry(SortedSet<IWitness> witnesses) {
      this.witnesses = witnesses;
    }

    public SortedSet<IWitness> getWitnesses() {
      return witnesses;
    }

    public void add(VariantGraphVertex content) {
      this.contents.add(content);
    }

    public boolean covers(IWitness witness) {
      final TreeSet<IWitness> witnessSet = Sets.newTreeSet(Collections.singleton(witness));
      for (VariantGraphVertex vertex : contents) {
        if (!vertex.tokens(witnessSet).isEmpty()) {
          return true;
        }
      }
      return false;
    }

    /**
    * An empty entry returns an empty reading!
    */
    public SortedSet<Token> getReadingOf(final IWitness witness) {
      final TreeSet<IWitness> witnessSet = Sets.newTreeSet(Collections.singleton(witness));
      for (VariantGraphVertex vertex : contents) {
        final SortedSet<Token> tokens = vertex.tokens(witnessSet);
        if (!tokens.isEmpty()) {
          return tokens;
        }
      }
      return Sets.newTreeSet();
    }

    public boolean hasEmptyCells() {
      int nonEmptyWitnessSize = 0;
      for (VariantGraphVertex vertex : contents) {
        nonEmptyWitnessSize += vertex.witnesses().size();
      }
      return getWitnesses().size() != nonEmptyWitnessSize;
    }

    public EntryState getState() {
      int size = contents.size();
      if (size == 1) {
        boolean emptyCells = hasEmptyCells();
        if (!emptyCells) {
          return EntryState.INVARIANT;
        }
        return EntryState.SEMI_INVARIANT;
      }
      return EntryState.VARIANT;
    }
  }

  public static enum EntryState {
    INVARIANT, SEMI_INVARIANT, VARIANT;
  }

  private static final Function<String, String> WIT_TO_XML_ID = new Function<String, String>() {

    @Override
    public String apply(String from) {
      return (from.startsWith("#") ? from : ("#" + from));
    }
  };
}
