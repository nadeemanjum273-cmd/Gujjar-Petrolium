"""
Tests for Health Check Endpoints.
Verifies root and versioned health status, business metadata, and manager identity.
"""

import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_health_endpoint():
    """Test GET /health returns 200 with business identity."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app_name"] == "Gujjar Petrolium Kot Gujjran"
    assert data["app_name_ur"] == "گجر پیٹرولیم، کوٹ گجراں"
    assert data["manager"] == "Muhammad Asad"
    assert data["timezone"] == "Asia/Karachi"
    assert "server_time" in data


def test_api_v1_health_endpoint():
    """Test GET /api/v1/health returns 200 with matching response."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app_name"] == "Gujjar Petrolium Kot Gujjran"
    assert data["manager"] == "Muhammad Asad"
