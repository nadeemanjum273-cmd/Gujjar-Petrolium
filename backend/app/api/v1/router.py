"""
Central API v1 Router for Gujjar Petrolium Kot Gujjran.
"""

from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    auth,
    customers,
    transactions,
    receipts,
    reminders,
    scheduler,
    settings,
    audit,
    reports,
    webhook,
)

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(customers.router)
api_router.include_router(transactions.router)
api_router.include_router(receipts.router)
api_router.include_router(reminders.router)
api_router.include_router(scheduler.router)
api_router.include_router(settings.router)
api_router.include_router(audit.router)
api_router.include_router(reports.router)
api_router.include_router(webhook.router)
