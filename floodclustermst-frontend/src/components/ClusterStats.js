// src/components/ClusterStats.js

import React from "react";

// Same color palette used in GridView
const COLORS = [
  "#1f77b4",  // 0 - blue
  "#ff7f0e",  // 1 - orange
  "#2ca02c",  // 2 - green
  "#d62728",  // 3 - red
  "#9467bd",  // 4 - purple
  "#8c564b",  // 5 - brown
  "#e377c2",  // 6 - pink
  "#7f7f7f",  // 7 - gray
  "#bcbd22",  // 8 - yellow-green
  "#17becf"   // 9 - teal
];

function getClusterColor(clusterId) {
  if (clusterId == null || clusterId < 0) return "#cccccc";
  return COLORS[clusterId % COLORS.length];
}

export default function ClusterStats({ stats }) {
  if (!stats || stats.length === 0) {
    return (
      <div className="cluster-stats">
        <h2>Cluster Stats</h2>
        <p>No stats yet. Compute clusters first.</p>
      </div>
    );
  }

  return (
    <div className="cluster-stats">
      <h2>Cluster Stats</h2>
      <table>
        <thead>
          <tr>
            <th>Color</th>
            <th>Cluster ID</th>
            <th># Nodes</th>
            <th>Avg Elevation</th>
            <th>Avg Risk</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((c) => {
            const color = getClusterColor(c.cluster_id);
            return (
              <tr key={c.cluster_id}>
                <td>
                  <div 
                    style={{
                      width: "20px",
                      height: "20px",
                      backgroundColor: color,
                      borderRadius: "4px",
                      margin: "auto",
                      border: "1px solid #999"
                    }}
                  ></div>
                </td>
                <td>{c.cluster_id}</td>
                <td>{c.num_nodes}</td>
                <td>{c.avg_elevation.toFixed(1)}</td>
                <td>{c.avg_risk_score.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
