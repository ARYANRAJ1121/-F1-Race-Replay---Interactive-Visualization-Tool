/**
 * ================================================
 * F1 Race Replay - Main Application
 * ================================================
 * Main application logic and initialization.
 * 
 * Author: Aryan Raj
 * Created: 2026-01-29
 */

// ============================================
// Application State
// ============================================

const AppState = {
    // Selected values
    season: null,
    raceRound: null,
    sessionType: 'R',

    // Loaded data
    races: [],
    drivers: [],
    sessionData: null,

    // Playback state
    isPlaying: false,
    currentLap: 0,
    totalLaps: 0,

    // Instances
    trackRenderer: null,
    telemetryManager: null,

    // API instance
    api: null
};

// ============================================
// Initialization
// ============================================

/**
 * Initialize the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🏎️ F1 Race Replay - Initializing...');

    // Initialize API client
    AppState.api = window.F1Api;

    // Initialize components
    initializeTrackRenderer();
    initializeTelemetryManager();

    // Setup event listeners
    setupEventListeners();

    // Check API connection
    await checkApiConnection();

    // Load initial data
    await loadSeasons();

    // Restore last session from storage
    restoreLastSession();

    console.log('✅ F1 Race Replay - Ready!');
});

/**
 * Initialize track renderer
 */
function initializeTrackRenderer() {
    AppState.trackRenderer = new TrackRenderer('trackCanvas');

    // Listen for car selection events
    const canvas = $('trackCanvas');
    if (canvas) {
        canvas.addEventListener('carSelected', (e) => {
            const driver = e.detail.driver;
            if (driver) {
                AppState.telemetryManager.setSelectedDriver(driver);
                loadDriverTelemetry(driver);
            }
        });
    }
}

/**
 * Initialize telemetry manager
 */
function initializeTelemetryManager() {
    AppState.telemetryManager = new TelemetryManager();
}

/**
 * Check API connection
 */
async function checkApiConnection() {
    updateStatus('Connecting...', 'loading');

    try {
        const isHealthy = await AppState.api.checkHealth();

        if (isHealthy) {
            updateStatus('Connected', 'ready');
            showSuccess('Connected to F1 API');
        } else {
            throw new Error('API not healthy');
        }
    } catch (error) {
        updateStatus('Disconnected', 'error');
        showError('Cannot connect to API. Make sure the backend server is running on port 8080.');
        console.error('API connection error:', error);
    }
}

/**
 * Restore last session from local storage
 */
function restoreLastSession() {
    const lastSession = loadFromStorage('lastSession');

    if (lastSession) {
        AppState.season = lastSession.season;
        AppState.raceRound = lastSession.raceRound;
        AppState.sessionType = lastSession.sessionType;

        // Update UI
        const seasonSelect = $('seasonSelect');
        if (seasonSelect && lastSession.season) {
            seasonSelect.value = lastSession.season;
            loadRaces(lastSession.season);
        }
    }
}

/**
 * Save current session to local storage
 */
function saveCurrentSession() {
    saveToStorage('lastSession', {
        season: AppState.season,
        raceRound: AppState.raceRound,
        sessionType: AppState.sessionType
    });
}

