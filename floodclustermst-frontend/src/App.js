import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { computeClusters, fetchNodes } from "./api";
import "./App.css";

// A flood-planning map: paint land and flood risk, and Kruskal's MST regroups it into k regions.
const W = 20, H = 20;
const RAMP = ["5b8a72", "8fb07a", "d6c07a", "f2a65a", "e86a3c", "c8322b", "8f1d2c"]; // safest to most exposed
const TOOLS = [
  { id: "inspect", label: "Inspect", hint: "Hover or tap a cell" },
  { id: "raise", label: "Raise land", hint: "Drag to build hills and levees" },
  { id: "lower", label: "Lower land", hint: "Drag to carve valleys" },
  { id: "wet", label: "Add risk", hint: "Drag to mark flood-prone ground" },
  { id: "dry", label: "Reduce risk", hint: "Drag to mark protected ground" },
];
const LAYERS = [["clusters", "Regions"], ["elevation", "Elevation"], ["risk", "Risk"], ["tree", "Spanning tree"]];
const K_OPTIONS = [2, 3, 4, 5, 6, 8];

const hex = (h) => h.match(/\w\w/g).map((v) => parseInt(v, 16));
const mix = (a, b, t) => { const pa = hex(a), pb = hex(b); return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(",")})`; };
const ramp = (t) => { const x = Math.min(0.999, Math.max(0, t)) * (RAMP.length - 1), i = Math.floor(x); return mix(RAMP[i], RAMP[i + 1], x - i); };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
const PRESETS = {
  // sharp features, light noise: Kruskal cuts where the land really changes
  river: (x, y, r) => { const d = Math.abs(x - (10 + 3 * Math.sin(y / 3))); return d < 1.6 ? [4 + r(), 0.95] : d < 3.2 ? [18 + r() * 2, 0.7] : [45 + d * 3 + r() * 2, clamp(0.35 - d * 0.03, 0, 1)]; },
  coast: (x, y, r) => (x < 4 ? [1, 1] : x < 7 ? [8 + r() * 2, 0.8] : x < 15 ? [35 + r() * 3, 0.3] : [70 + (x - 15) * 4 + r() * 2, 0.05]),
  hills: (x, y) => { const h1 = 85 * Math.exp(-((x - 5) ** 2 + (y - 6) ** 2) / 14), h2 = 75 * Math.exp(-((x - 14) ** 2 + (y - 13) ** 2) / 16); const e = clamp(6 + h1 + h2, 0, 100); return [e, clamp(1 - e / 45, 0, 1)]; },
  flat: (x, y, r) => [30 + r() * 2, 0.3],
};
const gridFrom = (fn, seed = 7) => { const r = rng(seed), out = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const [e, k] = fn(x, y, r); out.push({ id: y * W + x, x, y, elevation: e, risk_score: k }); } return out; };

export default function App() {
  const [nodes, setNodes] = useState([]);
  const [params, setParams] = useState({ k: 5, elevation_weight: 1, risk_weight: 1, distance_weight: 0.5, use_diagonals: true });
  const [result, setResult] = useState(null);
  const [layer, setLayer] = useState("clusters");
  const [tool, setTool] = useState("inspect");
  const [brush, setBrush] = useState(2);
  const [hover, setHover] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preset, setPreset] = useState("sample");
  const painting = useRef(false), timer = useRef(), svgRef = useRef(), seq = useRef(0);

  useEffect(() => { fetchNodes().then((d) => setNodes(d.nodes)).catch(() => setError("Could not reach the clustering API.")); }, []);

  const run = useCallback((p, n) => {
    if (!n.length) return;
    const id = ++seq.current;
    setBusy(true);
    computeClusters({ ...p, width: W, height: H, nodes: n.map(({ x, y, elevation, risk_score }) => ({ x, y, elevation, risk_score })) })
      .then((r) => { if (id === seq.current) { setResult(r); setError(""); } })
      .catch((e) => setError(e.message))
      .finally(() => { if (id === seq.current) setBusy(false); });
  }, []);
  useEffect(() => { clearTimeout(timer.current); timer.current = setTimeout(() => run(params, nodes), painting.current ? 400 : 180); return () => clearTimeout(timer.current); }, [params, nodes, run]);

  const set = (key) => (value) => setParams((p) => ({ ...p, [key]: value }));
  const stats = useMemo(() => (result ? [...result.cluster_stats].sort((a, b) => b.avg_risk_score - a.avg_risk_score) : []), [result]);
  const colorOfCluster = useMemo(() => { const m = {}; const safeFirst = [...stats].reverse(); safeFirst.forEach((s, i) => (m[s.cluster_id] = ramp(safeFirst.length === 1 ? 0 : i / (safeFirst.length - 1)))); return m; }, [stats]);
  const label = (id) => result?.clusters?.[String(id)];

  const fill = (n) => {
    if (layer === "elevation") return mix("2f5d50", "efe6c8", n.elevation / 100);
    if (layer === "risk") return mix("e9f1f7", "1f5fa8", n.risk_score);
    if (layer === "tree") return mix("f3efe3", "c9bfa6", n.elevation / 100);
    const c = label(n.id);
    return c === undefined ? "#d9d2bf" : colorOfCluster[c];
  };

  const cell = 30;
  // borders between different regions, drawn as thick lines like map boundaries
  const borders = useMemo(() => {
    if (!result || layer !== "clusters") return [];
    const label = (id) => result.clusters[String(id)];
    const out = [];
    for (const n of nodes) {
      const c = label(n.id);
      if (n.x + 1 < W && label(n.id + 1) !== c) out.push([(n.x + 1) * cell, n.y * cell, (n.x + 1) * cell, (n.y + 1) * cell]);
      if (n.y + 1 < H && label(n.id + W) !== c) out.push([n.x * cell, (n.y + 1) * cell, (n.x + 1) * cell, (n.y + 1) * cell]);
    }
    return out;
  }, [result, nodes, layer]);

  function paintAt(cx, cy) {
    if (tool === "inspect") return;
    setNodes((ns) => ns.map((n) => {
      const d = Math.hypot(n.x - cx, n.y - cy);
      if (d > brush - 0.5) return n;
      const f = 1 - d / (brush + 0.5);
      if (tool === "raise") return { ...n, elevation: clamp(n.elevation + 12 * f, 0, 100) };
      if (tool === "lower") return { ...n, elevation: clamp(n.elevation - 12 * f, 0, 100) };
      if (tool === "wet") return { ...n, risk_score: clamp(n.risk_score + 0.25 * f, 0, 1) };
      return { ...n, risk_score: clamp(n.risk_score - 0.25 * f, 0, 1) };
    }));
    setPreset("custom");
  }
  function cellFromEvent(e) {
    const r = svgRef.current.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * W), y = Math.floor(((e.clientY - r.top) / r.height) * H);
    return x >= 0 && x < W && y >= 0 && y < H ? [x, y] : null;
  }
  const onDown = (e) => { const c = cellFromEvent(e); if (!c) return; painting.current = tool !== "inspect"; e.currentTarget.setPointerCapture?.(e.pointerId); paintAt(c[0], c[1]); setHover(nodes[c[1] * W + c[0]]); };
  const onMove = (e) => { const c = cellFromEvent(e); if (!c) return; setHover(nodes[c[1] * W + c[0]]); if (painting.current) paintAt(c[0], c[1]); };
  const onUp = () => { painting.current = false; };

  function loadPreset(p) {
    setPreset(p);
    if (p === "sample") fetchNodes().then((d) => setNodes(d.nodes));
    else setNodes(gridFrom(PRESETS[p], p === "flat" ? 3 : 11));
  }
  function exportCsv() {
    const rows = nodes.map((n) => `${n.x},${n.y},${n.elevation.toFixed(1)},${n.risk_score.toFixed(3)},${(label(n.id) ?? -1) + 1}`);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([`x,y,elevation,risk,region\n${rows.join("\n")}`], { type: "text/csv" }));
    a.download = "flood-regions.csv"; a.click(); URL.revokeObjectURL(a.href);
  }

  const hovered = hover && nodes[hover.id];
  const riskiest = stats[0];
  return (
    <div className="app">
      <header className="top">
        <a className="brand" href="/"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3 22c4-6 8-6 13 0s9 6 13 0" /><path d="M3 14c4-6 8-6 13 0s9 6 13 0" /><path d="M3 30c4-6 8-6 13 0s9 6 13 0" /></svg>FloodClusterMST</a>
        <p className="sub">Draw the land, mark the flood risk, and Kruskal's spanning tree splits it into planning regions.</p>
        <nav><a href="/about">How it works</a><a href="https://github.com/mostafaamer1234/FloodClusterMST">GitHub</a></nav>
      </header>

      <main className="work">
        <section className="mapcard">
          <div className="maphead">
            <div className="seg" role="group" aria-label="Map layer">{LAYERS.map(([id, l]) => <button key={id} aria-pressed={layer === id} onClick={() => setLayer(id)}>{l}</button>)}</div>
            <span className={`status ${busy ? "busy" : ""} ${error ? "err" : ""}`}>{error || (busy ? "Regrouping…" : "Up to date")}</span>
          </div>
          <div className={`mapframe tool-${tool}`}>
            <svg ref={svgRef} viewBox={`0 0 ${W * cell} ${H * cell}`} className="grid" role="img" aria-label="Terrain grid"
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={() => { onUp(); setHover(null); }}>
              {nodes.map((n) => <rect key={n.id} x={n.x * cell + 1} y={n.y * cell + 1} width={cell - 2} height={cell - 2} rx="4" fill={fill(n)} className={hover?.id === n.id ? "cell hot" : "cell"} />)}
              {layer === "tree" && result && result.mst_edges.map((e, i) => {
                const a = nodes[e.u], b = nodes[e.v];
                return a && b ? <line key={i} x1={a.x * cell + cell / 2} y1={a.y * cell + cell / 2} x2={b.x * cell + cell / 2} y2={b.y * cell + cell / 2} className={e.cut ? "edge cut" : "edge"} /> : null;
              })}
              {borders.map(([x1, y1, x2, y2], i) => <line key={`b${i}`} x1={x1} y1={y1} x2={x2} y2={y2} className="border" />)}
            </svg>
          </div>
          <p className="readout">{hovered
            ? <>Cell ({hovered.x}, {hovered.y}) · elevation <b>{hovered.elevation.toFixed(0)} m</b> · flood risk <b>{hovered.risk_score.toFixed(2)}</b>{label(hovered.id) !== undefined ? <> · region <b>{label(hovered.id) + 1}</b></> : null}</>
            : TOOLS.find((t) => t.id === tool).hint}</p>
        </section>

        <aside className="side">
          <section className="card">
            <h2>Draw</h2>
            <div className="tools">{TOOLS.map((t) => <button key={t.id} className={`tool t-${t.id}`} aria-pressed={tool === t.id} onClick={() => setTool(t.id)}>{t.label}</button>)}</div>
            <label className="slider"><span>Brush size</span><input type="range" min="1" max="4" step="1" value={brush} onChange={(e) => setBrush(+e.target.value)} /><b>{brush}</b></label>
            <h3>Start from</h3>
            <div className="presets">
              {[["sample", "Sample slope"], ["river", "River valley"], ["coast", "Coastline"], ["hills", "Two hills"], ["flat", "Blank plain"]].map(([id, l]) => <button key={id} aria-pressed={preset === id} onClick={() => loadPreset(id)}>{l}</button>)}
            </div>
          </section>

          <section className="card">
            <h2>Group</h2>
            <h3>Regions</h3>
            <div className="seg k" role="group" aria-label="Number of regions">{K_OPTIONS.map((k) => <button key={k} aria-pressed={params.k === k} onClick={() => set("k")(k)}>{k}</button>)}</div>
            <h3>What makes a border</h3>
            {[["elevation_weight", "Elevation change"], ["risk_weight", "Risk difference"], ["distance_weight", "Distance"]].map(([key, l]) => (
              <label className="slider" key={key}><span>{l}</span><input type="range" min="0" max="2" step="0.1" value={params[key]} onChange={(e) => set(key)(parseFloat(e.target.value))} /><b>{params[key].toFixed(1)}</b></label>
            ))}
            <label className="check"><input type="checkbox" checked={params.use_diagonals} onChange={(e) => set("use_diagonals")(e.target.checked)} /> Connect diagonal neighbors</label>
          </section>

          <section className="card">
            <h2>Regions, most exposed first</h2>
            <ul className="regions">
              {stats.map((s) => (
                <li key={s.cluster_id}><i style={{ background: colorOfCluster[s.cluster_id] }} /><b>Region {s.cluster_id + 1}</b><span>{s.num_nodes} cells</span><span>{s.avg_elevation.toFixed(0)} m</span><span>risk {s.avg_risk_score.toFixed(2)}</span></li>
              ))}
            </ul>
            {riskiest && <p className="note">Region {riskiest.cluster_id + 1} averages {riskiest.avg_risk_score.toFixed(2)} flood risk. The {params.k - 1} border{params.k > 2 ? "s were" : " was"} cut where land and risk change most.</p>}
            <button className="export" onClick={exportCsv} disabled={!result}>Download regions as CSV</button>
          </section>
        </aside>
      </main>
    </div>
  );
}
