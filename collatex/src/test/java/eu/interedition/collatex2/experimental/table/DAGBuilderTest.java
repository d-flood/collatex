package eu.interedition.collatex2.experimental.table;

import java.util.Iterator;

import junit.framework.Assert;

import org.junit.BeforeClass;
import org.junit.Test;

import eu.interedition.collatex2.experimental.graph.VariantGraph;
import eu.interedition.collatex2.implementation.CollateXEngine;
import eu.interedition.collatex2.interfaces.IWitness;

public class DAGBuilderTest {
  private static CollateXEngine engine;

  @BeforeClass
  public static void setup() {
    engine = new CollateXEngine();
  }

  @Test
  public void testSimpleVariantGraphToDAG() {
      IWitness a = engine.createWitness("A", "the first witness");
      VariantGraph graph = VariantGraph.create();
      graph.addWitness(a);
      DAGBuilder builder = new DAGBuilder();
      DAVariantGraph dag = builder.buildDAG(graph);
      // vertices
      Iterator<CollateXVertex> iterator = dag.iterator();
      CollateXVertex start = iterator.next(); 
      CollateXVertex the = iterator.next(); 
      CollateXVertex first = iterator.next(); 
      CollateXVertex witness = iterator.next(); 
      CollateXVertex end = iterator.next(); 
      Assert.assertFalse(iterator.hasNext());
      Assert.assertEquals("#", start.getNormalized());       
      Assert.assertEquals("the", the.getNormalized());
      Assert.assertEquals("first", first.getNormalized());
      Assert.assertEquals("witness", witness.getNormalized());
      Assert.assertEquals("#", end.getNormalized());       
      // edges
      Assert.assertTrue(dag.containsEdge(start, the));
      Assert.assertTrue(dag.containsEdge(the, first));
      Assert.assertTrue(dag.containsEdge(first, witness));
      Assert.assertTrue(dag.containsEdge(witness, end));
      // tokens
      Assert.assertEquals("the", the.getToken(a).getContent());
      Assert.assertEquals("first", first.getToken(a).getContent());
      Assert.assertEquals("witness", witness.getToken(a).getContent());
  }

}
