/**
 * ================================================
 * F1 Race Replay - API Communication Layer
 * ================================================
 * Handles all HTTP requests to the FastAPI backend.
 * Provides clean async functions for data fetching.
 * 
 * Author: Aryan Raj
 * Created: 2026-01-28
 */

// ============================================
// Configuration
// ============================================

/**
 * Base URL for the API backend.
 * Change this when deploying to production.
 */
const API_BASE_URL = 'http://127.0.0.1:8080';

/**
 * Default request timeout in milliseconds
 */
const REQUEST_TIMEOUT = 60000; // 60 seconds (F1 data can be large)

// ============================================
// API Client Class
// ============================================

class F1ApiClient {
    constructor(baseUrl = API_BASE_URL) {
        this.baseUrl = baseUrl;
        this.isConnected = false;
    }

    /**
     * Make an HTTP request to the API
     * @param {string} endpoint - API endpoint (e.g., '/api/seasons')
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} - JSON response data
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;

        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            ...options,
        };

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        try {
            const response = await fetch(url, {
                ...defaultOptions,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // Check if response is OK
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new ApiError(
                    errorData.message || `HTTP Error: ${response.status}`,
                    response.status,
                    errorData
                );
            }

            // Parse JSON response
            const data = await response.json();
            return data;

        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new ApiError('Request timed out', 408);
            }

            if (error instanceof ApiError) {
                throw error;
            }

            // Network or other errors
            throw new ApiError(
                `Network error: ${error.message}`,
                0,
                { originalError: error }
            );
        }
    }

    // ============================================
    // Health Check
    // ============================================

    /**
     * Check if the API server is running
     * @returns {Promise<boolean>}
     */
    async checkHealth() {
        try {
            const data = await this.request('/health');
            this.isConnected = data.status === 'healthy';
            return this.isConnected;
        } catch (error) {
            this.isConnected = false;
            console.error('API health check failed:', error.message);
            return false;
        }
    }

    // ============================================
    // Season & Race Endpoints
    // ============================================

    /**
     * Get available F1 seasons
     * @returns {Promise<Object>} - { seasons: number[], recommended: number[], note: string }
     */
    async getSeasons() {
        return this.request('/api/seasons');
    }

    /**
     * Get race schedule for a specific season
     * @param {number} season - Year (e.g., 2023)
     * @returns {Promise<Object>} - { season, races: [], total_races }
     */
    async getRaces(season) {
        return this.request(`/api/races/${season}`);
    }

    /**
     * Get event information
     * @param {number} season - Year
     * @param {number} raceRound - Race round number
     * @returns {Promise<Object>} - Event details
     */
    async getEventInfo(season, raceRound) {
        return this.request(`/api/event/${season}/${raceRound}`);
    }

    // ============================================
    // Session Endpoints
    // ============================================

    /**
     * Get session data (results, drivers, info)
     * @param {number} season - Year
     * @param {number} raceRound - Race round number
     * @param {string} sessionType - FP1, FP2, FP3, Q, S, R
     * @returns {Promise<Object>} - Session data
     */
    async getSession(season, raceRound, sessionType) {
        return this.request(`/api/session/${season}/${raceRound}/${sessionType}`);
    }

    // ============================================
    // Lap Data Endpoints
    // ============================================

    /**
     * Get lap data for a session
     * @param {number} season - Year
     * @param {number} raceRound - Race round number
     * @param {string} sessionType - Session type
     * @param {Object} options - Optional filters
     * @param {string} options.driver - Driver code filter
     * @param {boolean} options.fastestOnly - Return only fastest laps
     * @returns {Promise<Object>} - Lap data
     */
    async getLaps(season, raceRound, sessionType, options = {}) {
        const params = new URLSearchParams();

        if (options.driver) {
            params.append('driver', options.driver);
        }
        if (options.fastestOnly) {
            params.append('fastest_only', 'true');
        }

        const queryString = params.toString();
        const endpoint = `/api/laps/${season}/${raceRound}/${sessionType}${queryString ? '?' + queryString : ''}`;

        return this.request(endpoint);
    }

    /**
     * Get fastest laps for a session
     * @param {number} season - Year
     * @param {number} raceRound - Race round
     * @param {string} sessionType - Session type
     * @returns {Promise<Object>} - Fastest laps data
     */
    async getFastestLaps(season, raceRound, sessionType) {
        return this.getLaps(season, raceRound, sessionType, { fastestOnly: true });
    }

    // ============================================
    // Telemetry Endpoints
    // ============================================

    /**
     * Get telemetry data for a driver
     * @param {number} season - Year
     * @param {number} raceRound - Race round
     * @param {string} sessionType - Session type
     * @param {string} driver - Driver code (e.g., 'VER')
     * @param {number|null} lapNumber - Specific lap or null for fastest
     * @returns {Promise<Object>} - Telemetry data
     */
    async getTelemetry(season, raceRound, sessionType, driver, lapNumber = null) {
        let endpoint = `/api/telemetry/${season}/${raceRound}/${sessionType}/${driver}`;

        if (lapNumber !== null) {
            endpoint += `?lap_number=${lapNumber}`;
        }

        return this.request(endpoint);
    }

