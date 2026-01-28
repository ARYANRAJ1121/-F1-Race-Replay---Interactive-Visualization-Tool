"""
F1 Race Replay - Backend API Server
====================================
A FastAPI-based backend that provides F1 race data, telemetry,
and session information using the FastF1 library.

Author: Aryan Raj
Created: 2026-01-28
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional, List
from datetime import datetime
import logging

# Configure logging for debugging and monitoring
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# ============================================
# FastAPI Application Initialization
# ============================================

app = FastAPI(
    title="F1 Race Replay API",
    description="""
    🏎️ **F1 Race Replay API** - Interactive Formula 1 Visualization Backend
    
    This API provides access to:
    - Historical F1 race data
    - Real-time telemetry information
    - Driver lap times and positions
    - Circuit/track data
    - Session information (Practice, Qualifying, Race)
    
    Built with FastF1 library for accurate F1 data.
    """,
    version="1.0.0",
    contact={
        "name": "Aryan Raj",
        "url": "https://github.com/ARYANRAJ1121",
    },
    license_info={
        "name": "MIT License",
    }
)

# ============================================
# CORS Middleware Configuration
# ============================================
# This allows the frontend (running on different port) to 
# communicate with our backend API

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",      # React/Next.js default
        "http://localhost:5500",      # Live Server default
        "http://localhost:8080",      # Alternative dev server
        "http://127.0.0.1:5500",      # Live Server IP
        "http://127.0.0.1:3000",      # React IP
        "*"                           # Allow all for development
    ],
    allow_credentials=True,
    allow_methods=["*"],              # Allow all HTTP methods
    allow_headers=["*"],              # Allow all headers
)

# ============================================
# Application Startup & Shutdown Events
# ============================================

@app.on_event("startup")
async def startup_event():
    """
    Runs when the application starts.
    - Initialize FastF1 cache
    - Pre-load commonly used data
    - Set up any required resources
    """
    logger.info("🏎️ F1 Race Replay API Starting...")
    logger.info("📦 Initializing FastF1 cache...")
    
    # FastF1 cache will be initialized in the service layer
    # This keeps the main.py clean and focused on routing
    
    logger.info("✅ API Server Ready!")


@app.on_event("shutdown")
async def shutdown_event():
    """
    Runs when the application shuts down.
    - Clean up resources
    - Close connections
    """
    logger.info("🛑 F1 Race Replay API Shutting Down...")


# ============================================
# Health Check & Root Endpoints
# ============================================

@app.get("/", tags=["Health"])
async def root():
    """
    Root endpoint - API health check and welcome message.
    
    Returns:
        dict: Welcome message and API status
    """
    return {
        "status": "healthy",
        "message": "🏎️ Welcome to F1 Race Replay API!",
        "version": "1.0.0",
        "documentation": "/docs",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """
    Detailed health check endpoint for monitoring.
    
    Returns:
        dict: Detailed health status of all components
    """
    return {
        "status": "healthy",
        "components": {
            "api": "operational",
            "fastf1": "operational",
            "cache": "operational"
        },
        "uptime": "available",
        "timestamp": datetime.now().isoformat()
    }


# ============================================
# Season & Race Endpoints
# ============================================

@app.get("/api/seasons", tags=["Seasons"])
async def get_available_seasons():
    """
    Get list of available F1 seasons.
    
    FastF1 supports data from 2018 onwards with full telemetry.
    Earlier seasons may have limited data.
    
    Returns:
        dict: List of available seasons with metadata
    """
    # FastF1 has reliable data from 2018 onwards
    current_year = datetime.now().year
    seasons = list(range(2018, current_year + 1))
    
    return {
        "seasons": seasons,
        "recommended": seasons[-3:],  # Last 3 seasons recommended
        "note": "Full telemetry available from 2018 onwards"
    }


@app.get("/api/races/{season}", tags=["Races"])
async def get_races_in_season(
    season: int,
    include_completed: bool = Query(True, description="Include only completed races")
):
    """
    Get all races in a specific F1 season.
    
    Args:
        season: The F1 season year (e.g., 2023)
        include_completed: Whether to filter only completed races
    
    Returns:
        dict: List of races with their details
    """
    # Validate season range
    current_year = datetime.now().year
    if season < 2018 or season > current_year:
        raise HTTPException(
            status_code=400,
            detail=f"Season must be between 2018 and {current_year}"
        )
    
    # This will be replaced with actual FastF1 data in the service layer
    # For now, returning a placeholder structure
    return {
        "season": season,
        "message": "Race schedule will be loaded from FastF1 service",
        "races": [],  # Will be populated by f1_data_service
        "total_races": 0
    }


# ============================================
# Session Endpoints
# ============================================

@app.get("/api/session/{season}/{race_round}/{session_type}", tags=["Sessions"])
async def get_session_data(
    season: int,
    race_round: int,
    session_type: str = Query(
        ...,
        description="Session type: FP1, FP2, FP3, Q, S, R",
        regex="^(FP1|FP2|FP3|Q|S|R)$"
    )
):
    """
    Get detailed session data.
    
    Args:
        season: The F1 season year
        race_round: Race round number in the season
        session_type: Type of session
            - FP1, FP2, FP3: Free Practice sessions
            - Q: Qualifying
            - S: Sprint
            - R: Race
    
    Returns:
        dict: Session data including drivers, laps, and results
    """
    return {
        "season": season,
        "round": race_round,
        "session_type": session_type,
        "message": "Session data will be loaded from FastF1 service",
        "data": None  # Will be populated by f1_data_service
    }


# ============================================
# Lap Data Endpoints
# ============================================

@app.get("/api/laps/{season}/{race_round}/{session_type}", tags=["Lap Data"])
async def get_lap_data(
    season: int,
    race_round: int,
    session_type: str,
    driver: Optional[str] = Query(None, description="Driver code (e.g., VER, HAM)")
):
    """
    Get lap-by-lap data for a session.
    
    Args:
        season: The F1 season year
        race_round: Race round number
        session_type: Session type (FP1, FP2, FP3, Q, S, R)
        driver: Optional driver code to filter laps
    
    Returns:
        dict: Lap times, sectors, and positions for each lap
    """
    return {
        "season": season,
        "round": race_round,
        "session_type": session_type,
        "driver_filter": driver,
        "message": "Lap data will be loaded from FastF1 service",
        "laps": []  # Will be populated by f1_data_service
    }


# ============================================
# Telemetry Endpoints
# ============================================

@app.get("/api/telemetry/{season}/{race_round}/{session_type}/{driver}", tags=["Telemetry"])
async def get_driver_telemetry(
    season: int,
    race_round: int,
    session_type: str,
    driver: str,
    lap_number: Optional[int] = Query(None, description="Specific lap number")
):
    """
    Get detailed telemetry data for a driver.
    
    Telemetry includes:
    - Speed (km/h)
    - Throttle position (%)
    - Brake pressure (%)
    - RPM
    - Gear
    - DRS status
    - GPS coordinates
    
    Args:
        season: The F1 season year
        race_round: Race round number
        session_type: Session type
        driver: Driver code (e.g., VER, HAM, LEC)
        lap_number: Optional specific lap number
    
    Returns:
        dict: High-frequency telemetry data
    """
    return {
        "season": season,
        "round": race_round,
        "session_type": session_type,
        "driver": driver.upper(),
        "lap_number": lap_number,
        "message": "Telemetry data will be loaded from FastF1 service",
        "telemetry": []  # Will be populated by f1_data_service
    }


# ============================================
# Track/Circuit Endpoints
# ============================================

@app.get("/api/track/{season}/{race_round}", tags=["Track"])
async def get_track_data(
    season: int,
    race_round: int
):
    """
    Get track/circuit data including layout coordinates.
    
    This data is used to render the track visualization
    on the frontend canvas.
    
    Args:
        season: The F1 season year
        race_round: Race round number
    
    Returns:
        dict: Track layout, corner positions, sector markers
    """
    return {
        "season": season,
        "round": race_round,
        "message": "Track data will be loaded from FastF1 service",
        "track": {
            "name": "",
            "country": "",
            "coordinates": [],  # Track outline coordinates
            "corners": [],      # Corner positions
            "sectors": []       # Sector boundaries
        }
    }


# ============================================
# Driver & Team Endpoints
# ============================================

@app.get("/api/drivers/{season}", tags=["Drivers"])
async def get_season_drivers(season: int):
    """
    Get all drivers participating in a season.
    
    Args:
        season: The F1 season year
    
    Returns:
        dict: List of drivers with their teams and numbers
    """
    return {
        "season": season,
        "message": "Driver data will be loaded from FastF1 service",
        "drivers": []  # Will be populated by f1_data_service
    }


# ============================================
# Error Handlers
# ============================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler with consistent format."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "status_code": exc.status_code,
            "message": exc.detail,
            "timestamp": datetime.now().isoformat()
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle unexpected errors gracefully."""
    logger.error(f"Unexpected error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "status_code": 500,
            "message": "An unexpected error occurred",
            "timestamp": datetime.now().isoformat()
        }
    )


# ============================================
# Run Server (for direct execution)
# ============================================

if __name__ == "__main__":
    import uvicorn
    
    # Run the server with hot-reload for development
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
