import unittest

from collatex import Collation, collate


class TestMermaidOutput(unittest.TestCase):
    def test_mermaid_output_contains_nodes_and_edges(self):
        collation = Collation()
        collation.add_plain_witness("A", "a b c")
        collation.add_plain_witness("B", "a d c")
        output = collate(collation, output="mermaid")

        self.assertTrue(output.startswith("flowchart LR"))
        self.assertIn("-->|A|", output)
        self.assertIn("-->|B|", output)
        self.assertIn('["start"]', output)
        self.assertIn('["end"]', output)

    def test_mermaid_output_contains_near_edges(self):
        collation = Collation()
        collation.add_plain_witness("A", "over this dog")
        collation.add_plain_witness("B", "over there that dog")
        output = collate(collation, output="mermaid", near_match=True, segmentation=False)

        self.assertIn("-.", output)
        self.assertIn(".->", output)


if __name__ == "__main__":
    unittest.main()
