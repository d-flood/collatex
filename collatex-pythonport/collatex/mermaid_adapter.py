"""Serialize a variant graph as Mermaid flowchart markup."""


def _escape_label(label):
    return str(label).replace("\\", "\\\\").replace('"', '\\"')


def render_variant_graph_as_mermaid(graph):
    lines = ["flowchart LR"]
    mapping = {}

    for index, node in enumerate(graph.graph.nodes(), start=1):
        node_id = "n" + str(index)
        mapping[node] = node_id
        lines.append('  {}["{}"]'.format(node_id, _escape_label(node.label)))

    for source, target, edge_data in graph.graph.edges(data=True):
        label = _escape_label(edge_data.get("label", ""))
        lines.append("  {} -->|{}| {}".format(mapping[source], label, mapping[target]))

    for source, target, edge_data in graph.near_graph.edges(data=True):
        weight = edge_data.get("weight", "")
        label = _escape_label("{:0.2f}".format(weight))
        lines.append("  {} -. {} .-> {}".format(mapping[source], label, mapping[target]))

    return "\n".join(lines)