// ============================================
// Event Listeners
// ============================================

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Season select
    const seasonSelect = $('seasonSelect');
    if (seasonSelect) {
        seasonSelect.addEventListener('change', async (e) => {
            const season = parseInt(e.target.value);
            if (season) {
                AppState.season = season;
                await loadRaces(season);
            }
        });
    }

    // Race select
    const raceSelect = $('raceSelect');
    if (raceSelect) {
        raceSelect.addEventListener('change', (e) => {
            const round = parseInt(e.target.value);
            if (round) {
                AppState.raceRound = round;
                updateLoadButton();
            }
        });
    }

    // Session select
    const sessionSelect = $('sessionSelect');
    if (sessionSelect) {
        sessionSelect.addEventListener('change', (e) => {
            AppState.sessionType = e.target.value;
            updateLoadButton();
        });
    }

    // Load session button
    const loadBtn = $('loadSessionBtn');
    if (loadBtn) {
        loadBtn.addEventListener('click', () => loadSession());
    }

    // Playback controls
    setupPlaybackControls();

    // Telemetry driver select
    const telemetryDriverSelect = $('telemetryDriverSelect');
    if (telemetryDriverSelect) {
        telemetryDriverSelect.addEventListener('change', async (e) => {
            const driver = e.target.value;
            if (driver) {
                await loadDriverTelemetry(driver);
            }
        });
    }

    // Speed slider
    const speedSlider = $('speedSlider');
    const speedValue = $('speedValue');
    if (speedSlider) {
        speedSlider.addEventListener('input', (e) => {
            const speed = parseFloat(e.target.value);
            AppState.telemetryManager.setPlaybackSpeed(speed);
            if (speedValue) speedValue.textContent = `${speed}x`;
        });
    }

    // Timeline slider
    const timelineSlider = $('timelineSlider');
    if (timelineSlider) {
        timelineSlider.addEventListener('input', (e) => {
            const progress = parseFloat(e.target.value) / 100;
            AppState.telemetryManager.setProgress(progress);

            // Update car position
            const pos = AppState.telemetryManager.getCurrentPosition();
            if (pos.x && pos.y && AppState.trackRenderer.selectedCar) {
                AppState.trackRenderer.updateCar(AppState.trackRenderer.selectedCar, pos.x, pos.y);
                AppState.trackRenderer.render();
            }
        });
    }
}

/**
 * Setup playback control buttons
 */
function setupPlaybackControls() {
    // Play/Pause button
    const playPauseBtn = $('playPauseBtn');
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', togglePlayback);
    }

    // Skip to start
    const skipBackBtn = $('skipBackBtn');
    if (skipBackBtn) {
        skipBackBtn.addEventListener('click', () => {
            AppState.telemetryManager.resetPlayback();
            updateTimelineSlider(0);
        });
    }

    // Previous lap
    const prevLapBtn = $('prevLapBtn');
    if (prevLapBtn) {
        prevLapBtn.addEventListener('click', () => {
            if (AppState.currentLap > 1) {
                AppState.currentLap--;
                updateLapDisplay();
            }
        });
    }

    // Next lap
    const nextLapBtn = $('nextLapBtn');
    if (nextLapBtn) {
        nextLapBtn.addEventListener('click', () => {
            if (AppState.currentLap < AppState.totalLaps) {
                AppState.currentLap++;
                updateLapDisplay();
            }
        });
    }

    // Skip to end
    const skipEndBtn = $('skipEndBtn');
    if (skipEndBtn) {
        skipEndBtn.addEventListener('click', () => {
            AppState.telemetryManager.setProgress(1);
            updateTimelineSlider(100);
        });
    }
}

/**
 * Toggle playback
 */
function togglePlayback() {
    const isPlaying = AppState.telemetryManager.togglePlayback((pos, progress) => {
        // Update timeline
        updateTimelineSlider(progress * 100);

        // Update car position on track
        if (AppState.trackRenderer.selectedCar) {
            AppState.trackRenderer.updateCar(AppState.trackRenderer.selectedCar, pos.x, pos.y);
            AppState.trackRenderer.render();
        }
    });

    AppState.isPlaying = isPlaying;
    updatePlayPauseButton();
}

/**
 * Update play/pause button icon
 */
function updatePlayPauseButton() {
    const icon = $('playPauseIcon');
    if (icon) {
        icon.textContent = AppState.isPlaying ? '⏸' : '▶';
    }
}

/**
 * Update timeline slider position
 * @param {number} value - Value 0-100
 */
function updateTimelineSlider(value) {
    const slider = $('timelineSlider');
    if (slider) {
        slider.value = value;
    }
}

/**
 * Update load button state
 */
function updateLoadButton() {
    const btn = $('loadSessionBtn');
    if (btn) {
        btn.disabled = !(AppState.season && AppState.raceRound && AppState.sessionType);
    }
}

/**
 * Update lap display
 */
function updateLapDisplay() {
    const currentLapEl = $('currentLap');
    const totalLapsEl = $('totalLaps');

    if (currentLapEl) currentLapEl.textContent = AppState.currentLap || '--';
    if (totalLapsEl) totalLapsEl.textContent = AppState.totalLaps || '--';
}

// ============================================
// Data Loading Functions
// ============================================

/**
 * Load available seasons
 */
