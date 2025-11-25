
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

    if k < 1:
        return jsonify({"error": "k must be >= 1"}), 400
    if k > NUM_NODES:
        return jsonify({"error": "k cannot exceed number of nodes"}), 400

    edges = build_grid_graph(
        NODES,
        width=GRID_WIDTH,
        height=GRID_HEIGHT,
        elevation_weight=elevation_weight,
        risk_weight=risk_weight,
        distance_weight=distance_weight,
        use_diagonals=use_diagonals,
    )

    mst_edges = compute_mst(NUM_NODES, edges)

    try:
        cluster_labels, mst_with_cut_info = cluster_from_mst(
            NUM_NODES, mst_edges, k
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    stats = compute_cluster_stats(NODES, cluster_labels)

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
