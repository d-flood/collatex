'''
Created on Sep 12, 2014

@author: Ronald Haentjens Dekker
'''
import unittest
from collatex import Collation, collate
from collatex.exceptions import SegmentationError


class Test(unittest.TestCase):

    def test_exact_matching(self):
        collation = Collation()
        collation.add_plain_witness("A", "I bought this glass , because it matches those dinner plates")
        collation.add_plain_witness("B", "I bought those glasses")
        alignment_table = collate(collation)
        self.assertEquals(["I bought ", "this glass , because it matches ", "those ", "dinner plates"],
                          alignment_table.rows[0].to_list_of_strings())
        self.assertEquals(["I bought ", None, "those ", "glasses"], alignment_table.rows[1].to_list_of_strings())

    def test_near_matching(self):
        collation = Collation()
        collation.add_plain_witness("A", "I bought this glass , because it matches those dinner plates")
        collation.add_plain_witness("B", "I bought those glasses")
        # Arguments to collate() must be passed as arguments to assertRaises()
        self.assertRaises(SegmentationError, collate, collation, near_match=True)

    def test_near_matching_accidentally_correct_short(self):
        collation = Collation()
        collation.add_plain_witness("A", "over this dog")
        collation.add_plain_witness("B", "over that there dog")
        alignment_table = str(collate(collation, near_match=True, segmentation=False))
        expected = """\
+---+------+------+-------+-----+
| A | over | this | -     | dog |
| B | over | that | there | dog |
+---+------+------+-------+-----+"""
        self.assertEquals(expected, alignment_table)

    def test_near_matching_accidentally_incorrect_short(self):
        collation = Collation()
        collation.add_plain_witness("A", "over this dog")
        collation.add_plain_witness("B", "over there that dog")
        alignment_table = str(collate(collation, near_match=True, segmentation=False))
        expected = """\
+---+------+-------+------+-----+
| A | over | -     | this | dog |
| B | over | there | that | dog |
+---+------+-------+------+-----+"""
        self.assertEquals(expected, alignment_table)

    def test_near_matching_accidentally_correct_long(self):
        collation = Collation()
        collation.add_plain_witness("A", "The brown fox jumps over this dog.")
        collation.add_plain_witness("B", "The brown fox jumps over that there dog.")
        alignment_table = str(collate(collation, near_match=True, segmentation=False))
        expected = """\
+---+-----+-------+-----+-------+------+------+-------+-----+---+
| A | The | brown | fox | jumps | over | this | -     | dog | . |
| B | The | brown | fox | jumps | over | that | there | dog | . |
+---+-----+-------+-----+-------+------+------+-------+-----+---+"""
        self.assertEquals(expected, alignment_table)

    def test_near_matching_accidentally_incorrect_long(self):
        self.maxDiff = None
        collation = Collation()
        collation.add_plain_witness("A", "The brown fox jumps over this dog.")
        collation.add_plain_witness("B", "The brown fox jumps over there that dog.")
        alignment_table = str(collate(collation, near_match=True, segmentation=False))
        expected = """\
+---+-----+-------+-----+-------+------+-------+------+-----+---+
| A | The | brown | fox | jumps | over | -     | this | dog | . |
| B | The | brown | fox | jumps | over | there | that | dog | . |
+---+-----+-------+-----+-------+------+-------+------+-----+---+"""
        self.assertEquals(expected, alignment_table)


if __name__ == "__main__":
    # import sys;sys.argv = ['', 'Test.testOmission']
    unittest.main()
