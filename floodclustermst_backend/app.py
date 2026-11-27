
from flask import Flask, jsonify, request
from flask_cors import CORS

from config import (
    GRID_WIDTH,
    GRID_HEIGHT,
    DEFAULT_ELEVATION_WEIGHT,
    DEFAULT_RISK_WEIGHT,
    DEFAULT_DISTANCE_WEIGHT,
    DEFAULT_USE_DIAGONALS,
    DEFAULT_NUM_CLUSTERS,
)

from algorithms.data_loader import generate_grid_nodes
from algorithms.graph_builder import build_grid_graph
from algorithms.kruskal import compute_mst
from algorithms.clustering import cluster_from_mst, compute_cluster_stats


app = Flask(__name__)
CORS(app)  


NODES = generate_grid_nodes()
NUM_NODES = len(NODES)

LAST_RESULT = {
    "params": None,
    "clusters": None,
    "cluster_stats": None,
    "mst_edges": None,
}


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "nodes": NUM_NODES})


@app.route("/api/nodes", methods=["GET"])
def get_nodes():

    return jsonify({"nodes": NODES})


MAX_SIDE = 40


def _custom_nodes(data):
    """Validate a user-drawn terrain grid and return (nodes, width, height) in row-major id order."""
    width, height = int(data["width"]), int(data["height"])
    if not (2 <= width <= MAX_SIDE and 2 <= height <= MAX_SIDE):
        raise ValueError(f"width and height must be between 2 and {MAX_SIDE}")
    raw = data["nodes"]
    if len(raw) != width * height:
        raise ValueError(f"expected {width * height} nodes, got {len(raw)}")
    grid = {}
    for n in raw:
        x, y = int(n["x"]), int(n["y"])
        if not (0 <= x < width and 0 <= y < height):
            raise ValueError(f"node ({x}, {y}) is outside the grid")
        grid[(x, y)] = (float(n["elevation"]), min(1.0, max(0.0, float(n["risk_score"]))))
    if len(grid) != width * height:
        raise ValueError("every grid cell needs exactly one node")
    nodes = []
    for y in range(height):
        for x in range(width):
            elevation, risk = grid[(x, y)]
            nodes.append({"id": y * width + x, "x": x, "y": y, "elevation": elevation, "risk_score": risk})
    return nodes, width, height


@app.route("/api/compute", methods=["POST"])
def compute_clusters():
    """
    Compute MST and flood-risk clusters based on parameters.

    Request JSON body:
    {
      "k": int,  (optional, default DEFAULT_NUM_CLUSTERS)
      "elevation_weight": float (optional)
      "risk_weight": float (optional)
      "distance_weight": float (optional)
      "use_diagonals": bool (optional)
    }

    Response:
    {
      "params": {...},
      "clusters": { "node_id": cluster_id, ... },
      "cluster_stats": [...],
      "mst_edges": [
        {"u": id, "v": id, "weight": float, "cut": bool},
        ...
      ]
    }
    """
    data = request.get_json(force=True, silent=True)
    if data is None:
        return jsonify({"error": "Invalid or missing JSON body"}), 400

    try:
        k = int(data.get("k", DEFAULT_NUM_CLUSTERS))
        elevation_weight = float(data.get("elevation_weight", DEFAULT_ELEVATION_WEIGHT))
        risk_weight = float(data.get("risk_weight", DEFAULT_RISK_WEIGHT))
        distance_weight = float(data.get("distance_weight", DEFAULT_DISTANCE_WEIGHT))
        use_diagonals = bool(data.get("use_diagonals", DEFAULT_USE_DIAGONALS))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid parameter types"}), 400

    # Optional custom terrain: {"width": W, "height": H, "nodes": [{"x", "y", "elevation", "risk_score"}, ...]}
    nodes, width, height = NODES, GRID_WIDTH, GRID_HEIGHT
    if data.get("nodes") is not None:
        try:
            nodes, width, height = _custom_nodes(data)
        except (TypeError, ValueError, KeyError) as e:
            return jsonify({"error": f"Invalid terrain: {e}"}), 400
    num_nodes = len(nodes)

    if k < 1:
        return jsonify({"error": "k must be >= 1"}), 400
    if k > num_nodes:
        return jsonify({"error": "k cannot exceed number of nodes"}), 400

    edges = build_grid_graph(
        nodes,
        width=width,
        height=height,
        elevation_weight=elevation_weight,
        risk_weight=risk_weight,
        distance_weight=distance_weight,
        use_diagonals=use_diagonals,
    )

    mst_edges = compute_mst(num_nodes, edges)

    try:
        cluster_labels, mst_with_cut_info = cluster_from_mst(
            num_nodes, mst_edges, k
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    stats = compute_cluster_stats(nodes, cluster_labels)

    params = {
        "k": k,
        "elevation_weight": elevation_weight,
        "risk_weight": risk_weight,
        "distance_weight": distance_weight,
        "use_diagonals": use_diagonals,
    }

    LAST_RESULT["params"] = params
    LAST_RESULT["clusters"] = cluster_labels
    LAST_RESULT["cluster_stats"] = stats
    LAST_RESULT["mst_edges"] = mst_with_cut_info

    response = {
        "params": params,
        "clusters": cluster_labels,
        "cluster_stats": stats,
        "mst_edges": mst_with_cut_info,
    }

    return jsonify(response)


@app.route("/api/last_result", methods=["GET"])
def get_last_result():
    """
    Return the last computed clustering result, if any.
    """
    if LAST_RESULT["params"] is None:
        return jsonify({"error": "No computation has been performed yet."}), 404

    return jsonify(LAST_RESULT)
@app.route("/", methods=["GET"])
def index():
    return """
    <h1>FloodClusterMST Backend</h1>
    <p>The backend is running.</p>
    <p>Try these endpoints:</p>
    <ul>
      <li><a href="/api/health">/api/health</a></li>
      <li><a href="/api/nodes">/api/nodes</a></li>
    </ul>
    <p>Use POST /api/compute with JSON to compute clusters.</p>
    """


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
