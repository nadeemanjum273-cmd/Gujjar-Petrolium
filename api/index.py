"""
Vercel Serverless Function entrypoint for FastAPI backend.
Bridges Vercel Python runtime with Gujjar Petrolium Kot Gujjran backend.
"""

import sys
import os

# Insert backend directory into Python path so imports like `from app.main import app` succeed
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app
