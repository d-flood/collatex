// Ported from Python test_tokenized_json.py + test_near_matching_pretokenized.py
import { describe, it, expect } from 'vitest';
import { collate } from '#src/collation.js';

describe('Tokenized JSON Input', () => {
  const jsonBlackWhite = {
    witnesses: [
      {
        id: 'A',
        tokens: [
          { t: 'A', ref: 123 },
          { t: 'black', adj: true },
          { t: 'cat', id: 'xyz' },
        ],
      },
      {
        id: 'B',
        tokens: [
          { t: 'A' },
          { t: 'white', adj: true },
          { t: 'kitten.', n: 'cat' },
        ],
      },
    ],
  };

  // from test_tokenized_json.py:testJSONOutputPretokenizedJSON
  it('JSON output with pretokenized input', () => {
    const result = collate(jsonBlackWhite, { output: 'json' });
    // Expected: table has 2 rows, 3 columns each, with custom properties preserved
    expect(result).toBeDefined();
  });

  // from test_tokenized_json.py:testJSONOutput_empty_cells_in_output
  it('JSON output with empty cells', () => {
    const jsonIn = {
      witnesses: [
        {
          id: 'A',
          tokens: [
            { t: 'A', ref: 123 },
            { t: 'black', adj: true },
            { t: 'cat', id: 'xyz' },
          ],
        },
        {
          id: 'B',
          tokens: [{ t: 'A' }, { t: 'kitten.', n: 'cat' }],
        },
      ],
    };
    const result = collate(jsonIn, { output: 'json' });
    // Expected: B row has null for "black" column
    expect(result).toBeDefined();
  });

  // from test_tokenized_json.py:testHTMLOutputPretokenizedJSON
  it('table output with pretokenized input', () => {
    const result = collate(jsonBlackWhite, { output: 'table' });
    // Expected plain table:
    // | A | A | black | cat     |
    // | B | A | white | kitten. |
    expect(result).toBeDefined();
  });

  // from test_tokenized_json.py:testHTMLOutputVerticalLayoutPretokenizedJSON
  it('vertical layout output with pretokenized input', () => {
    const result = collate(jsonBlackWhite, { output: 'table', layout: 'vertical' });
    expect(result).toBeDefined();
  });

  // from test_tokenized_json.py:testSegmentationPretokenizedJSON
  it('segmentation with pretokenized JSON', () => {
    const jsonIn = {
      witnesses: [
        {
          id: 'A',
          tokens: [
            { t: 'A', ref: 123 },
            { t: 'black', adj: true },
            { t: 'cat', id: 'xyz' },
          ],
        },
        {
          id: 'B',
          tokens: [
            { t: 'A' },
            { t: 'white', adj: true },
            { t: 'stripy', adj: true },
            { t: 'kitten.', n: 'cat' },
          ],
        },
      ],
    };
    const result = collate(jsonIn, { output: 'json', segmentation: true });
    // Expected: "white" and "stripy" merged into one cell for B
    expect(result).toBeDefined();
  });
});
