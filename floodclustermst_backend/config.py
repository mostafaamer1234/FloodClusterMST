# config.py

# Grid dimensions (number of nodes = GRID_WIDTH * GRID_HEIGHT)
GRID_WIDTH = 20
GRID_HEIGHT = 20

# Synthetic elevation configuration
ELEVATION_MIN = 0.0
ELEVATION_MAX = 100.0

# Synthetic base risk configuration (0 to 1)
RISK_MIN = 0.0
RISK_MAX = 1.0

# Default graph weight parameters
DEFAULT_ELEVATION_WEIGHT = 1.0
DEFAULT_RISK_WEIGHT = 1.0
DEFAULT_DISTANCE_WEIGHT = 0.5

# Whether to use diagonal neighbors in the grid
DEFAULT_USE_DIAGONALS = True

# Default number of clusters
DEFAULT_NUM_CLUSTERS = 5
