"""
F1 Data Service
================
Service layer for fetching and processing Formula 1 data
using the FastF1 library.

This service handles:
- Season and race schedule data
- Session loading (Practice, Qualifying, Race)
- Lap-by-lap timing data
- High-frequency telemetry data
- Track/circuit coordinates for visualization

Author: Aryan Raj
Created: 2026-01-28
"""

import fastf1
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Optional, Dict, List, Any, Tuple
import logging
import os
from pathlib import Path

# Configure logging
logger = logging.getLogger(__name__)

# ============================================
# Cache Configuration
# ============================================

# Set up cache directory for FastF1
# This stores downloaded data locally to avoid repeated API calls
CACHE_DIR = Path(__file__).parent.parent.parent / "cache" / "fastf1"

def initialize_cache():
    """
    Initialize FastF1 cache directory.
    
    FastF1 downloads a lot of data from the F1 API.
    Caching prevents redundant downloads and speeds up
    subsequent data requests significantly.
    """
    try:
        # Create cache directory if it doesn't exist
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        
        # Enable FastF1 cache
        fastf1.Cache.enable_cache(str(CACHE_DIR))
        logger.info(f"FastF1 cache initialized at: {CACHE_DIR}")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize FastF1 cache: {e}")
        return False


# Initialize cache on module load
initialize_cache()


# ============================================
# Season & Race Schedule Functions
# ============================================

def get_available_seasons() -> Dict[str, Any]:
    """
    Get list of available F1 seasons.
    
    FastF1 supports data from 2018 onwards with full telemetry.
    Earlier years may have limited data availability.
    
    Returns:
        dict: Available seasons with metadata
    """
    current_year = datetime.now().year
    
    # FastF1 has reliable data from 2018 onwards
    seasons = list(range(2018, current_year + 1))
    
    return {
        "seasons": seasons,
        "total": len(seasons),
        "recommended": seasons[-3:],  # Last 3 seasons
        "note": "Full telemetry available from 2018 onwards"
    }


