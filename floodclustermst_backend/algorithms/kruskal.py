
from typing import List, Dict, Tuple
from .disjoint_set import DisjointSet


def compute_mst(num_nodes: int, edges: List[Dict]) -> List[Dict]:

    sorted_edges = sorted(edges, key=lambda e: e["weight"])

    dsu = DisjointSet(num_nodes)
    mst_edges: List[Dict] = []

    for edge in sorted_edges:
        u = edge["u"]
        v = edge["v"]
        if dsu.union(u, v):
            mst_edges.append(edge)
            if len(mst_edges) == num_nodes - 1:
                break

    return mst_edges
