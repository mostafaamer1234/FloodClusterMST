"""Vercel entry point: serve the Flask backend as a Python function under /api/*."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "floodclustermst_backend"))

from app import app  # noqa: E402,F401  (Vercel looks for a WSGI `app`)
