import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { computeClusters, fetchNodes } from "./api";
import "./quiet.css";
import "./App.css";

// Cluster color encodes exposure: calm slate for the safest cluster through amber to red for the riskiest.
const RAMP = ["8e9db3", "a8b5c7", "c9a56b", "ff9f0a", "ff6a3d", "e0352b", "d70015"];
function rampColor(t) {
  const x = Math.min(0.999, Math.max(0, t)) * (RAMP.length - 1);
  const i = Math.floor(x);
  return mix(RAMP[i], RAMP[i + 1], x - i);
}
const GRID = 20;
const LAYERS = [
  { id: "clusters", label: "Clusters" },
  { id: "elevation", label: "Elevation" },
  { id: "risk", label: "Risk" },
  { id: "tree", label: "Tree" },
];
const K_OPTIONS = [2, 3, 4, 5, 6, 8];

function mix(a, b, t) {
  const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16));
  const pb = b.match(/\w\w/g).map((h) => parseInt(h, 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(",")})`;
}

function Slider({ label, value, onChange, min = 0, max = 2, step = 0.1 }) {
  return (
    <div className="q-row slider-row">
      <label>{label}</label>
      <input className="q-range" type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} aria-label={label} />
      <span className="q-val">{value.toFixed(1)}</span>
    </div>
  );
}

export default function App() {
  const [nodes, setNodes] = useState([]);
  const [params, setParams] = useState({ k: 5, elevation_weight: 1, risk_weight: 1, distance_weight: 0.5, use_diagonals: true });
  const [result, setResult] = useState(null);
  const [layer, setLayer] = useState("clusters");
  const [hover, setHover] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef();

  useEffect(() => {
    fetchNodes().then((d) => setNodes(d.nodes)).catch(() => setError("Could not reach the API."));
  }, []);

  const run = useCallback((p) => {
    setBusy(true);
    computeClusters(p)
      .then((r) => { setResult(r); setError(""); })
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  }, []);

  // Recompute automatically, debounced, whenever a parameter changes.
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => run(params), 220);
    return () => clearTimeout(timer.current);
  }, [params, run]);

  const set = (key) => (value) => setParams((p) => ({ ...p, [key]: value }));

  const stats = useMemo(() => {
    if (!result) return [];
    return [...result.cluster_stats].sort((a, b) => b.avg_risk_score - a.avg_risk_score);
  }, [result]);

  const clusterColor = useMemo(() => {
    const byRisk = [...stats].reverse(); // safest first
    const map = {};
    byRisk.forEach((st, i) => { map[st.cluster_id] = rampColor(byRisk.length === 1 ? 0 : i / (byRisk.length - 1)); });
    return map;
  }, [stats]);

  const colorOf = (node) => {
    if (layer === "elevation") return mix("f5f5f7", "1d1d1f", node.elevation / 100);
    if (layer === "risk") return mix("fff1f0", "d70015", node.risk_score);
    if (layer === "tree") return "var(--bg-alt)";
    const c = result?.clusters?.[String(node.id)];
    return c === undefined ? "var(--hair-soft)" : clusterColor[c] || "var(--hair-soft)";
  };

  const cell = 26, gap = 3, size = GRID * cell;
  const center = (id) => {
    const n = nodes[id];
    return n ? [n.x * cell + cell / 2, n.y * cell + cell / 2] : [0, 0];
  };
  const cuts = result ? result.mst_edges.filter((e) => e.cut).length : 0;
  const riskiest = stats[0];

  return (
    <>
      <nav className="q-nav">
        <div className="q-wrap">
          <span className="q-brand">FloodClusterMST</span>
          <div className="q-links">
            <a href="#how">How it works</a>
            <a href="https://github.com/mostafaamer1234/FloodClusterMST">GitHub</a>
          </div>
        </div>
      </nav>

      <main>
        <header className="q-wrap q-hero">
          <p className="q-eyebrow">Graph algorithms · Kruskal's minimum spanning tree</p>
          <h1 className="q-title">Flood risk, grouped by the shape of the land. <span className="q-muted">Move a slider and the map regroups.</span></h1>
        </header>

        <section className="q-wrap stage">
          <div className="map">
            <div className="map-head">
              <div className="q-seg" role="group" aria-label="Map layer">
                {LAYERS.map((l) => (
                  <button key={l.id} aria-pressed={layer === l.id} onClick={() => setLayer(l.id)}>{l.label}</button>
                ))}
              </div>
              <span className={`q-note status ${busy ? "is-busy" : ""}`}>{error || (busy ? "Computing…" : "Up to date")}</span>
            </div>
            <svg viewBox={`0 0 ${size} ${size}`} className="grid" role="img" aria-label={`${GRID} by ${GRID} terrain grid colored by ${layer}`}>
              {nodes.map((n) => (
                <rect key={n.id} x={n.x * cell + gap / 2} y={n.y * cell + gap / 2} width={cell - gap} height={cell - gap} rx="5"
                  fill={colorOf(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(null)} className="cell" />
              ))}
              {layer === "tree" && result && result.mst_edges.map((e, i) => {
                const [x1, y1] = center(e.u), [x2, y2] = center(e.v);
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className={e.cut ? "edge cut" : "edge"} />;
              })}
            </svg>
            <p className="q-small hover-line">
              {hover
                ? <>Cell {hover.id} · ({hover.x}, {hover.y}) · elevation {hover.elevation.toFixed(0)} m · risk {hover.risk_score.toFixed(2)}{result ? ` · cluster ${result.clusters[String(hover.id)] + 1}` : ""}</>
                : "Hover a cell to inspect it."}
            </p>
            {(layer === "clusters" || layer === "risk") && (
              <div className="legend q-note"><span>{layer === "clusters" ? "Safer cluster" : "Low risk"}</span><i /><span>{layer === "clusters" ? "More exposed" : "High risk"}</span></div>
            )}
          </div>

          <aside className="panel">
            <p className="q-caps">Clusters</p>
            <div className="q-seg k-seg" role="group" aria-label="Number of clusters">
              {K_OPTIONS.map((k) => (
                <button key={k} aria-pressed={params.k === k} onClick={() => set("k")(k)}>{k}</button>
              ))}
            </div>

            <p className="q-caps weights-label">Edge weight</p>
            <div className="q-list">
              <Slider label="Elevation" value={params.elevation_weight} onChange={set("elevation_weight")} />
              <Slider label="Risk" value={params.risk_weight} onChange={set("risk_weight")} />
              <Slider label="Distance" value={params.distance_weight} onChange={set("distance_weight")} />
              <div className="q-row">
                <label htmlFor="diag">Diagonal neighbors</label>
                <label className="q-switch">
                  <input id="diag" type="checkbox" checked={params.use_diagonals} onChange={(e) => set("use_diagonals")(e.target.checked)} />
                  <span />
                </label>
              </div>
            </div>
            <p className="q-note panel-note">Each edge costs a weighted mix of elevation change, risk difference and distance. Cutting the k−1 most expensive tree edges leaves k regions.</p>
          </aside>
        </section>

        <section className="q-wrap q-section">
          <div className="q-figures">
            <div className="q-figure"><div className="q-num">{nodes.length || "—"}</div><div className="q-label">Locations on a {GRID}×{GRID} grid</div></div>
            <div className="q-figure"><div className="q-num">{result ? result.mst_edges.length : "—"}</div><div className="q-label">Edges in the minimum spanning tree</div></div>
            <div className="q-figure"><div className="q-num">{result ? cuts : "—"}</div><div className="q-label">Heaviest edges cut to form {params.k} clusters</div></div>
            <div className="q-figure"><div className="q-num">{riskiest ? riskiest.avg_risk_score.toFixed(2) : "—"}</div><div className="q-label">Average risk in the most exposed cluster</div></div>
          </div>
        </section>

        <section className="q-wrap q-section">
          <h2 className="q-h2">Clusters, most exposed first.</h2>
          <table className="q-ranked">
            <thead><tr><th>Cluster</th><th>Locations</th><th>Avg. elevation</th><th>Avg. risk</th></tr></thead>
            <tbody>
              {stats.map((s) => {
                const color = clusterColor[s.cluster_id];
                const share = (s.num_nodes / Math.max(1, nodes.length)) * 100;
                return (
                  <tr key={s.cluster_id}>
                    <td><div className="q-bar"><i style={{ width: `${Math.max(share, 2)}%`, background: color }} /><b><span className="dot" style={{ background: color }} />Cluster {s.cluster_id + 1}</b></div></td>
                    <td>{s.num_nodes}</td>
                    <td>{s.avg_elevation.toFixed(1)} m</td>
                    <td>{s.avg_risk_score.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="q-wrap q-section" id="how">
          <h2 className="q-h2">How it works.</h2>
          <div className="q-steps">
            <div className="q-step"><h3 className="q-h3">Build a graph</h3><p>Every location connects to its 4 or 8 neighbors. An edge's cost blends elevation change, risk difference and distance, using your weights.</p></div>
            <div className="q-step"><h3 className="q-h3">Find the cheapest tree</h3><p>Kruskal's algorithm with union-find keeps the 399 lowest-cost edges that connect all 400 locations without a cycle.</p></div>
            <div className="q-step"><h3 className="q-h3">Cut where it's steepest</h3><p>Removing the k−1 most expensive tree edges splits the region where terrain and risk change the most.</p></div>
          </div>
          <p className="q-note how-note">Data is synthetic and seeded. The algorithms are verified against networkx on random graphs in the repository's test suite.</p>
        </section>
      </main>

      <footer className="q-foot">
        <div className="q-wrap">
          <span>FloodClusterMST · Mostafa Amer &amp; Faahil Ali</span>
          <a href="https://github.com/mostafaamer1234/FloodClusterMST">Source on GitHub</a>
        </div>
      </footer>
    </>
  );
}
