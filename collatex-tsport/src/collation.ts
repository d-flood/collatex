import { AlignmentTable } from './alignment-table.js';
import { EditGraphAligner, type CollationAlgorithm, type InspectableCollationAlgorithm } from './edit-graph-aligner.js';
import { EqualityTokenComparator } from './token-comparator.js';
import { VariantGraph } from './variant-graph.js';
import { SimpleWitness, witnessFromInput, type Witness } from './witness.js';
import type { TokenData } from './token.js';

export interface CollationOptions {
  nearMatch?: boolean;
  segmentation?: boolean;
  output?: 'table' | 'json' | 'tei' | 'graph';
  layout?: 'horizontal' | 'vertical';
}

export interface JsonWitnessInput {
  id: string;
  content?: string;
  tokens?: TokenData[];
}

export interface JsonCollationInput {
  witnesses: JsonWitnessInput[];
}

export class Collation {
  private readonly _witnesses: Witness[] = [];

  addPlainWitness(sigil: string, content: string): Witness {
    const witness = new SimpleWitness(sigil, content);
    this._witnesses.push(witness);
    return witness;
  }

  addWitness(witnessInput: JsonWitnessInput): Witness {
    const witness = witnessFromInput(witnessInput);
    this._witnesses.push(witness);
    return witness;
  }

  get witnesses(): Witness[] {
    return this._witnesses;
  }
}

function collateGraph(collation: Collation): VariantGraph {
  const graph = new VariantGraph();
  if (collation.witnesses.length === 0) {
    return graph;
  }
  const algorithm = new EditGraphAligner(new EqualityTokenComparator());
  algorithm.setMergeTranspositions(true);
  algorithm.collate(graph, collation.witnesses.map((witness) => witness.getTokens()));
  return graph;
}

function tableToJson(table: AlignmentTable, layout: 'horizontal' | 'vertical' = 'horizontal'): unknown {
  if (layout === 'vertical') {
    const witnesses = table.rows.map((row) => row.witness.sigil);
    const columnCount = table.rows[0]?.cells.length ?? 0;
    return {
      table: Array.from({ length: columnCount }, (_, columnIndex) =>
        table.rows.map((row) => row.cells[columnIndex] ?? null),
      ),
      witnesses,
    };
  }
  return {
    table: table.rows.map((row) => row.cells),
    witnesses: table.rows.map((row) => row.witness.sigil),
  };
}

export function collate(
  input: Collation | JsonCollationInput,
  options: CollationOptions = {},
): AlignmentTable | VariantGraph | unknown {
  const collation = input instanceof Collation ? input : CollationFromJson(input);
  const graph = collateGraph(collation);
  if (options.output === 'graph') return graph;
  const table = AlignmentTable.from(options.segmentation === false ? graph : VariantGraph.JOIN.apply(graph));
  if (options.output === 'json') {
    return tableToJson(table, options.layout);
  }
  return table;
}

function CollationFromJson(input: JsonCollationInput): Collation {
  const collation = new Collation();
  for (const witness of input.witnesses) {
    collation.addWitness(witness);
  }
  return collation;
}

export { EditGraphAligner };
export type { CollationAlgorithm, InspectableCollationAlgorithm };
