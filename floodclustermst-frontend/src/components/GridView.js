
import React from "react";

const COLORS = [
  "#1f77b4",
  "#ff7f0e",
  "#2ca02c",
  "#d62728",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#7f7f7f",
  "#bcbd22",
  "#17becf"
];

function getClusterColor(clusterId) {
  if (clusterId == null || clusterId < 0) return "#cccccc";
  return COLORS[clusterId % COLORS.length];
}

export default function GridView({ nodes, clusterLabels, gridWidth, gridHeight }) {
  if (!nodes || nodes.length === 0) {
    return <div>No nodes loaded.</div>;
  }

  const grid = Array.from({ length: gridHeight }, () => Array(gridWidth).fill(null));

  nodes.forEach((node) => {
    const { x, y } = node;
    if (y >= 0 && y < gridHeight && x >= 0 && x < gridWidth) {
      grid[y][x] = node;
    }
  });

  return (
    <div className="grid-container">
      {grid.map((row, y) => (
        <div key={y} className="grid-row">
          {row.map((node, x) => {
            if (!node) {
              return <div key={x} className="grid-cell empty"></div>;
            }
            const clusterId = clusterLabels ? clusterLabels[node.id] : null;
            const color = getClusterColor(clusterId);
            const title = `Node ${node.id}\n(x=${node.x}, y=${node.y})\nElev=${node.elevation.toFixed(
              1
            )}\nRisk=${node.risk_score.toFixed(2)}\nCluster=${clusterId}`;
            return (
              <div
                key={x}
                className="grid-cell"
                style={{ backgroundColor: color }}
                title={title}
              ></div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
