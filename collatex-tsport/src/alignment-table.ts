import type { Token } from './token.js';
import type { Witness } from './witness.js';
import type { VariantGraph } from './variant-graph.js';

export interface AlignmentTableRow {
  witness: Witness;
  cells: (Token[] | null)[];
}

export class AlignmentTable {
  rows: AlignmentTableRow[] = [];
  private _witnesses: Witness[] = [];

  static from(_graph: VariantGraph): AlignmentTable {
    // Stub: table generation not yet implemented
    throw new Error('AlignmentTable.from not implemented');
  }

  witnessCount(): number {
    return this._witnesses.length;
  }

  toStringForWitness(witness: Witness): string {
    const row = this.rows.find((r) => r.witness.sigil === witness.sigil);
    if (!row) return '';
    return (
      '|' +
      row.cells
        .map((cell) => {
          if (!cell || cell.length === 0) return ' ';
          return cell.map((t) => t.normalized).join(' ');
        })
        .join('|') +
      '|'
    );
  }

  toString(): string {
    return this.rows
      .map((row) => `${row.witness.sigil}: ${this.toStringForWitness(row.witness)}\n`)
      .join('');
  }
}
