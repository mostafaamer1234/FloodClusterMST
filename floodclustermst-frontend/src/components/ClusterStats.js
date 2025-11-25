
import React from "react";

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
            <th>Cluster ID</th>
            <th># Nodes</th>
            <th>Avg Elevation</th>
            <th>Avg Risk</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((c) => (
            <tr key={c.cluster_id}>
              <td>{c.cluster_id}</td>
              <td>{c.num_nodes}</td>
              <td>{c.avg_elevation.toFixed(1)}</td>
              <td>{c.avg_risk_score.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
