
import React, { useState } from "react";

export default function Controls({ onCompute, defaultParams }) {
  const [k, setK] = useState(defaultParams.k);
  const [elevationWeight, setElevationWeight] = useState(defaultParams.elevation_weight);
  const [riskWeight, setRiskWeight] = useState(defaultParams.risk_weight);
  const [distanceWeight, setDistanceWeight] = useState(defaultParams.distance_weight);
  const [useDiagonals, setUseDiagonals] = useState(defaultParams.use_diagonals);

  const handleSubmit = (e) => {
    e.preventDefault();
    onCompute({
      k,
      elevation_weight: elevationWeight,
      risk_weight: riskWeight,
      distance_weight: distanceWeight,
      use_diagonals: useDiagonals,
    });
  };

  return (
    <form className="controls" onSubmit={handleSubmit}>
      <h2>Controls</h2>

      <label>
        Number of clusters (k):
        <input
          type="number"
          min="1"
          value={k}
          onChange={(e) => setK(Number(e.target.value))}
        />
      </label>

      <label>
        Elevation weight:
        <input
          type="number"
          step="0.1"
          value={elevationWeight}
          onChange={(e) => setElevationWeight(Number(e.target.value))}
        />
      </label>

      <label>
        Risk weight:
        <input
          type="number"
          step="0.1"
          value={riskWeight}
          onChange={(e) => setRiskWeight(Number(e.target.value))}
        />
      </label>

      <label>
        Distance weight:
        <input
          type="number"
          step="0.1"
          value={distanceWeight}
          onChange={(e) => setDistanceWeight(Number(e.target.value))}
        />
      </label>

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={useDiagonals}
          onChange={(e) => setUseDiagonals(e.target.checked)}
        />
        Use diagonal neighbors
      </label>

      <button type="submit">Recompute Clusters</button>
    </form>
  );
}
