from __future__ import annotations

import random

import networkx as nx
import pytest

from algorithms.clustering import cluster_from_mst
from algorithms.data_loader import generate_grid_nodes
from algorithms.disjoint_set import DisjointSet
from algorithms.kruskal import compute_mst


def random_connected_graph(n: int, extra: int, seed: int) -> list[dict]:
    rng = random.Random(seed)
    edges = [{"u": i, "v": rng.randrange(i), "weight": rng.random()} for i in range(1, n)]  # spanning tree
    for _ in range(extra):
        u, v = rng.sample(range(n), 2)
        edges.append({"u": u, "v": v, "weight": rng.random()})
    return edges


@pytest.mark.parametrize("seed", range(20))
def test_kruskal_weight_matches_networkx(seed):
    n = 60
    edges = random_connected_graph(n, extra=200, seed=seed)
    mst = compute_mst(n, edges)
    g = nx.Graph()
    for e in edges:
        if not g.has_edge(e["u"], e["v"]) or g[e["u"]][e["v"]]["weight"] > e["weight"]:
            g.add_edge(e["u"], e["v"], weight=e["weight"])
    expected = nx.minimum_spanning_tree(g).size(weight="weight")
    assert len(mst) == n - 1
    assert sum(e["weight"] for e in mst) == pytest.approx(expected)


@pytest.mark.parametrize("k", [1, 2, 5, 10])
def test_cutting_k_minus_1_heaviest_edges_gives_k_clusters(k):
    n = 40
    mst = compute_mst(n, random_connected_graph(n, extra=80, seed=k))
    labels, annotated = cluster_from_mst(n, mst, k)
    assert len(set(labels.values())) == k
    assert sum(e["cut"] for e in annotated) == k - 1
    cut_weights = [e["weight"] for e in annotated if e["cut"]]
    kept_weights = [e["weight"] for e in annotated if not e["cut"]]
    assert not cut_weights or min(cut_weights) >= max(kept_weights)


def test_invalid_k_is_rejected():
    with pytest.raises(ValueError):
        cluster_from_mst(3, [], 0)
    with pytest.raises(ValueError):
        cluster_from_mst(3, [], 4)


def test_disjoint_set_union_find():
    dsu = DisjointSet(5)
    assert dsu.union(0, 1) and dsu.union(1, 2)
    assert not dsu.union(0, 2)  # already connected
    assert dsu.find(0) == dsu.find(2) != dsu.find(3)


def test_grid_generation_is_deterministic():
    assert generate_grid_nodes(seed=7) == generate_grid_nodes(seed=7)
