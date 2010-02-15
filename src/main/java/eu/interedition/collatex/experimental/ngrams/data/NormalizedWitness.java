package eu.interedition.collatex.experimental.ngrams.data;

import java.util.List;

public class NormalizedWitness {
  private final String sigil;
  private final List<NormalizedToken> tokens;

  public NormalizedWitness(final String sigil, final List<NormalizedToken> tokens) {
    this.sigil = sigil;
    this.tokens = tokens;
  }

  // Note: not pleased with this method! implement Iterable!
  public List<NormalizedToken> getTokens() {
    return tokens;
  }

  public String getSigil() {
    return sigil;
  }

  //Note: not pleased with this method! reduce visibility?
  public List<NormalizedToken> getTokens(final int startPosition, final int endPosition) {
    return tokens.subList(startPosition - 1, endPosition);
  }

  public int size() {
    return tokens.size();
  }
}
