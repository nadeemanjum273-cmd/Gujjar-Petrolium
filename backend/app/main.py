"""
FastAPI Backend Application Entrypoint
Gujjar Petrolium Kot Gujjran — Khata & Recovery Automation MVP
"""

from datetime import datetime
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.logging import setup_logging
from app.core.constants import DEFAULT_BUSINESS_NAME_UR
from app.schemas.common import HealthResponse, ErrorResponse, ErrorDetail
from app.api.v1.router import api_router
from contextlib import asynccontextmanager

# Setup structured logger
logger = setup_logging(debug=settings.DEBUG)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        f"Starting {settings.BUSINESS_NAME} ({DEFAULT_BUSINESS_NAME_UR}) Backend in {settings.APP_ENV} mode."
    )
    logger.info(f"Authoritative Manager: {settings.MANAGER_NAME} | Timezone: {settings.TIMEZONE}")
    yield
    logger.info(f"Shutting down {settings.BUSINESS_NAME} Backend.")


# Initialize FastAPI application
app = FastAPI(
    title=settings.BUSINESS_NAME,
    description="Khata & Recovery Automation Backend for Gujjar Petrolium Kot Gujjran (کوٹ گجراں، پنجاب)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------------------
# Consistent Error Handlers
# ------------------------------------------------------------------------------
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.warning(f"HTTP {exc.status_code} on {request.url.path}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            success=False,
            error=ErrorDetail(
                code=f"HTTP_{exc.status_code}",
                message=str(exc.detail),
                message_ur="درخواست پر عملدرآمد کے دوران خرابی پیش آئی ہے۔",
            ),
        ).model_dump(),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first_error = errors[0] if errors else {}
    field_loc = " -> ".join(str(loc) for loc in first_error.get("loc", []))
    msg = first_error.get("msg", "Validation error")

    logger.warning(f"Validation error on {request.url.path}: {field_loc} - {msg}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorResponse(
            success=False,
            error=ErrorDetail(
                code="VALIDATION_ERROR",
                message=f"{field_loc}: {msg}",
                message_ur="درج کردہ ڈیٹا درست نہیں ہے۔ برائے مہربانی دوبارہ چیک کریں۔",
                field=field_loc,
            ),
        ).model_dump(),
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            success=False,
            error=ErrorDetail(
                code="INTERNAL_SERVER_ERROR",
                message="An unexpected server error occurred.",
                message_ur="سرور میں غیر متوقع خرابی پیش آئی ہے۔",
            ),
        ).model_dump(),
    )


# ------------------------------------------------------------------------------
# Direct Root Health Endpoint
# ------------------------------------------------------------------------------
@app.get("/health", response_model=HealthResponse, tags=["Health"])
def root_health():
    """Root health check for load balancers and container probes."""
    return HealthResponse(
        status="ok",
        app_name=settings.BUSINESS_NAME,
        app_name_ur=settings.BUSINESS_NAME_UR,
        version="1.0.0",
        environment=settings.APP_ENV,
        server_time=datetime.utcnow(),
        timezone=settings.TIMEZONE,
        manager=settings.MANAGER_NAME,
    )


# ------------------------------------------------------------------------------
# API v1 Router Mount
# ------------------------------------------------------------------------------
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