    // ============================================
    // Track Data Endpoints
    // ============================================

    /**
     * Get track layout coordinates
     * @param {number} season - Year
     * @param {number} raceRound - Race round
     * @param {string} sessionType - Session type (default: 'R')
     * @returns {Promise<Object>} - Track coordinates and bounds
     */
    async getTrack(season, raceRound, sessionType = 'R') {
        return this.request(`/api/track/${season}/${raceRound}?session_type=${sessionType}`);
    }

    // ============================================
    // Driver Endpoints
    // ============================================

    /**
     * Get drivers for a season/race
     * @param {number} season - Year
     * @param {number} raceRound - Race round (default: 1)
     * @returns {Promise<Object>} - Driver list with team info
     */
    async getDrivers(season, raceRound = 1) {
        return this.request(`/api/drivers/${season}?race_round=${raceRound}`);
    }
}

// ============================================
// Custom Error Class
// ============================================

class ApiError extends Error {
    /**
     * Custom API Error
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     * @param {Object} data - Additional error data
     */
    constructor(message, statusCode = 0, data = {}) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.data = data;
        this.timestamp = new Date().toISOString();
    }

    /**
     * Check if error is a network error
     * @returns {boolean}
     */
    isNetworkError() {
        return this.statusCode === 0;
    }

    /**
     * Check if error is a client error (4xx)
     * @returns {boolean}
     */
    isClientError() {
        return this.statusCode >= 400 && this.statusCode < 500;
    }

    /**
     * Check if error is a server error (5xx)
     * @returns {boolean}
     */
    isServerError() {
        return this.statusCode >= 500;
    }

    /**
     * Get user-friendly error message
     * @returns {string}
     */
    getUserMessage() {
        if (this.isNetworkError()) {
            return 'Unable to connect to the server. Please check if the backend is running.';
        }
        if (this.statusCode === 408) {
            return 'Request timed out. The server may be busy loading data.';
        }
        if (this.statusCode === 404) {
            return 'The requested data was not found.';
        }
        if (this.statusCode === 400) {
            return this.message || 'Invalid request parameters.';
        }
        if (this.isServerError()) {
            return 'Server error occurred. Please try again later.';
        }
        return this.message || 'An unexpected error occurred.';
    }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format lap time from string to display format
 * @param {string} lapTime - Lap time string from API
 * @returns {string} - Formatted lap time (e.g., "1:23.456")
 */
function formatLapTime(lapTime) {
    if (!lapTime || lapTime === 'None' || lapTime === 'null') {
        return '--:--.---';
    }

    // If already formatted, return as is
    if (typeof lapTime === 'string' && lapTime.includes(':')) {
        return lapTime;
    }

    // Handle timedelta format (0 days 00:01:23.456000)
    const match = lapTime.match(/(\d+):(\d+):(\d+\.?\d*)/);
    if (match) {
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]) + hours * 60;
        const seconds = parseFloat(match[3]).toFixed(3);
        return `${minutes}:${seconds.padStart(6, '0')}`;
    }

    return lapTime;
}

/**
 * Format sector time
 * @param {string} sectorTime - Sector time string
 * @returns {string} - Formatted sector time
 */
function formatSectorTime(sectorTime) {
    if (!sectorTime || sectorTime === 'None' || sectorTime === 'null') {
        return '--.---';
    }

    // Handle timedelta format
    const match = sectorTime.match(/(\d+):(\d+\.?\d*)/);
    if (match) {
        const seconds = parseFloat(match[2]).toFixed(3);
        return seconds;
    }

    return sectorTime;
}

/**
 * Get team color from team name
 * @param {string} teamName - Team name
 * @returns {string} - CSS color value
 */
function getTeamColor(teamName) {
    const teamColors = {
        'Red Bull Racing': '#3671C6',
        'Red Bull': '#3671C6',
        'Mercedes': '#27F4D2',
        'Ferrari': '#E8002D',
        'McLaren': '#FF8000',
        'Aston Martin': '#229971',
        'Alpine': '#FF87BC',
        'Williams': '#64C4FF',
        'Haas F1 Team': '#B6BABD',
        'Haas': '#B6BABD',
        'Kick Sauber': '#52E252',
        'Alfa Romeo': '#C92D4B',
        'AlphaTauri': '#5E8FAA',
        'RB': '#6692FF',
        'Racing Bulls': '#6692FF',
    };

    // Try to find a match
    for (const [key, color] of Object.entries(teamColors)) {
        if (teamName && teamName.toLowerCase().includes(key.toLowerCase())) {
            return color;
        }
    }

    return '#888888'; // Default gray
}

// ============================================
// Create and Export API Instance
// ============================================

// Create singleton instance
const api = new F1ApiClient();

// Export for use in other modules
// In a non-module environment, these will be global
if (typeof window !== 'undefined') {
    window.F1Api = api;
    window.ApiError = ApiError;
    window.formatLapTime = formatLapTime;
    window.formatSectorTime = formatSectorTime;
    window.getTeamColor = getTeamColor;
}

// For ES6 module environments
// export { F1ApiClient, ApiError, api, formatLapTime, formatSectorTime, getTeamColor };
