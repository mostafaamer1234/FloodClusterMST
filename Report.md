# FloodClusterMST

**Author:** Mostafa Tarek & Faahil Ali  
**Course:** CMPSC 463 — Project 2

## Description of Project

FloodClusterMST is a web application that simulates flood risk clustering on a synthetic grid of geographic locations. The system computes clusters using a weighted Minimum Spanning Tree (MST) built by Kruskal’s algorithm. Each grid cell represents a location with elevation, flood risk, and spatial position. Clusters are formed by removing the largest edges in the MST, allowing users to explore how different weights and parameters influence the identification of high-risk or vulnerable areas.

The goal of the project is to apply algorithmic design and analysis concepts to a realistic weather crisis scenario.

## Significance

Flooding is one of the most frequent and damaging weather crises. Identifying regions that are structurally similar in elevation and flood risk is important for planning, response, and prevention.

This project is meaningful because:
- It demonstrates how classical algorithms like Kruskal’s MST and Union-Find can be applied to real-world crisis scenarios.
- It provides a dynamic, visual tool that allows users to explore how risk changes when parameters (elevation weight, risk weight, distance weight) are adjusted.
- It mimics how agencies might identify hazard zones or watershed clusters.
- It shows how algorithmic decisions affect clustering outcomes, which is an important part of reasoning about real-world data.

The project connects theoretical algorithms to a practical domain, making it both educational and relevant.

## Code Structure
``` python
FloodClusterMST/
│
├── floodclustermst_backend/
│   ├── app.py
│   ├── data_loader.py
│   ├── graph_builder.py
│   ├── disjoint_set.py
│   ├── clustering.py
│   ├── kruskal.py
│   └── __init__.py
│
├── floodclustermst-frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── api.js
│   │   ├── components/
│   │   │   ├── GridView.js
│   │   │   ├── Controls.js
│   │   │   └── ClusterStats.js
│   └── package.json
│
└── Report.md
```

Backend:
- Generates grid data
- Computes edge weights
- Runs Kruskal’s MST
- Cuts the MST into k clusters
- Sends results to the frontend as JSON

Frontend:
- Displays the grid with cluster colors
- Displays statistics for each cluster
- Lets the user adjust parameters and recompute
- Shows color chips next to each cluster in the table

## Algorithm Descriptions 

### Union Find (Disjoint Set)
Used to efficiently merge nodes while preventing cycles during MST construction.

Key operations:
``` python
def find(x):
    if parent[x] != x:
        parent[x] = find(parent[x])
    return parent[x]

def union(a, b):
    rootA = find(a)
    rootB = find(b)
    if rootA == rootB:
        return False
    if rank[rootA] < rank[rootB]:
        parent[rootA] = rootB
    else:
        parent[rootB] = rootA
        if rank[rootA] == rank[rootB]:
            rank[rootA] += 1
    return True
```
This ensures near constant-time merging with path compression.


### Edge Weight Function

Each edge weight combines three factors:
```python
weight = elevation_weight * elevation_difference
        + risk_weight * risk_difference
        + distance_weight * distance_between_cells
```
This allows the user to emphasize certain attributes. For example:

- If `elevation_weight` is high, MST prefers linking cells with similar elevation.
- If `risk_weight` is high, MST links similar risk zones.
- If `distance_weight` is high, MST penalizes long spatial connections.

Diagonal edges are included only if the user enables them.


### Kruskal’s MST

The algorithm sorts all edges and picks the smallest edges that do not create cycles.

Simplified pseudocode:
``` python
edges.sort(key=lambda e: e.weight)
mst = []

for edge in edges:
    if union(edge.u, edge.v):
        mst.append(edge)
```
The resulting MST contains (N - 1) edges and connects all grid cells in the best possible way given the weight function.


### Cutting the MST into Clusters

To form k clusters:
1) Compute full MST
2) Sort MST edges by weight
3) Remove the (k - 1) largest edges
4) Remaining connected components become clusters

## Verification of Algorithms with Toy Examples

### Toy Example A: Simple MST (No Weights)
Graph:
```less
A ---1--- B
| \
4   3
|     \
C ---2--- D
```

Edges sorted by weight:

1) *AB = 1*
2) *CD = 2*
3) *AD = 3*
4) *AC = 4*

Constructing MST:
- Pick *AB*
- Pick *CD*
- Pick *AD*
- Skip *AC* because it forms a cycle

MST edges: *AB, CD, AD* <br/>
Total weight = *6*


If we choose k = 2 clusters, remove the largest edge = 3

Clusters are:
- *{A, B} and {C, D}*

This validates the core MST and cluster splitting logic.


### Toy Example B: Weighted MST with Elevation, Risk, Distance

Assume:
| Node | Elevation | Risk |
| ---- | --------- | ---- |
| A    | 10        | 0.2  |
| B    | 11        | 0.3  |
| C    | 30        | 0.9  |
| D    | 31        | 1.0  |

Weights:
- elevation = 1
- risk = 2
- distance = 0 (ignored for simplicity)

Example: Edge A-B
- Elevation diff = 1
- Risk diff = 0.1
- Weight = 1*(1) + 2*(0.1) = 1.2


Edge C-D is similar:

- Elevation diff = 1
- Risk diff = 0.1
- Weight = 1.2

Edge B-C:
- Elevation diff = 19
- Risk diff = 0.6
- Weight = 119 + 20.6 = 20.2


MST result:
- AB = 1.2
- CD = 1.2
Next smallest edge is AC or BC depending on weights.

This confirms that clusters form based on the user’s weight settings.

## Functionalities of the System
The application supports the following functions:

- Displays a *20x20* grid (400 nodes) with synthetic elevation and risk values
- Allows the user to set:
  - number of clusters (k)
  - elevation weight
  - risk weight
  - distance weight
  - diagonal neighbor usage
- Computes MST using Kruskal’s algorithm
- Cuts MST to create clusters
- Displays cluster statistics:
  - cluster ID
  - color
  - node count
  - average elevation
  - average risk
- Updates the grid visualization in real time
- Shows error messages for invalid inputs
- Frontend and backend communicate through REST API


## Execution Results and Analysis

The system was tested with multiple parameter combinations. Key findings include:

- When elevation weight is high, clusters form horizontally or vertically according to elevation gradients.
- When risk weight is high, high-risk pockets separate into their own clusters.
- When distance weight is large, the MST prefers short connections, forming more compact shapes.
- Increasing k produces smaller cluster regions.
- With k = 1, the entire grid becomes one cluster.
- With invalid k values (such as k > 400), the backend returns a clear error message.

The results show that MST-based clustering responds sensitively to weight changes. This makes the tool useful for studying how physical and environmental attributes influence the grouping of geographic regions.

## Conclusions

This project successfully demonstrates how classical algorithms from this course, such as Union-Find, weighted graph construction, and Kruskal’s MST, can be applied meaningfully to a weather-crisis scenario.

Through the web interface, users can experiment with different parameters and observe how clusters shift based on environmental attributes like elevation and flood risk.

The main takeaways are:

- MST-based clustering is intuitive and visually interpretable.
- Weight adjustments allow domain-specific prioritization.
- Real-time visualization helps explain complex algorithmic behavior.
- The project strengthened skills in algorithm design, debugging, frontend development, backend development, and teamwork.

Possible future improvements include use of real GIS data, more advanced distance formulas, or time-series flood forecasting.

## Video Demonstration
Link: 
