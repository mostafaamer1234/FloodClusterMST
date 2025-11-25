
from typing import List, Dict, Tuple
from .disjoint_set import DisjointSet


def cluster_from_mst(
    num_nodes: int,
    mst_edges: List[Dict],
    k: int,
) -> Tuple[Dict[int, int], List[Dict]]:
    """
    Cluster nodes by cutting the MST into k components.

    Steps:
    1. Sort MST edges by weight descending.
    2. Remove top (k - 1) edges to create k clusters.
    3. Use Union-Find on remaining edges to find connected components.

    Returns
    -------
    cluster_labels : Dict[node_id, cluster_id]
        Mapping from node_id to cluster index (0..k-1).
    mst_with_cut_info : List[Dict]
        MST edges annotated with "cut": bool indicating whether the edge was removed.
    """
    if k < 1:
        raise ValueError("k must be >= 1")
    if k > num_nodes:
        raise ValueError("k cannot exceed number of nodes")

   
    sorted_edges_desc = sorted(mst_edges, key=lambda e: e["weight"], reverse=True)


    mst_with_cut_info = []
    for idx, edge in enumerate(sorted_edges_desc):
        cut = idx < (k - 1)
        edge_copy = dict(edge)
        edge_copy["cut"] = cut
        mst_with_cut_info.append(edge_copy)

    remaining_edges = [e for e in mst_with_cut_info if not e["cut"]]

    dsu = DisjointSet(num_nodes)
    for edge in remaining_edges:
        dsu.union(edge["u"], edge["v"])


    root_to_cluster_id: Dict[int, int] = {}
    cluster_labels: Dict[int, int] = {}
    next_cluster_id = 0

    for node_id in range(num_nodes):
        root = dsu.find(node_id)
        if root not in root_to_cluster_id:
            root_to_cluster_id[root] = next_cluster_id
            next_cluster_id += 1
        cluster_labels[node_id] = root_to_cluster_id[root]



    return cluster_labels, mst_with_cut_info


def compute_cluster_stats(
    nodes: List[Dict],
    cluster_labels: Dict[int, int],
) -> List[Dict]:
    """
    Compute summary statistics for each cluster:
    - cluster_id
    - num_nodes
    - avg_elevation
    - avg_risk_score
    """
    cluster_data: Dict[int, Dict] = {}

    for node in nodes:
        nid = node["id"]
        cid = cluster_labels[nid]
        if cid not in cluster_data:
            cluster_data[cid] = {
                "cluster_id": cid,
                "num_nodes": 0,
                "sum_elevation": 0.0,
                "sum_risk_score": 0.0,
            }

        cluster_data[cid]["num_nodes"] += 1
        cluster_data[cid]["sum_elevation"] += float(node["elevation"])
        cluster_data[cid]["sum_risk_score"] += float(node["risk_score"])

    stats: List[Dict] = []
    for cid, data in sorted(cluster_data.items(), key=lambda item: item[0]):
        n = data["num_nodes"]
        avg_elev = data["sum_elevation"] / n if n > 0 else 0.0
        avg_risk = data["sum_risk_score"] / n if n > 0 else 0.0
        stats.append(
            {
                "cluster_id": cid,
                "num_nodes": n,
                "avg_elevation": avg_elev,
                "avg_risk_score": avg_risk,
            }
        )

    return stats
