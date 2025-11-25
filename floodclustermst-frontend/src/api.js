// src/api.js

const BASE_URL = "http://localhost:5000";

export async function fetchHealth() {
  const res = await fetch(`${BASE_URL}/api/health`);
  if (!res.ok) throw new Error("Failed to fetch health");
  return res.json();
}

export async function fetchNodes() {
  const res = await fetch(`${BASE_URL}/api/nodes`);
  if (!res.ok) throw new Error("Failed to fetch nodes");
  return res.json(); // { nodes: [...] }
}

export async function computeClusters(params) {
  const res = await fetch(`${BASE_URL}/api/compute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to compute clusters");
  }
  return res.json();
}
