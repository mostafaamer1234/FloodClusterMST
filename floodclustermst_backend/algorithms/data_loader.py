
from typing import List, Dict
from config import (
    GRID_WIDTH,
    GRID_HEIGHT,
    ELEVATION_MIN,
    ELEVATION_MAX,
    RISK_MIN,
    RISK_MAX,
)
import math
import random


def generate_grid_nodes(seed: int = 42) -> List[Dict]:
    """
    Generate a rectangular grid of nodes with synthetic elevation and flood risk.

    Each node:
    - id: integer
    - x, y: grid coordinates
    - elevation: float
    - risk_score: float between 0 and 1
    """
    random.seed(seed)
    nodes = []
    node_id = 0

    for y in range(GRID_HEIGHT):
        for x in range(GRID_WIDTH):
            dx = (x / (GRID_WIDTH - 1))
            dy = (y / (GRID_HEIGHT - 1))
            elevation = ELEVATION_MAX * (1.0 - 0.5 * dx - 0.5 * dy)

            base_risk = 1.0 - (elevation - ELEVATION_MIN) / (ELEVATION_MAX - ELEVATION_MIN)
            noise = random.uniform(-0.1, 0.1)
            risk_score = max(
                RISK_MIN,
                min(RISK_MAX, base_risk + noise)
            )

            nodes.append(
                {
                    "id": node_id,
                    "x": x,
                    "y": y,
                    "elevation": elevation,
                    "risk_score": risk_score,
                }
            )
            node_id += 1

    return nodes
