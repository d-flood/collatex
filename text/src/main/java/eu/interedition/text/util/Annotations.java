package eu.interedition.text.util;

import com.google.common.base.Function;
import com.google.common.base.Objects;
import com.google.common.collect.ComparisonChain;
import com.google.common.collect.Ordering;
import eu.interedition.text.Annotation;
import eu.interedition.text.QName;
import eu.interedition.text.Text;

/**
 * @author <a href="http://gregor.middell.net/" title="Homepage">Gregor Middell</a>
 */
public class Annotations {
  public static int compare(Annotation a, Annotation b) {
    return ComparisonChain.start()
            .compare(a.getRange(), b.getRange())
            .compare(a.getName(), b.getName())
            .compare(a, b, Ordering.arbitrary())
            .result();
  }

  public static final Function<Annotation, QName> NAME = new Function<Annotation, QName>() {
    public QName apply(Annotation input) {
      return input.getName();
    }
  };
}