def get_race_schedule(season: int) -> Dict[str, Any]:
    """
    Get the race schedule for a specific season.
    
    Args:
        season: The F1 season year (e.g., 2023)
    
    Returns:
        dict: Race schedule with event details
    """
    try:
        # Get the event schedule for the season
        schedule = fastf1.get_event_schedule(season)
        
        # Convert to list of race dictionaries
        races = []
        for idx, event in schedule.iterrows():
            # Skip testing events
            if "Testing" in str(event.get("EventName", "")):
                continue
                
            race_info = {
                "round": int(event.get("RoundNumber", idx + 1)),
                "name": str(event.get("EventName", "Unknown")),
                "country": str(event.get("Country", "Unknown")),
                "location": str(event.get("Location", "Unknown")),
                "date": str(event.get("EventDate", "")),
                "event_format": str(event.get("EventFormat", "conventional")),
            }
            races.append(race_info)
        
        return {
            "season": season,
            "races": races,
            "total_races": len(races),
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Error fetching race schedule for {season}: {e}")
        return {
            "season": season,
            "races": [],
            "total_races": 0,
            "status": "error",
            "error_message": str(e)
        }


def get_event_info(season: int, race_round: int) -> Dict[str, Any]:
    """
    Get detailed information about a specific race event.
    
    Args:
        season: The F1 season year
        race_round: The race round number
    
    Returns:
        dict: Detailed event information
    """
    try:
        event = fastf1.get_event(season, race_round)
        
        return {
            "season": season,
            "round": race_round,
            "name": str(event.EventName),
            "country": str(event.Country),
            "location": str(event.Location),
            "date": str(event.EventDate),
            "event_format": str(event.EventFormat),
            "sessions": {
                "fp1": str(event.Session1Date) if hasattr(event, 'Session1Date') else None,
                "fp2": str(event.Session2Date) if hasattr(event, 'Session2Date') else None,
                "fp3": str(event.Session3Date) if hasattr(event, 'Session3Date') else None,
                "qualifying": str(event.Session4Date) if hasattr(event, 'Session4Date') else None,
                "race": str(event.Session5Date) if hasattr(event, 'Session5Date') else None,
            },
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Error fetching event info for {season} round {race_round}: {e}")
        return {
            "season": season,
            "round": race_round,
            "status": "error",
            "error_message": str(e)
        }


# ============================================
# Session Loading Functions
# ============================================

def load_session(
    season: int, 
    race_round: int, 
    session_type: str,
    load_laps: bool = True,
    load_telemetry: bool = False
) -> Tuple[Optional[Any], Optional[str]]:
    """
    Load a specific session from FastF1.
    
    This is the core function that loads session data.
    Loading telemetry takes longer but provides detailed car data.
    
    Args:
        season: The F1 season year
        race_round: Race round number
        session_type: Session identifier (FP1, FP2, FP3, Q, S, R)
        load_laps: Whether to load lap data
        load_telemetry: Whether to load telemetry (slower)
    
    Returns:
        Tuple of (session object, error message if any)
    """
    try:
        # Get the session
        session = fastf1.get_session(season, race_round, session_type)
        
        # Load the session data
        session.load(
            laps=load_laps,
            telemetry=load_telemetry,
            weather=True,
            messages=False
        )
        
        logger.info(f"Loaded session: {season} R{race_round} {session_type}")
        return session, None
        
    except Exception as e:
        error_msg = f"Error loading session {season} R{race_round} {session_type}: {e}"
        logger.error(error_msg)
        return None, str(e)


def get_session_info(session) -> Dict[str, Any]:
    """
    Extract basic session information.
    
    Args:
        session: Loaded FastF1 session object
    
    Returns:
        dict: Session metadata
    """
    return {
        "name": str(session.name),
        "event": str(session.event.EventName),
        "date": str(session.date),
        "total_laps": int(session.total_laps) if hasattr(session, 'total_laps') else 0,
    }


def get_session_results(session) -> List[Dict[str, Any]]:
    """
    Get session results (final standings).
    
    Args:
        session: Loaded FastF1 session object
    
    Returns:
        list: Driver results with positions and times
    """
    try:
        results = session.results
        
        if results is None or results.empty:
            return []
        
        result_list = []
        for idx, driver in results.iterrows():
            result_list.append({
                "position": int(driver.get("Position", 0)) if pd.notna(driver.get("Position")) else None,
                "driver_number": str(driver.get("DriverNumber", "")),
                "driver_code": str(driver.get("Abbreviation", "")),
                "driver_name": f"{driver.get('FirstName', '')} {driver.get('LastName', '')}".strip(),
                "team": str(driver.get("TeamName", "")),
                "team_color": f"#{driver.get('TeamColor', '000000')}",
                "time": str(driver.get("Time", "")) if pd.notna(driver.get("Time")) else None,
                "status": str(driver.get("Status", "")) if pd.notna(driver.get("Status")) else None,
                "points": float(driver.get("Points", 0)) if pd.notna(driver.get("Points")) else 0,
            })
        
        return result_list
        
    except Exception as e:
        logger.error(f"Error getting session results: {e}")
        return []


# ============================================
# Lap Data Functions
# ============================================

def get_all_laps(session, driver_code: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Get all lap data for a session, optionally filtered by driver.
    
    Args:
        session: Loaded FastF1 session object
        driver_code: Optional driver abbreviation (e.g., 'VER', 'HAM')
    
    Returns:
        list: Lap data for each lap
    """
    try:
        laps = session.laps
        
        if laps is None or laps.empty:
            return []
        
        # Filter by driver if specified
        if driver_code:
            laps = laps.pick_driver(driver_code.upper())
        
        lap_list = []
        for idx, lap in laps.iterrows():
            lap_data = {
                "lap_number": int(lap.get("LapNumber", 0)),
                "driver": str(lap.get("Driver", "")),
                "team": str(lap.get("Team", "")),
                "lap_time": str(lap.get("LapTime", "")) if pd.notna(lap.get("LapTime")) else None,
                "lap_time_seconds": lap.get("LapTime").total_seconds() if pd.notna(lap.get("LapTime")) else None,
                "sector1": str(lap.get("Sector1Time", "")) if pd.notna(lap.get("Sector1Time")) else None,
                "sector2": str(lap.get("Sector2Time", "")) if pd.notna(lap.get("Sector2Time")) else None,
                "sector3": str(lap.get("Sector3Time", "")) if pd.notna(lap.get("Sector3Time")) else None,
                "compound": str(lap.get("Compound", "")),
                "tyre_life": int(lap.get("TyreLife", 0)) if pd.notna(lap.get("TyreLife")) else 0,
                "is_personal_best": bool(lap.get("IsPersonalBest", False)),
                "position": int(lap.get("Position", 0)) if pd.notna(lap.get("Position")) else None,
                "pit_out_time": str(lap.get("PitOutTime", "")) if pd.notna(lap.get("PitOutTime")) else None,
                "pit_in_time": str(lap.get("PitInTime", "")) if pd.notna(lap.get("PitInTime")) else None,
            }
            lap_list.append(lap_data)
        
        return lap_list
        
    except Exception as e:
        logger.error(f"Error getting lap data: {e}")
        return []


def get_fastest_laps(session, top_n: int = 10) -> List[Dict[str, Any]]:
    """
    Get the fastest laps of the session.
    
    Args:
        session: Loaded FastF1 session object
        top_n: Number of top laps to return
    
    Returns:
        list: Fastest laps sorted by time
    """
    try:
        laps = session.laps.pick_quicklaps()
        
        if laps is None or laps.empty:
            return []
        
        # Sort by lap time and get top N
        laps = laps.sort_values("LapTime").head(top_n)
        
        fastest = []
        for rank, (idx, lap) in enumerate(laps.iterrows(), 1):
            fastest.append({
                "rank": rank,
                "driver": str(lap.get("Driver", "")),
                "team": str(lap.get("Team", "")),
                "lap_number": int(lap.get("LapNumber", 0)),
                "lap_time": str(lap.get("LapTime", "")),
                "sector1": str(lap.get("Sector1Time", "")) if pd.notna(lap.get("Sector1Time")) else None,
                "sector2": str(lap.get("Sector2Time", "")) if pd.notna(lap.get("Sector2Time")) else None,
                "sector3": str(lap.get("Sector3Time", "")) if pd.notna(lap.get("Sector3Time")) else None,
                "compound": str(lap.get("Compound", "")),
            })
        
        return fastest
        
    except Exception as e:
        logger.error(f"Error getting fastest laps: {e}")
        return []


# ============================================
# Telemetry Functions
# ============================================

def get_lap_telemetry(
    session, 
    driver_code: str, 
    lap_number: Optional[int] = None
) -> Dict[str, Any]:
    """
    Get detailed telemetry data for a driver's lap.
    
    Telemetry includes high-frequency data (~240Hz) for:
    - Speed (km/h)
    - Throttle (0-100%)
    - Brake (0-100%)
    - RPM
    - Gear (1-8)
    - DRS (0/1)
    - X, Y coordinates
    
    Args:
        session: Loaded FastF1 session object (with telemetry=True)
        driver_code: Driver abbreviation (e.g., 'VER')
        lap_number: Specific lap number, or None for fastest lap
    
    Returns:
        dict: Telemetry data arrays
    """
    try:
        driver_laps = session.laps.pick_driver(driver_code.upper())
        
        if driver_laps.empty:
            return {"error": f"No laps found for driver {driver_code}"}
        
        # Get specific lap or fastest lap
        if lap_number:
            lap = driver_laps[driver_laps["LapNumber"] == lap_number]
            if lap.empty:
                return {"error": f"Lap {lap_number} not found for {driver_code}"}
            lap = lap.iloc[0]
        else:
            lap = driver_laps.pick_fastest()
        
        # Get telemetry for this lap
        telemetry = lap.get_telemetry()
        
        if telemetry is None or telemetry.empty:
            return {"error": "No telemetry data available for this lap"}
        
        # Convert telemetry to lists for JSON serialization
        # Sample every Nth point to reduce data size
        sample_rate = max(1, len(telemetry) // 500)  # Max ~500 points
        
        return {
            "driver": driver_code.upper(),
            "lap_number": int(lap.get("LapNumber", 0)),
            "lap_time": str(lap.get("LapTime", "")),
            "data_points": len(telemetry),
            "sampled_points": len(telemetry[::sample_rate]),
            "telemetry": {
                "distance": telemetry["Distance"].tolist()[::sample_rate],
                "speed": telemetry["Speed"].tolist()[::sample_rate],
                "throttle": telemetry["Throttle"].tolist()[::sample_rate],
                "brake": telemetry["Brake"].tolist()[::sample_rate],
                "rpm": telemetry["RPM"].tolist()[::sample_rate] if "RPM" in telemetry.columns else [],
                "gear": telemetry["nGear"].tolist()[::sample_rate] if "nGear" in telemetry.columns else [],
                "drs": telemetry["DRS"].tolist()[::sample_rate] if "DRS" in telemetry.columns else [],
                "x": telemetry["X"].tolist()[::sample_rate] if "X" in telemetry.columns else [],
                "y": telemetry["Y"].tolist()[::sample_rate] if "Y" in telemetry.columns else [],
            },
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Error getting telemetry for {driver_code}: {e}")
        return {"error": str(e), "status": "error"}


# ============================================
# Track Data Functions
# ============================================

def get_track_coordinates(session) -> Dict[str, Any]:
    """
    Get track layout coordinates for visualization.
    
    Uses telemetry data from the fastest lap to extract
    the track outline coordinates.
    
    Args:
        session: Loaded FastF1 session object (with telemetry=True)
    
    Returns:
        dict: Track coordinates and metadata
    """
    try:
        # Get the fastest lap to extract track coordinates
        fastest_lap = session.laps.pick_fastest()
        
        if fastest_lap is None:
            return {"error": "No lap data available"}
        
        # Get telemetry for track coordinates
        telemetry = fastest_lap.get_telemetry()
        
        if telemetry is None or telemetry.empty:
            return {"error": "No telemetry data available"}
        
        # Check if X, Y coordinates are available
        if "X" not in telemetry.columns or "Y" not in telemetry.columns:
            return {"error": "Position data not available in telemetry"}
        
        # Sample coordinates to reduce data size
        sample_rate = max(1, len(telemetry) // 300)  # ~300 points for smooth track
        
        x_coords = telemetry["X"].tolist()[::sample_rate]
        y_coords = telemetry["Y"].tolist()[::sample_rate]
        
        # Calculate track bounds
        x_min, x_max = min(x_coords), max(x_coords)
        y_min, y_max = min(y_coords), max(y_coords)
        
        return {
            "event": str(session.event.EventName),
            "circuit": str(session.event.Location),
            "coordinates": {
                "x": x_coords,
                "y": y_coords,
            },
            "bounds": {
                "x_min": x_min,
                "x_max": x_max,
                "y_min": y_min,
                "y_max": y_max,
                "width": x_max - x_min,
                "height": y_max - y_min,
            },
            "total_points": len(x_coords),
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Error getting track coordinates: {e}")
        return {"error": str(e), "status": "error"}


# ============================================
# Driver Position Functions (for Race Replay)
# ============================================

def get_driver_positions_over_time(session) -> Dict[str, Any]:
    """
    Get driver positions throughout the race/session.
    
    This is essential for the race replay feature - shows
    where each car was at each point in time.
    
    Args:
        session: Loaded FastF1 session object
    
    Returns:
        dict: Position data for each driver over time
    """
    try:
        laps = session.laps
        
        if laps is None or laps.empty:
            return {"error": "No lap data available"}
        
        # Get unique drivers
        drivers = laps["Driver"].unique().tolist()
        
        # Build position history for each driver
        position_data = {}
        
        for driver in drivers:
            driver_laps = laps.pick_driver(driver)
            positions = []
            
            for idx, lap in driver_laps.iterrows():
                positions.append({
                    "lap": int(lap.get("LapNumber", 0)),
                    "position": int(lap.get("Position", 0)) if pd.notna(lap.get("Position")) else None,
                    "lap_time": str(lap.get("LapTime", "")) if pd.notna(lap.get("LapTime")) else None,
                })
            
            position_data[driver] = {
                "positions": positions,
                "total_laps": len(positions),
            }
        
        return {
            "drivers": drivers,
            "total_drivers": len(drivers),
            "position_data": position_data,
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Error getting position data: {e}")
        return {"error": str(e), "status": "error"}


# ============================================
# Utility Functions
# ============================================

def get_driver_info(session) -> List[Dict[str, Any]]:
    """
    Get information about all drivers in a session.
    
    Args:
        session: Loaded FastF1 session object
    
    Returns:
        list: Driver details including number, name, team, colors
    """
    try:
        results = session.results
        
        if results is None or results.empty:
            # Try to get from laps
            laps = session.laps
            if laps is None or laps.empty:
                return []
            
            drivers = laps["Driver"].unique()
            return [{"driver_code": str(d)} for d in drivers]
        
        driver_list = []
        for idx, driver in results.iterrows():
            driver_list.append({
                "driver_number": str(driver.get("DriverNumber", "")),
                "driver_code": str(driver.get("Abbreviation", "")),
                "first_name": str(driver.get("FirstName", "")),
                "last_name": str(driver.get("LastName", "")),
                "full_name": f"{driver.get('FirstName', '')} {driver.get('LastName', '')}".strip(),
                "team": str(driver.get("TeamName", "")),
                "team_color": f"#{driver.get('TeamColor', '000000')}",
                "country_code": str(driver.get("CountryCode", "")) if pd.notna(driver.get("CountryCode")) else "",
            })
        
        return driver_list
        
    except Exception as e:
        logger.error(f"Error getting driver info: {e}")
        return []


def format_lap_time(timedelta) -> str:
    """
    Format a timedelta lap time to string format (M:SS.mmm).
    
    Args:
        timedelta: pandas Timedelta object
    
    Returns:
        str: Formatted lap time string
    """
    if pd.isna(timedelta):
        return ""
    
    total_seconds = timedelta.total_seconds()
    minutes = int(total_seconds // 60)
    seconds = total_seconds % 60
    
    return f"{minutes}:{seconds:06.3f}"