async function loadSeasons() {
    const seasonSelect = $('seasonSelect');
    if (!seasonSelect) return;

    try {
        const data = await AppState.api.getSeasons();

        seasonSelect.innerHTML = '<option value="">Select Season</option>';

        // Add seasons in reverse order (newest first)
        const seasons = data.seasons.slice().reverse();
        seasons.forEach(season => {
            const option = document.createElement('option');
            option.value = season;
            option.textContent = season;

            // Mark recommended seasons
            if (data.recommended && data.recommended.includes(season)) {
                option.textContent += ' ★';
            }

            seasonSelect.appendChild(option);
        });

        seasonSelect.disabled = false;

    } catch (error) {
        showError('Failed to load seasons: ' + error.getUserMessage?.() || error.message);
        console.error('Load seasons error:', error);
    }
}

/**
 * Load races for a season
 * @param {number} season 
 */
async function loadRaces(season) {
    const raceSelect = $('raceSelect');
    if (!raceSelect) return;

    raceSelect.innerHTML = '<option value="">Loading...</option>';
    raceSelect.disabled = true;

    try {
        const data = await AppState.api.getRaces(season);

        AppState.races = data.races || [];

        raceSelect.innerHTML = '<option value="">Select Race</option>';

        data.races.forEach(race => {
            const option = document.createElement('option');
            option.value = race.round;
            option.textContent = `R${race.round} - ${race.name || race.event_name}`;
            raceSelect.appendChild(option);
        });

        raceSelect.disabled = false;

        // Enable session select
        const sessionSelect = $('sessionSelect');
        if (sessionSelect) sessionSelect.disabled = false;

        // Restore race round if available
        if (AppState.raceRound) {
            raceSelect.value = AppState.raceRound;
            updateLoadButton();
        }

    } catch (error) {
        raceSelect.innerHTML = '<option value="">Error loading races</option>';
        showError('Failed to load races: ' + error.getUserMessage?.() || error.message);
        console.error('Load races error:', error);
    }
}

/**
 * Load session data
 */
async function loadSession() {
    if (!AppState.season || !AppState.raceRound || !AppState.sessionType) {
        showWarning('Please select season, race, and session type');
        return;
    }

    showLoading('Loading session data...');
    updateStatus('Loading...', 'loading');

    try {
        // Save current session
        saveCurrentSession();

        // Load session data
        const sessionData = await AppState.api.getSession(
            AppState.season,
            AppState.raceRound,
            AppState.sessionType
        );

        AppState.sessionData = sessionData;
        AppState.drivers = sessionData.drivers || [];

        // Update UI
        updateTrackInfo(sessionData);
        updateDriverList(sessionData.drivers);
        AppState.telemetryManager.populateDriverSelect(sessionData.drivers);

        // Update lap info
        if (sessionData.info) {
            AppState.totalLaps = sessionData.info.total_laps || 0;
            AppState.currentLap = 1;
            updateLapDisplay();
        }

        showLoading('Loading track data...');

        // Load track data
        try {
            const trackData = await AppState.api.getTrack(
                AppState.season,
                AppState.raceRound,
                AppState.sessionType
            );

            AppState.trackRenderer.loadTrack(trackData);
            hideElement('emptyState');

            // Position cars on track based on results
            if (sessionData.drivers && trackData.x && trackData.y) {
                positionCarsOnTrack(sessionData.drivers, trackData);
            }

        } catch (trackError) {
            console.warn('Track data not available:', trackError);
            showWarning('Track visualization not available for this session');
        }

        hideLoading();
        updateStatus('Ready', 'ready');
        showSuccess(`Loaded ${sessionData.info?.event_name || 'Session'}`);

    } catch (error) {
        hideLoading();
        updateStatus('Error', 'error');
        showError('Failed to load session: ' + (error.getUserMessage?.() || error.message));
        console.error('Load session error:', error);
    }
}

/**
 * Position cars on track for initial display
 * @param {Array} drivers 
 * @param {Object} trackData 
 */
function positionCarsOnTrack(drivers, trackData) {
    if (!trackData.x || !trackData.y || trackData.x.length === 0) return;

    const positions = [];
    const trackLength = trackData.x.length;

    drivers.forEach((driver, index) => {
        // Spread cars along the track based on position
        const pointIndex = Math.floor((index / drivers.length) * trackLength * 0.3); // First 30% of track

        positions.push({
            driver: driver.code || driver.driver_code,
            x: trackData.x[pointIndex] || trackData.x[0],
            y: trackData.y[pointIndex] || trackData.y[0],
            color: driver.color || getTeamColor(driver.team),
            name: driver.name || driver.full_name,
            team: driver.team || driver.team_name,
            position: driver.position || index + 1
        });
    });

    AppState.trackRenderer.updateCarPositions(positions);
}

