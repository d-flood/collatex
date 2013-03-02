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

package eu.interedition.collatex.medite;

import com.google.common.base.Predicate;
import com.google.common.collect.Range;

import javax.annotation.Nullable;
import java.util.Collection;
import java.util.HashSet;

/**
 * @author <a href="http://gregor.middell.net/" title="Homepage">Gregor Middell</a>
 */
class IndexRangeSet extends HashSet<Range<Integer>> implements Predicate<Integer> {

  IndexRangeSet() {
  }

  IndexRangeSet(Collection<? extends Range<Integer>> c) {
    super(c);
  }

  @Override
  public boolean apply(@Nullable Integer input) {
    for (Range<Integer> range : this) {
      if (range.contains(input)) {
        return true;
      }
    }
    return false;
  }
}
