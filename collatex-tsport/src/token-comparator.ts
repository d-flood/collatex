import type { Token } from './token.js';

export interface TokenComparator {
  equals(a: Token, b: Token): boolean;
}

export class EqualityTokenComparator implements TokenComparator {
  equals(a: Token, b: Token): boolean {
    return a.normalized === b.normalized;
  }
}

export class EditDistanceTokenComparator implements TokenComparator {
  private threshold: number;

  constructor(threshold = 1) {
    this.threshold = threshold;
  }

  equals(a: Token, b: Token): boolean {
    if (a.normalized === b.normalized) return true;
    return editDistance(a.normalized, b.normalized) <= this.threshold;
  }
}

export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function similarityRatio(a: string, b: string): number {
  if (a === b) return 1.0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  return 1.0 - editDistance(a, b) / maxLen;
}
