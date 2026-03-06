import type { Token } from './token.js';
import type { Witness } from './witness.js';
import type { VariantGraph } from './variant-graph.js';
import { VariantGraphRanking } from './variant-graph-ranking.js';

export interface AlignmentTableRow {
  witness: Witness;
  cells: (Token[] | null)[];
}

export class AlignmentTable {
  rows: AlignmentTableRow[] = [];
  private readonly witnesses: Witness[] = [];

  static from(graph: VariantGraph): AlignmentTable {
    const table = new AlignmentTable();
    const ranking = VariantGraphRanking.of(graph);
    const columns: Array<Map<string, Token[]>> = [];
    for (const vertices of [...ranking.byRank.entries()].sort((a, b) => a[0] - b[0]).map((entry) => entry[1])) {
      const filtered = vertices.filter((vertex) => vertex !== graph.getStart() && vertex !== graph.getEnd());
      if (filtered.length === 0) continue;
      const column = new Map<string, Token[]>();
      for (const vertex of filtered) {
        for (const token of vertex.tokens()) {
          const existing = column.get(token.witness.sigil) ?? [];
          existing.push(token);
          column.set(token.witness.sigil, existing);
        }
      }
      columns.push(column);
    }

    table.witnesses.push(...[...graph.witnesses()].sort((a, b) => a.sigil.localeCompare(b.sigil)));
    for (const witness of table.witnesses) {
      table.rows.push({
        witness,
        cells: columns.map((column) => column.get(witness.sigil) ?? null),
      });
    }
    return table;
  }

  witnessCount(): number {
    return this.witnesses.length;
  }

  toStringForWitness(witness: Witness): string {
    const row = this.rows.find((candidate) => candidate.witness.sigil === witness.sigil);
    if (!row) return '';
    return `|${row.cells
      .map((cell) => (cell && cell.length > 0 ? cell.map((token) => token.normalized).join(' ') : ' '))
      .join('|')}|`;
  }

  toString(): string {
    return this.rows.map((row) => `${row.witness.sigil}: ${this.toStringForWitness(row.witness)}\n`).join('');
  }
}