/**
 * Load telemetry for a driver
 * @param {string} driverCode 
 */
async function loadDriverTelemetry(driverCode) {
    if (!AppState.season || !AppState.raceRound || !AppState.sessionType) {
        showWarning('Please load a session first');
        return;
    }

    updateStatus('Loading telemetry...', 'loading');

    try {
        const telemetryData = await AppState.api.getTelemetry(
            AppState.season,
            AppState.raceRound,
            AppState.sessionType,
            driverCode
        );

        AppState.telemetryManager.loadTelemetry(telemetryData);
        AppState.trackRenderer.selectDriver(driverCode);

        // Load lap times for this driver
        const lapsData = await AppState.api.getLaps(
            AppState.season,
            AppState.raceRound,
            AppState.sessionType,
            { driver: driverCode }
        );

        if (lapsData.laps) {
            AppState.telemetryManager.displayLapTimes(lapsData.laps);
        }

        updateStatus('Ready', 'ready');
        showSuccess(`Loaded telemetry for ${driverCode}`);

    } catch (error) {
        updateStatus('Error', 'error');
        showError('Failed to load telemetry: ' + (error.getUserMessage?.() || error.message));
        console.error('Load telemetry error:', error);
    }
}

// ============================================
// UI Update Functions
// ============================================

/**
 * Update track info display
 * @param {Object} sessionData 
 */
function updateTrackInfo(sessionData) {
    const trackName = $('trackName');
    const trackCountry = $('trackCountry');

    if (trackName) {
        trackName.textContent = sessionData.info?.event_name || sessionData.info?.circuit_name || 'Unknown Track';
    }

    if (trackCountry) {
        trackCountry.textContent = sessionData.info?.country || '';
    }
}

/**
 * Update driver list sidebar
 * @param {Array} drivers 
 */
function updateDriverList(drivers) {
    const driverList = $('driverList');
    const driverCount = $('driverCount');

    if (!driverList) return;

    clearElement(driverList);

    if (!drivers || drivers.length === 0) {
        driverList.innerHTML = `
            <div class="placeholder-message">
                <span class="placeholder-icon">👥</span>
                <p>No driver data available</p>
            </div>
        `;
        return;
    }

    // Update count
    if (driverCount) {
        driverCount.textContent = `${drivers.length} drivers`;
    }

    // Create driver cards
    drivers.forEach((driver, index) => {
        const teamColor = driver.color || getTeamColor(driver.team);
        const driverCode = driver.code || driver.driver_code;

        const card = document.createElement('div');
        card.className = 'driver-card';
        card.dataset.driver = driverCode;
        card.style.setProperty('--team-color', teamColor);

        card.innerHTML = `
            <span class="driver-position">${driver.position || index + 1}</span>
            <div class="driver-info">
                <div class="driver-name">${driver.name || driver.full_name || driverCode}</div>
                <div class="driver-team">${driver.team || driver.team_name || ''}</div>
            </div>
            <span class="driver-time">${formatLapTimeDisplay(driver.time || driver.fastest_lap) || ''}</span>
        `;

        card.addEventListener('click', () => {
            // Select this driver
            document.querySelectorAll('.driver-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            AppState.telemetryManager.setSelectedDriver(driverCode);
            loadDriverTelemetry(driverCode);
        });

        driverList.appendChild(card);
    });
}

// ============================================
// Global Error Handler
// ============================================

window.addEventListener('error', (event) => {
    console.error('Unhandled error:', event.error);
    // Only show toast for significant errors
    if (event.error && event.error.message && !event.error.message.includes('Script error')) {
        // showError('An unexpected error occurred');
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // Suppress generic error toasts - specific handlers will show appropriate messages
});

// ============================================
// Export to Global Scope
// ============================================

if (typeof window !== 'undefined') {
    window.AppState = AppState;
    window.loadSession = loadSession;
    window.loadDriverTelemetry = loadDriverTelemetry;
    window.togglePlayback = togglePlayback;
}
