
from typing import List, Dict, Tuple
import math


def _grid_neighbors(width: int, height: int, use_diagonals: bool = True):

    offsets = [
        (0, -1),
        (-1, 0),
        (1, 0),
        (0, 1),
    ]
    if use_diagonals:
        offsets.extend([
            (-1, -1),
            (1, -1),
            (-1, 1),
            (1, 1),
        ])
    return offsets


def build_grid_graph(
    nodes: List[Dict],
    width: int,
    height: int,
    elevation_weight: float = 1.0,
    risk_weight: float = 1.0,
    distance_weight: float = 0.5,
    use_diagonals: bool = True,
) -> List[Dict]:
    """
    Build a weighted graph from grid nodes.

    Returns a list of edges:
    [
      {"u": node_id_u, "v": node_id_v, "weight": float},
      ...
    ]

    Edge weight is a combination of:
    - elevation difference
    - risk score difference
    - spatial distance (grid distance)
    """
    id_to_node = {n["id"]: n for n in nodes}
    # Build a quick lookup for (x, y) -> node_id
    coord_to_id = {(n["x"], n["y"]): n["id"] for n in nodes}

    offsets = _grid_neighbors(width, height, use_diagonals)
    edges = []

    for node in nodes:
        x = node["x"]
        y = node["y"]
        u_id = node["id"]

        for dx, dy in offsets:
            nx, ny = x + dx, y + dy
            if 0 <= nx < width and 0 <= ny < height:
                v_id = coord_to_id[(nx, ny)]
                # To avoid duplicate undirected edges, only add if u_id < v_id
                if u_id < v_id:
                    u = id_to_node[u_id]
                    v = id_to_node[v_id]
                    w = compute_edge_weight(
                        u, v,
                        elevation_weight=elevation_weight,
                        risk_weight=risk_weight,
                        distance_weight=distance_weight,
                    )
                    edges.append({"u": u_id, "v": v_id, "weight": w})

    return edges


def compute_edge_weight(
    u: Dict,
    v: Dict,
    elevation_weight: float = 1.0,
    risk_weight: float = 1.0,
    distance_weight: float = 0.5,
) -> float:

    delev = abs(u["elevation"] - v["elevation"])
    drisk = abs(u["risk_score"] - v["risk_score"])

    dx = u["x"] - v["x"]
    dy = u["y"] - v["y"]
    dist = math.sqrt(dx * dx + dy * dy)

    weight = (
        elevation_weight * delev +
        risk_weight * drisk +
        distance_weight * dist
    )
    return float(weight)
