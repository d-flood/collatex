'''
Created on Nov 13, 2014

@author: Ronald Haentjens Dekker
@author: David J. Birnbaum
'''
from textwrap import fill
from collatex.HTML import Table, TableRow, TableCell
from collatex.core_classes import create_table_visualization
import collatex.core_classes as cc
import csv
import io



def visualize_table_vertically_with_colors(table, collation):
    # print the table vertically
    # switch columns and rows
    rows = []
    for column in table.columns:
        cells = []
        for witness in collation.witnesses:
            cell = column.tokens_per_witness.get(witness.sigil)
            cells.append(TableCell(text=fill("".join(item.token_data["t"] for item in cell) if cell else "-", 20), bgcolor="FF0000" if column.variant else "00FFFF", style='text-align: center'))
        rows.append(TableRow(cells=cells))
    sigli = []
    for witness in collation.witnesses:
        sigli.append(witness.sigil)
    x = Table(header_row=sigli, rows=rows)
    return str(x)

def visualize_table_horizontally_with_colors(table: cc.AlignmentTable, collation, segmentation: bool, basetext_siglum: str, sort_by_agreement, ignore_case_in_html2: bool):
    '''Return a horizontal HTML table with number of disagreements 
       from the basetext optionally sorted by agreement'''
    rows = []
    indices = []
    index = 2
    for witness in collation.witnesses:
        cells = [TableCell(text=witness.sigil, bgcolor='f2f2f2', style='text-align: center')]
        variants_from_base = 0
        for column in table.columns:
            cell = column.tokens_per_witness.get(witness.sigil)
            basetext_cell = column.tokens_per_witness.get(basetext_siglum)
            cell_text = "".join(item.token_data["t"] for item in cell) if cell else "-"
            base_text = "".join(item.token_data["t"] for item in basetext_cell) if basetext_cell else "-"
            if ignore_case_in_html2:
                cell_text = cell_text.lower()
                base_text = base_text.lower()
            if cell_text != base_text:
                bgcolor = 'fa9392'
                variants_from_base += 1
            elif witness.sigil == basetext_siglum:
                bgcolor = 'ffffff'
                if base_text == '-':
                    indices.append('-')
                else:
                    indices.append(index)
                    index += 2
            else:
                bgcolor = '99ffbb'
            cells.append(TableCell(text=fill(cell_text, 20), bgcolor=bgcolor, style='text-align: center'))
        cells.insert(1, TableCell(text=f'{variants_from_base}', bgcolor='f2f2f2', style='text-align: center')) 
        rows.append(TableRow(cells=cells))
    if sort_by_agreement:
        rows = sorted(rows, key=lambda x: x.cells[1].text)
    if not segmentation:
        cells = []
        headers = [TableCell('Wit', bgcolor='f2f2f2', style='text-align: center'), TableCell('Dist', bgcolor='f2f2f2', style='text-align: center')]
        for i, column in zip(indices, table.columns):
            if column.variant:
                bgcolor = 'ffde57'
            else:
                bgcolor = 'f2f2f2'
            cells.append(TableCell(i, bgcolor=bgcolor, style='text-align: center'))
        headers.extend(cells)
        rows.insert(0, headers)
    x = Table(rows=rows)
    return str(x)


# create visualization of alignment table
def display_alignment_table_as_html(at):
    pretty_table = create_table_visualization(at)
    html = pretty_table.get_html_string(formatting=True)
    return html


# export alignment table as CSV (or TSV)
def display_alignment_table_as_csv(at, output):
    # http://2017.compciv.org/guide/topics/python-standard-library/csv.html
    # https://stackoverflow.com/questions/9157623/unexpected-behavior-of-universal-newline-mode-with-stringio-and-csv-modules
    data = io.StringIO(newline=None)
    if output == "tsv":
        writer = csv.writer(data, dialect="excel-tab")
    else:
        writer = csv.writer(data)
    for row in at.rows:
        row_list = row.to_list_of_strings()
        row_list.insert(0, row.header)
        writer.writerow(row_list)
    return data.getvalue()


'''Removing all graphviz support for now'''
# visualize the variant graph into SVG format
# def display_variant_graph_as_svg(graph, output, graph_type):
#     a = graphviz.Digraph(format=graph_type, graph_attr={'rankdir': 'LR'})
#     counter = 0
#     mapping = {}
#     ranking = VariantGraphRanking.of(graph)

#     # add nodes
#     for n in graph.graph.nodes():
#         counter += 1
#         mapping[n] = str(counter)
#         if output == "svg_simple":
#             label = n.label
#             if label == '':
#                 label = '#'
#             a.node(mapping[n], label=label)
#         else:
#             rank = ranking.byVertex[n]
#             readings = ["<TR><TD ALIGN='LEFT'><B>" + n.label + "</B></TD><TD ALIGN='LEFT'>exact: " + str(
#                 rank) + "</TD></TR>"]
#             reverse_dict = defaultdict(list)
#             for key, value in n.tokens.items():
#                 reverse_dict["".join(
#                     re.sub(r'>', r'&gt;', re.sub(r'<', r'&lt;', item.token_data["t"])) for item in value)].append(
#                     key)
#             for key, value in sorted(reverse_dict.items()):
#                 reading = (
#                     "<TR><TD ALIGN='LEFT'><FONT FACE='Bukyvede'>{}</FONT></TD><TD ALIGN='LEFT'>{}</TD></TR>").format(
#                     key, ', '.join(value))
#                 readings.append(reading)
#             a.node(mapping[n], label='<<TABLE CELLSPACING="0">' + "".join(readings) + '</TABLE>>')

    # add regular (token sequence) edges
    # for u,v,edgedata in graph.graph.edges(data=True):
    #     # print('regular edges ', u, v, edgedata)
    #     label = edgedata['label']
    #     a.edge(mapping[u], mapping[v], label=label)

    # # add near-match edges
    # # TODO: Show all near edges (currently), or just the top one?
    # for u,v,edgedata in graph.near_graph.edges(data=True):
    #     # print('near-match edges ', u, v, edgedata)
    #     label = str('{:3.2f}'.format(edgedata['weight']))
    #     a.edge(mapping[u], mapping[v], style='dashed', label=label)
    # # Add rank='same' information
    # for key, value in ranking.byRank.items():
    #     # print(key, value)
    #     # print(key, value, len(value))
    #     # print(key, set(value), len(set(value)))
    #     tmp = graphviz.Digraph(graph_attr={'rank': 'same'})
    #     for n in [mapping[item] for item in value]:
    #         tmp.node(n)
    #     a.subgraph(tmp)
    # # diagnostic, not for production
    # # dot = a.draw(prog='dot')
    # # print(dot.decode(encoding='utf-8'))
    # # # display using the IPython SVG module
    # return a.render()
