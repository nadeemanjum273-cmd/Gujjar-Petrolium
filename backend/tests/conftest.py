"""
Pytest configuration for Gujjar Petrolium Kot Gujjran backend tests.
Ensures automated unit & integration tests run safely in isolated mock mode,
preventing any unintended writes or modifications to the live production Google Spreadsheet.
"""

import pytest
from app.core.config import settings
from app.services.sheets import sheets_service, MockSpreadsheet


@pytest.fixture(autouse=True, scope="session")
def enforce_test_mock_mode():
    """Globally enforces Mock mode during test execution."""
    original_use_mock = settings.GOOGLE_SHEETS_USE_MOCK
    settings.GOOGLE_SHEETS_USE_MOCK = True
    sheets_service._is_mock = True
    sheets_service._spreadsheet = MockSpreadsheet()
    yield
    settings.GOOGLE_SHEETS_USE_MOCK = original_use_mock
    sheets_service._init_connection()


@pytest.fixture(autouse=True)
def reset_mock_each_test():
    """Resets mock data between individual test functions."""
    sheets_service._is_mock = True
    sheets_service.reset_mock()
    yield
    sheets_service.reset_mock()
