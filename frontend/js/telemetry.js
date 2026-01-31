/**
 * ================================================
 * F1 Race Replay - Telemetry Display Handler
 * ================================================
 * Manages telemetry visualization and updates.
 * 
 * Author: Aryan Raj
 * Created: 2026-01-29
 */

// ============================================
// Telemetry Manager Class
// ============================================

class TelemetryManager {
    constructor(suffix = '') {
        this.suffix = suffix; // '' for primary, 'B' for secondary

        // Current telemetry data
        this.currentData = null;
        this.driverCode = null;
        this.lapNumber = null;

        // Data arrays for current lap
        this.telemetryData = {
            distance: [],
            speed: [],
            throttle: [],
            brake: [],
            rpm: [],
            gear: [],
            drs: [],
            x: [],
            y: []
        };

        // Current position index in data
        this.currentIndex = 0;
        this.totalPoints = 0;

        // Animation
        this.isPlaying = false;
        this.playbackSpeed = 1;
        this.lastUpdateTime = 0;

        // DOM elements cache
        this.elements = {};
        this.cacheElements();

        // RPM light thresholds
        this.rpmMax = 15000;
        this.rpmLightThresholds = [0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95];
    }

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        const s = this.suffix;
        this.elements = {
            // Values
            speedValue: $(`speedValue${s}`),
            throttleValue: $(`throttleValue${s}`),
            brakeValue: $(`brakeValue${s}`),
            gearDisplay: $(`gearDisplay${s}`),
            drsIndicator: $(`drsIndicator${s}`),
            rpmValue: $(`rpmValue${s}`),

            // Bars
            speedBar: $(`speedBar${s}`),
            throttleBar: $(`throttleBar${s}`),
            brakeBar: $(`brakeBar${s}`),

            // RPM lights
            rpmLights: $(`rpmLights${s}`),

            // Driver select
            driverSelect: $(`telemetryDriverSelect${s}`),

            // Lap times (Only for primary currently)
            lapTimesBody: s === '' ? $('lapTimesBody') : null
        };
    }

    /**
     * Load telemetry data from API response
     * @param {Object} data - Telemetry data from API
     */
    loadTelemetry(data) {
        if (!data || data.status === 'error') {
            showError(data?.error || 'Failed to load telemetry');
            return false;
        }

        this.currentData = data;
        this.driverCode = data.driver;
        this.lapNumber = data.lap_number;

        // Extract telemetry arrays
        if (data.telemetry) {
            this.telemetryData = {
                distance: data.telemetry.distance || [],
                speed: data.telemetry.speed || [],
                throttle: data.telemetry.throttle || [],
                brake: data.telemetry.brake || [],
                rpm: data.telemetry.rpm || [],
                gear: data.telemetry.gear || [],
                drs: data.telemetry.drs || [],
                x: data.telemetry.x || [],
                y: data.telemetry.y || []
            };
        }

        this.totalPoints = this.telemetryData.speed.length;
        this.currentIndex = 0;

        console.log(`Telemetry loaded: ${this.driverCode} Lap ${this.lapNumber} - ${this.totalPoints} points`);

        // Update initial display
        this.updateDisplay();

        return true;
    }

    /**
     * Update telemetry display at current index
     */
    updateDisplay() {
        const idx = this.currentIndex;

        // Get values at current index
        const speed = this.telemetryData.speed[idx] || 0;
        const throttle = this.telemetryData.throttle[idx] || 0;
        const brake = this.telemetryData.brake[idx] || 0;
        const rpm = this.telemetryData.rpm[idx] || 0;
        const gear = this.telemetryData.gear[idx] || 0;
        const drs = this.telemetryData.drs[idx] || 0;

        // Update speed
        this.updateValue('speed', speed, 370); // Max ~370 km/h

        // Update throttle (0-100)
        this.updateValue('throttle', throttle, 100);

        // Update brake (0-100 or boolean)
        const brakeValue = typeof brake === 'boolean' ? (brake ? 100 : 0) : brake;
        this.updateValue('brake', brakeValue, 100);

        // Update gear
        this.updateGear(gear);

        // Update DRS
        this.updateDRS(drs);

        // Update RPM
        this.updateRPM(rpm);
    }

    /**
     * Update a telemetry value and bar
     * @param {string} type - 'speed', 'throttle', 'brake'
     * @param {number} value - Current value
     * @param {number} max - Maximum value
     */
    updateValue(type, value, max) {
        const valueEl = this.elements[`${type}Value`];
        const barEl = this.elements[`${type}Bar`];

        if (valueEl) {
            if (type === 'speed') {
                valueEl.textContent = formatSpeed(value);
            } else {
                valueEl.textContent = formatPercentage(value);
            }
        }

        if (barEl) {
            const percentage = Math.min((value / max) * 100, 100);
            barEl.style.width = `${percentage}%`;
        }
    }

    /**
     * Update gear display
     * @param {number} gear 
     */
    updateGear(gear) {
        const el = this.elements.gearDisplay;
        if (!el) return;

        if (gear === 0) {
            el.textContent = 'N';
        } else if (gear === -1) {
            el.textContent = 'R';
        } else {
            el.textContent = gear.toString();
        }

        // Color based on gear
        const colors = ['#888', '#22c55e', '#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444', '#ef4444', '#dc2626'];
        el.style.color = colors[Math.min(gear + 1, colors.length - 1)] || '#888';
    }

    /**
     * Update DRS indicator
     * @param {number|boolean} drs 
     */
    updateDRS(drs) {
        const el = this.elements.drsIndicator;
        if (!el) return;

        // DRS values: 0-1 = off, 10-14 = eligible/active
        const isActive = drs >= 10 || drs === true || drs === 1;

        el.textContent = isActive ? 'ON' : 'OFF';
        el.classList.toggle('active', isActive);
    }

    /**
     * Update RPM display and lights
     * @param {number} rpm 
     */
    updateRPM(rpm) {
        const valueEl = this.elements.rpmValue;
        const lightsEl = this.elements.rpmLights;

        if (valueEl) {
            valueEl.textContent = formatNumber(Math.round(rpm));
        }

        if (lightsEl) {
            const lights = lightsEl.querySelectorAll('.rpm-light');
            const rpmPercent = rpm / this.rpmMax;

            lights.forEach((light, i) => {
                const threshold = this.rpmLightThresholds[i];
                light.classList.toggle('active', rpmPercent >= threshold);
            });
        }
    }

    /**
     * Set current position in telemetry data
     * @param {number} index - Data point index
     */
    setPosition(index) {
        this.currentIndex = clamp(index, 0, this.totalPoints - 1);
        this.updateDisplay();
    }

    /**
     * Set position by progress (0-1)
     * @param {number} progress 
     */
    setProgress(progress) {
        const index = Math.floor(progress * (this.totalPoints - 1));
        this.setPosition(index);
    }

    /**
     * Get current position coordinates
     * @returns {Object} - { x, y }
     */
    getCurrentPosition() {
        const idx = this.currentIndex;
        return {
            x: this.telemetryData.x[idx] || 0,
            y: this.telemetryData.y[idx] || 0
        };
    }

    /**
     * Step forward in telemetry data
     * @param {number} steps - Number of steps to advance
     */
    step(steps = 1) {
        this.setPosition(this.currentIndex + steps);
    }

    /**
     * Clear telemetry display
     */
    clear() {
        this.currentData = null;
        this.telemetryData = {
            distance: [], speed: [], throttle: [], brake: [],
            rpm: [], gear: [], drs: [], x: [], y: []
        };
        this.currentIndex = 0;
        this.totalPoints = 0;

        // Reset display
        if (this.elements.speedValue) this.elements.speedValue.textContent = '---';
        if (this.elements.throttleValue) this.elements.throttleValue.textContent = '---';
        if (this.elements.brakeValue) this.elements.brakeValue.textContent = '---';
        if (this.elements.gearDisplay) {
            this.elements.gearDisplay.textContent = 'N';
            this.elements.gearDisplay.style.color = '#888';
        }
        if (this.elements.drsIndicator) {
            this.elements.drsIndicator.textContent = 'OFF';
            this.elements.drsIndicator.classList.remove('active');
        }
        if (this.elements.rpmValue) this.elements.rpmValue.textContent = '---';

        // Reset bars
        if (this.elements.speedBar) this.elements.speedBar.style.width = '0%';
        if (this.elements.throttleBar) this.elements.throttleBar.style.width = '0%';
        if (this.elements.brakeBar) this.elements.brakeBar.style.width = '0%';

        // Reset RPM lights
        if (this.elements.rpmLights) {
            this.elements.rpmLights.querySelectorAll('.rpm-light').forEach(light => {
                light.classList.remove('active');
            });
        }
    }

    // ============================================
    // Driver Selection
    // ============================================

    /**
     * Populate driver select dropdown
     * @param {Array} drivers - Array of driver objects
     */
    populateDriverSelect(drivers) {
        const select = this.elements.driverSelect;
        if (!select) return;

        // Clear existing options
        select.innerHTML = '<option value="">Select Driver</option>';

        // Add driver options
        drivers.forEach(driver => {
            const option = document.createElement('option');
            option.value = driver.code || driver.driver_code;
            option.textContent = `${driver.code || driver.driver_code} - ${driver.name || driver.full_name}`;
            option.style.color = driver.color || getTeamColor(driver.team);
            select.appendChild(option);
        });
    }

    /**
     * Get selected driver code
     * @returns {string|null}
     */
    getSelectedDriver() {
        return this.elements.driverSelect?.value || null;
    }

    /**
     * Set selected driver
     * @param {string} driverCode 
     */
    setSelectedDriver(driverCode) {
        if (this.elements.driverSelect) {
            this.elements.driverSelect.value = driverCode;
        }
    }

    // ============================================
    // Lap Times Display
    // ============================================

    /**
     * Display lap times in the table
     * @param {Array} laps - Array of lap data
     */
    displayLapTimes(laps) {
        const tbody = this.elements.lapTimesBody;
        if (!tbody) return;

        clearElement(tbody);

        if (!laps || laps.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;">No lap data</td></tr>';
            return;
        }

        // Find fastest lap
        const validLaps = laps.filter(lap => lap.lap_time && lap.lap_time !== 'None');
        let fastestLap = null;

        if (validLaps.length > 0) {
            fastestLap = validLaps.reduce((fastest, lap) => {
                // Compare lap times (assuming they're comparable strings or have a numeric value)
                return lap.lap_time < fastest.lap_time ? lap : fastest;
            });
        }

        // Display laps
        laps.forEach(lap => {
            const isFastest = fastestLap && lap.lap_number === fastestLap.lap_number;

            const row = document.createElement('tr');
            if (isFastest) row.classList.add('fastest');

            row.innerHTML = `
                <td>${lap.lap_number || '-'}</td>
                <td>${formatLapTimeDisplay(lap.lap_time)}</td>
                <td>${formatSectorTime(lap.sector1) || '-'}</td>
                <td>${formatSectorTime(lap.sector2) || '-'}</td>
                <td>${formatSectorTime(lap.sector3) || '-'}</td>
            `;

            tbody.appendChild(row);
        });
    }

    /**
     * Clear lap times display
     */
    clearLapTimes() {
        const tbody = this.elements.lapTimesBody;
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;">Select a driver</td></tr>';
        }
    }

    // ============================================
    // Animation / Playback
    // ============================================

    /**
     * Start telemetry playback
     * @param {Function} onUpdate - Callback with position data
     */
    startPlayback(onUpdate) {
        if (this.isPlaying || this.totalPoints === 0) return;

        this.isPlaying = true;
        this.lastUpdateTime = performance.now();

        const animate = (currentTime) => {
            if (!this.isPlaying) return;

            const deltaTime = currentTime - this.lastUpdateTime;
            const stepsPerSecond = 50 * this.playbackSpeed; // Base 50 points per second
            const steps = Math.floor((deltaTime / 1000) * stepsPerSecond);

            if (steps > 0) {
                this.step(steps);
                this.lastUpdateTime = currentTime;

                if (onUpdate) {
                    onUpdate(this.getCurrentPosition(), this.currentIndex / this.totalPoints);
                }

                // Check if we've reached the end
                if (this.currentIndex >= this.totalPoints - 1) {
                    this.stopPlayback();
                    return;
                }
            }

            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }

    /**
     * Stop telemetry playback
     */
    stopPlayback() {
        this.isPlaying = false;
    }

    /**
     * Toggle playback
     * @param {Function} onUpdate 
     */
    togglePlayback(onUpdate) {
        if (this.isPlaying) {
            this.stopPlayback();
        } else {
            this.startPlayback(onUpdate);
        }
        return this.isPlaying;
    }

    /**
     * Set playback speed
     * @param {number} speed - Multiplier (0.25 to 4)
     */
    setPlaybackSpeed(speed) {
        this.playbackSpeed = clamp(speed, 0.25, 4);
    }

    /**
     * Reset playback to start
     */
    resetPlayback() {
        this.stopPlayback();
        this.setPosition(0);
    }

    /**
     * Get playback progress (0-1)
     * @returns {number}
     */
    getProgress() {
        if (this.totalPoints === 0) return 0;
        return this.currentIndex / (this.totalPoints - 1);
    }

    /**
     * Check if telemetry is loaded
     * @returns {boolean}
     */
    hasTelemetry() {
        return this.totalPoints > 0;
    }
}

// ============================================
// Export to Global Scope
// ============================================

if (typeof window !== 'undefined') {
    window.TelemetryManager = TelemetryManager;
}
