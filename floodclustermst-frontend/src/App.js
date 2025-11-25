// src/App.js

import React, { useEffect, useState } from "react";
import { fetchHealth, fetchNodes, computeClusters } from "./api";
import GridView from "./components/GridView";
import Controls from "./components/Controls";
import ClusterStats from "./components/ClusterStats";

const GRID_WIDTH = 20;  // must match backend config
const GRID_HEIGHT = 20; // must match backend config

const DEFAULT_PARAMS = {
  k: 5,
  elevation_weight: 1.0,
  risk_weight: 1.0,
  distance_weight: 0.5,
  use_diagonals: true
};

function App() {
  const [health, setHealth] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [clusterLabels, setClusterLabels] = useState(null);
  const [clusterStats, setClusterStats] = useState([]);
  const [mstEdges, setMstEdges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const h = await fetchHealth();
        setHealth(h);
        const n = await fetchNodes();
        setNodes(n.nodes || []);
      } catch (err) {
        console.error(err);
        setErrorMsg("Failed to load data from backend. Is it running?");
      }
    }
    init();
  }, []);

  const handleCompute = async (params) => {
    try {
      setLoading(true);
      setErrorMsg("");
      const result = await computeClusters(params);
      setClusterLabels(result.clusters);
      setClusterStats(result.cluster_stats);
      setMstEdges(result.mst_edges);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to compute clusters.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>FloodClusterMST</h1>
        <p>
          Flood-risk clustering using Kruskal's MST on a synthetic grid of locations.
        </p>
        {health && (
          <p className="health-info">
            Backend status: <strong>{health.status}</strong> – Nodes:{" "}
            <strong>{health.nodes}</strong>
          </p>
        )}
      </header>

      <div className="app-body">
        <Controls onCompute={handleCompute} defaultParams={DEFAULT_PARAMS} />

        <div className="main-panel">
          {errorMsg && <div className="error-banner">{errorMsg}</div>}
          {loading && <div className="loading-banner">Computing clusters...</div>}

          <GridView
            nodes={nodes}
            clusterLabels={clusterLabels}
            gridWidth={GRID_WIDTH}
            gridHeight={GRID_HEIGHT}
          />

          <ClusterStats stats={clusterStats} />
        </div>
      </div>
    </div>
  );
}

export default App;
