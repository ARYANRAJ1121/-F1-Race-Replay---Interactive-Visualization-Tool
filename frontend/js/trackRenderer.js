/**
 * ================================================
 * F1 Race Replay - Track Renderer V2.0
 * ================================================
 * Premium canvas-based track visualization with
 * multi-car race replay animation.
 * 
 * Author: Aryan Raj
 * Version: 2.0 - Race Replay Edition
 * Created: 2026-01-30
 */

// ============================================
// Track Renderer Class - Enhanced
// ============================================

class TrackRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Track data
        this.trackData = null;
        this.trackCoordinates = [];
        this.bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

        // Car positions and data
        this.cars = new Map(); // driverCode -> { x, y, color, name, trackIndex }
        this.carTrails = new Map(); // driverCode -> array of recent positions for trail effect

        // Race replay data
        this.raceReplayActive = false;
        this.raceProgress = 0; // 0 to 1
        this.lapProgress = 0;

        // Lap counting for race
        this.currentLap = 1;
        this.totalLaps = 58;
        this.lapStartTime = 0;
        this.leaderLapCount = 0;

        // Rendering settings - Enhanced
        this.padding = 60;
        this.trackWidth = 14;
        this.carRadius = 10;
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;

        // Visual effects
        this.glowIntensity = 0;
        this.pulsePhase = 0;

        // Animation
        this.animationId = null;
        this.isPlaying = false;
        this.playbackSpeed = 1;
        this.lastFrameTime = 0;

        // Interaction
        this.hoveredCar = null;
        this.selectedCar = null;

        // Initialize
        this.setupCanvas();
        this.setupEventListeners();
        this.startGlowAnimation();
    }

    /**
     * Setup canvas dimensions and DPI scaling
     */
    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', debounce(() => this.resizeCanvas(), 200));
    }

    /**
     * Resize canvas to container size with DPI scaling
     */
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();

        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;

        this.ctx.scale(dpr, dpr);

        this.displayWidth = rect.width;
        this.displayHeight = rect.height;

        if (this.trackCoordinates.length > 0) {
            this.calculateTransform();
            this.render();
        }
    }

    /**
     * Setup mouse/touch event listeners
     */
    setupEventListeners() {
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('mouseleave', () => {
            this.hoveredCar = null;
            this.render();
        });
    }

    /**
     * Start ambient glow animation
     */
    startGlowAnimation() {
        const animateGlow = () => {
            this.pulsePhase += 0.02;
            this.glowIntensity = 0.5 + Math.sin(this.pulsePhase) * 0.3;
            requestAnimationFrame(animateGlow);
        };
        animateGlow();
    }

    /**
     * Handle mouse move for hover effects
     */
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        let foundCar = null;

        for (const [code, car] of this.cars) {
            const screenPos = this.worldToScreen(car.x, car.y);
            const dist = Math.sqrt((x - screenPos.x) ** 2 + (y - screenPos.y) ** 2);

            if (dist <= this.carRadius + 8) {
                foundCar = code;
                break;
            }
        }

        if (foundCar !== this.hoveredCar) {
            this.hoveredCar = foundCar;
            this.canvas.style.cursor = foundCar ? 'pointer' : 'default';
            this.render();
        }
    }

    /**
     * Handle click on car
     */
    handleClick(e) {
        if (this.hoveredCar) {
            this.selectedCar = this.hoveredCar === this.selectedCar ? null : this.hoveredCar;

            // Dispatch custom event
            this.canvas.dispatchEvent(new CustomEvent('carSelected', {
                detail: { driver: this.selectedCar }
            }));

            this.render();
        }
    }

    // ============================================
    // Track Data Loading
    // ============================================

    /**
     * Load track data from API response
     */
    loadTrack(data) {
        this.trackData = data;

        // Handle different data formats
        if (data.coordinates && data.coordinates.x && data.coordinates.y) {
            this.trackCoordinates = data.coordinates.x.map((x, i) => ({
                x: x,
                y: data.coordinates.y[i]
            }));
        } else if (data.x && data.y) {
            this.trackCoordinates = data.x.map((x, i) => ({
                x: x,
                y: data.y[i]
            }));
        } else if (Array.isArray(data.coordinates)) {
            this.trackCoordinates = data.coordinates;
        } else {
            console.error('Invalid track data format:', data);
            return;
        }

        this.calculateBounds();
        this.calculateTransform();
        this.cars.clear();
        this.carTrails.clear();
        this.render();

        // Update track name display
        this.updateTrackName();

        console.log(`🏁 Track loaded: ${this.trackCoordinates.length} points - ${this.getTrackInfo().name}`);
    }

    /**
     * Update track name in UI
     */
    updateTrackName() {
        const trackNameEl = document.getElementById('trackName');
        const trackCountryEl = document.getElementById('trackCountry');

        const trackInfo = this.getTrackInfo();

        if (trackNameEl) {
            trackNameEl.textContent = trackInfo.name;
        }
        if (trackCountryEl && trackInfo.country) {
            trackCountryEl.textContent = trackInfo.country;
        }
    }

    /**
     * Calculate track coordinate bounds
     */
    calculateBounds() {
        if (this.trackCoordinates.length === 0) return;

        const xs = this.trackCoordinates.map(p => p.x);
        const ys = this.trackCoordinates.map(p => p.y);

        this.bounds = {
            minX: Math.min(...xs),
            maxX: Math.max(...xs),
            minY: Math.min(...ys),
            maxY: Math.max(...ys)
        };
    }

    /**
     * Calculate transformation for fitting track to canvas
     */
    calculateTransform() {
        const trackWidth = this.bounds.maxX - this.bounds.minX;
        const trackHeight = this.bounds.maxY - this.bounds.minY;

        const availableWidth = this.displayWidth - this.padding * 2;
        const availableHeight = this.displayHeight - this.padding * 2;

        const scaleX = availableWidth / trackWidth;
        const scaleY = availableHeight / trackHeight;
        this.scale = Math.min(scaleX, scaleY);

        this.offsetX = (this.displayWidth - trackWidth * this.scale) / 2;
        this.offsetY = (this.displayHeight - trackHeight * this.scale) / 2;
    }

    /**
     * Convert world coordinates to screen coordinates
     */
    worldToScreen(x, y) {
        return {
            x: (x - this.bounds.minX) * this.scale + this.offsetX,
            y: (y - this.bounds.minY) * this.scale + this.offsetY
        };
    }

    // ============================================
    // Race Replay - All Cars Moving Together
    // ============================================

    /**
     * Start race replay with all cars
     * @param {Array} drivers - Array of driver objects with positions
     */
    startRaceReplay(drivers) {
        this.raceReplayActive = true;
        this.raceProgress = 0;
        this.leaderLapCount = 0;
        this.currentLap = 1;
        this.lapStartTime = performance.now();

        // Update lap display
        this.updateLapDisplay();

        // Initialize all cars at starting positions with realistic speeds
        drivers.forEach((driver, index) => {
            const startIndex = Math.floor((index / drivers.length) * 15); // Spread at start
            const baseSpeed = 1.0 - (index * 0.008); // Leader is fastest

            this.cars.set(driver.driver_code || driver.code, {
                x: this.trackCoordinates[startIndex]?.x || this.trackCoordinates[0].x,
                y: this.trackCoordinates[startIndex]?.y || this.trackCoordinates[0].y,
                color: driver.team_color || driver.color || getTeamColor(driver.team),
                name: driver.full_name || driver.name || driver.driver_code,
                team: driver.team || '',
                position: driver.position || index + 1,
                trackIndex: startIndex,
                speed: baseSpeed + (Math.random() * 0.02 - 0.01), // Slight random variation
                lapCount: 0,
                lastLapTime: 0,
                currentSpeed: 280 + Math.random() * 40 // km/h simulation
            });
            this.carTrails.set(driver.driver_code || driver.code, []);
        });

        this.isPlaying = true;
        this.lastFrameTime = performance.now();
        this.animateRace();
    }

    /**
     * Animate all cars around the track
     */
    animateRace() {
        if (!this.isPlaying || !this.raceReplayActive) return;

        const now = performance.now();
        const deltaTime = (now - this.lastFrameTime) / 1000;
        this.lastFrameTime = now;

        // Move all cars forward
        const trackLength = this.trackCoordinates.length;
        const baseSpeed = 60 * this.playbackSpeed; // Points per second

        let leaderCompleted = false;

        for (const [code, car] of this.cars) {
            const prevIndex = car.trackIndex;

            // Update track index based on position
            const progress = baseSpeed * deltaTime * car.speed;
            car.trackIndex = car.trackIndex + progress;

            // Check for lap completion
            if (car.trackIndex >= trackLength) {
                // If it's the leader and we reached total laps, FINISH race
                if (car.position === 1 && this.currentLap >= this.totalLaps) {
                    this.finishRace();
                    return;
                }

                car.trackIndex = car.trackIndex % trackLength;
                car.lapCount++;
                car.lastLapTime = now - this.lapStartTime;

                // Check if this is the leader completing a lap
                if (car.position === 1) {
                    leaderCompleted = true;
                    this.currentLap = car.lapCount + 1;
                    this.lapStartTime = now;
                }
            }

            const idx = Math.floor(car.trackIndex);
            const nextIdx = (idx + 1) % trackLength;
            const t = car.trackIndex - idx;

            // Interpolate position for smooth movement
            const current = this.trackCoordinates[idx];
            const next = this.trackCoordinates[nextIdx];

            if (current && next) {
                // Calculate speed based on track curvature
                const dx = next.x - current.x;
                const dy = next.y - current.y;
                const curvature = Math.abs(dx) + Math.abs(dy);

                // Simulate realistic speed (slower in corners)
                const baseKmh = 290;
                const speedVariation = 80 * (curvature / 100);
                car.currentSpeed = Math.max(80, baseKmh - speedVariation + (Math.random() * 10));

                car.x = current.x + (next.x - current.x) * t;
                car.y = current.y + (next.y - current.y) * t;
            }

            // Add to trail
            const trail = this.carTrails.get(code) || [];
            trail.push({ x: car.x, y: car.y });
            if (trail.length > 20) trail.shift(); // Keep last 20 positions
            this.carTrails.set(code, trail);

            // Update telemetry if this car is selected
            if (code === this.selectedCar) {
                this.updateSelectedCarTelemetry(car);
                if (AppState.audioManager) {
                    AppState.audioManager.updateEngine(car.currentSpeed);
                }
            }
        }

        // Update lap display if leader completed a lap
        if (leaderCompleted) {
            this.updateLapDisplay();
        }

        this.render();
        this.animationId = requestAnimationFrame(() => this.animateRace());
    }

    /**
     * Update lap display in UI
     */
    updateLapDisplay() {
        const currentLapEl = document.getElementById('currentLap');
        const totalLapsEl = document.getElementById('totalLaps');

        if (currentLapEl) {
            currentLapEl.textContent = Math.min(this.currentLap, this.totalLaps);
        }
        if (totalLapsEl) {
            totalLapsEl.textContent = this.totalLaps;
        }
    }

    /**
     * Set total laps for the race
     */
    setTotalLaps(laps) {
        this.totalLaps = laps || 58;
        this.updateLapDisplay();
    }

    /**
     * Update telemetry display for selected car
     */
    /**
     * Update telemetry display for selected car
     */
    updateSelectedCarTelemetry(car) {
        // Check if we have real telemetry for this driver
        let useRealData = false;
        let realSpeed, realThrottle, realBrake, realRPM, realGear;

        if (typeof AppState !== 'undefined' && AppState.telemetryManager && AppState.telemetryManager.hasTelemetry()) {
            const tm = AppState.telemetryManager;
            // Ensure the loaded telemetry matches the selected car
            if (tm.driverCode === car.name || tm.driverCode === (car.name?.split(' ').pop()?.toUpperCase()) || tm.driverCode === this.selectedCar) {

                // Calculate index based on track progress
                const trackProgress = car.trackIndex / this.trackCoordinates.length;
                const telemetryIndex = Math.floor(trackProgress * tm.totalPoints);
                const idx = Math.min(telemetryIndex, tm.totalPoints - 1);

                if (tm.telemetryData && tm.telemetryData.speed && tm.telemetryData.speed[idx] !== undefined) {
                    useRealData = true;
                    realSpeed = tm.telemetryData.speed[idx];
                    realThrottle = tm.telemetryData.throttle[idx];
                    realBrake = tm.telemetryData.brake[idx];
                    realRPM = tm.telemetryData.rpm[idx];
                    realGear = tm.telemetryData.gear[idx];
                }
            }
        }

        // --- SPEED ---
        const speedValue = document.getElementById('speedValue');
        const speedBar = document.getElementById('speedBar');
        const displaySpeed = useRealData ? realSpeed : car.currentSpeed;

        if (speedValue) {
            speedValue.textContent = Math.round(displaySpeed);
        }
        if (speedBar) {
            speedBar.style.width = `${(displaySpeed / 370) * 100}%`;
        }

        // --- THROTTLE / BRAKE ---
        const throttleValue = document.getElementById('throttleValue');
        const brakeValue = document.getElementById('brakeValue');
        const throttleBar = document.getElementById('throttleBar');
        const brakeBar = document.getElementById('brakeBar');

        let throttle, brake;

        if (useRealData) {
            throttle = realThrottle;
            brake = typeof realBrake === 'boolean' ? (realBrake ? 100 : 0) : realBrake;
        } else {
            // Simulated fallback
            const isAccelerating = car.currentSpeed > 200;
            throttle = isAccelerating ? 80 + Math.random() * 20 : 30 + Math.random() * 40;
            brake = !isAccelerating && car.currentSpeed < 150 ? 30 + Math.random() * 40 : 0;
        }

        if (throttleValue) throttleValue.textContent = Math.round(throttle);
        if (brakeValue) brakeValue.textContent = Math.round(brake);
        if (throttleBar) throttleBar.style.width = `${throttle}%`;
        if (brakeBar) brakeBar.style.width = `${brake}%`;

        // --- GEAR ---
        const gearDisplay = document.getElementById('gearDisplay');
        if (gearDisplay) {
            let gear;

            if (useRealData) {
                gear = realGear;
            } else {
                // Simulated fallback
                gear = 1;
                if (car.currentSpeed > 280) gear = 8;
                else if (car.currentSpeed > 240) gear = 7;
                else if (car.currentSpeed > 200) gear = 6;
                else if (car.currentSpeed > 160) gear = 5;
                else if (car.currentSpeed > 120) gear = 4;
                else if (car.currentSpeed > 80) gear = 3;
                else if (car.currentSpeed > 50) gear = 2;
            }

            gearDisplay.textContent = gear === 0 ? 'N' : gear === -1 ? 'R' : gear;

            // Update gear color
            const colors = ['#22c55e', '#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444', '#ef4444', '#dc2626'];
            const gearIndex = (typeof gear === 'number') ? gear : 1;
            gearDisplay.style.color = colors[Math.max(0, Math.min(gearIndex - 1, 7))] || '#888';
        }

        // --- RPM ---
        const rpmValue = document.getElementById('rpmValue');
        if (rpmValue) {
            let rpm;

            if (useRealData) {
                rpm = realRPM;
            } else {
                rpm = 8000 + (car.currentSpeed / 350) * 6000 + Math.random() * 500;
            }

            rpmValue.textContent = Math.round(rpm).toLocaleString();

            // Update RPM lights
            const rpmLights = document.getElementById('rpmLights');
            if (rpmLights) {
                const lights = rpmLights.querySelectorAll('.rpm-light');
                const rpmPercent = rpm / 15000;
                const thresholds = [0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95];
                lights.forEach((light, i) => {
                    light.classList.toggle('active', rpmPercent >= thresholds[i]);
                });
            }
        }
    }


    /**
     * Update car positions from external data
     */
    updateCarPositions(positions) {
        positions.forEach(pos => {
            const existingCar = this.cars.get(pos.driver);
            this.cars.set(pos.driver, {
                x: pos.x,
                y: pos.y,
                color: pos.color || getTeamColor(pos.team) || '#ffffff',
                name: pos.name || pos.driver,
                team: pos.team || '',
                position: pos.position || 0,
                trackIndex: existingCar?.trackIndex || 0,
                speed: existingCar?.speed || 1
            });
        });

        if (!this.raceReplayActive) {
            this.render();
        }
    }

    /**
     * Update single car position
     */
    updateCar(driver, x, y) {
        const car = this.cars.get(driver);
        if (car) {
            car.x = x;
            car.y = y;
        }
    }

    /**
     * Clear all cars
     */
    clearCars() {
        this.cars.clear();
        this.carTrails.clear();
        this.render();
    }

    /**
     * Finish the race replay
     */
    finishRace() {
        this.pausePlayback();
        if (typeof AppState !== 'undefined') {
            AppState.isPlaying = false;
            // Update UI button manually since we bypassed app.togglePlayback
            const icon = document.getElementById('playPauseIcon');
            if (icon) icon.textContent = '▶';

            if (AppState.audioManager) {
                AppState.audioManager.stopEngine();
            }
        }
        console.log("🏁 Race Finished!");
    }

    /**
     * Toggle playback
     */
    togglePlayback() {
        this.isPlaying = !this.isPlaying;
        if (this.isPlaying) {
            this.lastFrameTime = performance.now();
            if (this.raceReplayActive) {
                this.animateRace();
            }
        }
        return this.isPlaying;
    }

    /**
     * Start playback
     */
    startPlayback() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.lastFrameTime = performance.now();
        if (this.raceReplayActive) {
            this.animateRace();
        }
    }

    /**
     * Pause playback
     */
    pausePlayback() {
        this.isPlaying = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Set playback speed
     */
    setPlaybackSpeed(speed) {
        this.playbackSpeed = speed;
    }

    // ============================================
    // Rendering - Premium Visual Effects
    // ============================================

    /**
     * Main render function
     */
    render() {
        this.clear();
        this.drawBackground();
        this.drawTrack();
        this.drawCarTrails();
        this.drawCars();
        this.drawHoverInfo();
    }

    /**
     * Clear the canvas with gradient background
     */
    clear() {
        const ctx = this.ctx;

        // Create dark gradient background
        const gradient = ctx.createRadialGradient(
            this.displayWidth / 2, this.displayHeight / 2, 0,
            this.displayWidth / 2, this.displayHeight / 2, this.displayWidth
        );
        gradient.addColorStop(0, '#0a0a12');
        gradient.addColorStop(1, '#050508');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.displayWidth, this.displayHeight);
    }

    /**
     * Draw animated background grid
     */
    drawBackground() {
        const ctx = this.ctx;
        const gridSize = 40;

        ctx.strokeStyle = `rgba(255, 8, 68, ${0.03 + this.glowIntensity * 0.02})`;
        ctx.lineWidth = 0.5;

        // Vertical lines
        for (let x = 0; x <= this.displayWidth; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.displayHeight);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= this.displayHeight; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.displayWidth, y);
            ctx.stroke();
        }
    }

    /**
     * Draw the track layout with neon effect
     */
    drawTrack() {
        if (this.trackCoordinates.length < 2) return;

        const ctx = this.ctx;

        // Outer glow
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255, 8, 68, ${0.15 * this.glowIntensity})`;
        ctx.lineWidth = this.trackWidth + 20;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const first = this.worldToScreen(this.trackCoordinates[0].x, this.trackCoordinates[0].y);
        ctx.moveTo(first.x, first.y);

        for (let i = 1; i < this.trackCoordinates.length; i++) {
            const point = this.worldToScreen(this.trackCoordinates[i].x, this.trackCoordinates[i].y);
            ctx.lineTo(point.x, point.y);
        }
        ctx.closePath();
        ctx.stroke();

        // Track border (dark)
        ctx.beginPath();
        ctx.strokeStyle = '#1a1a25';
        ctx.lineWidth = this.trackWidth + 6;
        ctx.moveTo(first.x, first.y);
        for (let i = 1; i < this.trackCoordinates.length; i++) {
            const point = this.worldToScreen(this.trackCoordinates[i].x, this.trackCoordinates[i].y);
            ctx.lineTo(point.x, point.y);
        }
        ctx.closePath();
        ctx.stroke();

        // Track surface with subtle gradient
        ctx.beginPath();
        ctx.strokeStyle = '#2a2a35';
        ctx.lineWidth = this.trackWidth;
        ctx.moveTo(first.x, first.y);
        for (let i = 1; i < this.trackCoordinates.length; i++) {
            const point = this.worldToScreen(this.trackCoordinates[i].x, this.trackCoordinates[i].y);
            ctx.lineTo(point.x, point.y);
        }
        ctx.closePath();
        ctx.stroke();

        // Racing line (subtle cyan glow)
        ctx.beginPath();
        ctx.strokeStyle = `rgba(0, 245, 255, ${0.2 + this.glowIntensity * 0.1})`;
        ctx.lineWidth = 2;
        ctx.moveTo(first.x, first.y);
        for (let i = 1; i < this.trackCoordinates.length; i++) {
            const point = this.worldToScreen(this.trackCoordinates[i].x, this.trackCoordinates[i].y);
            ctx.lineTo(point.x, point.y);
        }
        ctx.closePath();
        ctx.stroke();

        this.drawStartFinish();
    }

    /**
     * Draw start/finish line with checkered pattern
     */
    drawStartFinish() {
        if (this.trackCoordinates.length < 2) return;

        const ctx = this.ctx;
        const start = this.worldToScreen(this.trackCoordinates[0].x, this.trackCoordinates[0].y);

        // Glow effect
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 * this.glowIntensity})`;
        ctx.arc(start.x, start.y, 15, 0, Math.PI * 2);
        ctx.fill();

        // Checkered center
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(start.x, start.y, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(start.x, start.y, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(start.x, start.y, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Draw car trails for motion effect
     */
    drawCarTrails() {
        const ctx = this.ctx;

        for (const [code, trail] of this.carTrails) {
            if (trail.length < 2) continue;

            const car = this.cars.get(code);
            if (!car) continue;

            ctx.beginPath();
            ctx.strokeStyle = car.color;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';

            for (let i = 0; i < trail.length; i++) {
                const pos = this.worldToScreen(trail[i].x, trail[i].y);
                const alpha = i / trail.length * 0.4;

                if (i === 0) {
                    ctx.moveTo(pos.x, pos.y);
                } else {
                    ctx.globalAlpha = alpha;
                    ctx.lineTo(pos.x, pos.y);
                }
            }
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    /**
     * Draw all cars on track with premium effects
     */
    drawCars() {
        const ctx = this.ctx;

        // Sort by position (leaders on top)
        const sortedCars = Array.from(this.cars.entries())
            .sort((a, b) => (b[1].position || 0) - (a[1].position || 0));

        for (const [code, car] of sortedCars) {
            const pos = this.worldToScreen(car.x, car.y);
            const isHovered = code === this.hoveredCar;
            const isSelected = code === this.selectedCar;

            // Outer glow for selected/hovered
            if (isSelected || isHovered) {
                ctx.beginPath();
                ctx.fillStyle = car.color;
                ctx.shadowColor = car.color;
                ctx.shadowBlur = 25;
                ctx.arc(pos.x, pos.y, this.carRadius + 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            // Car shadow
            ctx.beginPath();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.arc(pos.x + 2, pos.y + 3, this.carRadius, 0, Math.PI * 2);
            ctx.fill();

            // Car gradient background
            const carGradient = ctx.createRadialGradient(
                pos.x - 2, pos.y - 2, 0,
                pos.x, pos.y, this.carRadius
            );
            carGradient.addColorStop(0, this.lightenColor(car.color, 30));
            carGradient.addColorStop(1, car.color);

            ctx.beginPath();
            ctx.fillStyle = carGradient;
            ctx.arc(pos.x, pos.y, this.carRadius, 0, Math.PI * 2);
            ctx.fill();

            // Car border
            ctx.beginPath();
            ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = isSelected ? 3 : 2;
            ctx.arc(pos.x, pos.y, this.carRadius, 0, Math.PI * 2);
            ctx.stroke();

            // Driver code
            ctx.fillStyle = this.getContrastColor(car.color);
            ctx.font = 'bold 9px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(code.substring(0, 3), pos.x, pos.y);

            // Position indicator
            if (car.position && car.position <= 3) {
                const badgeX = pos.x + this.carRadius + 3;
                const badgeY = pos.y - this.carRadius - 3;

                ctx.beginPath();
                ctx.fillStyle = car.position === 1 ? '#ffd700' : car.position === 2 ? '#c0c0c0' : '#cd7f32';
                ctx.arc(badgeX, badgeY, 8, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#000';
                ctx.font = 'bold 8px Inter';
                ctx.fillText(car.position.toString(), badgeX, badgeY);
            }
        }
    }

    /**
     * Draw hover tooltip
     */
    drawHoverInfo() {
        if (!this.hoveredCar) return;

        const car = this.cars.get(this.hoveredCar);
        if (!car) return;

        const pos = this.worldToScreen(car.x, car.y);
        const ctx = this.ctx;

        const text = `${car.position ? 'P' + car.position + ' • ' : ''}${car.name}`;
        const teamText = car.team;

        ctx.font = 'bold 13px Inter, sans-serif';
        const textWidth = Math.max(ctx.measureText(text).width, ctx.measureText(teamText).width);

        const padding = 12;
        const tooltipWidth = textWidth + padding * 2;
        const tooltipHeight = 48;

        let tooltipX = pos.x - tooltipWidth / 2;
        let tooltipY = pos.y - this.carRadius - tooltipHeight - 15;

        tooltipX = Math.max(10, Math.min(tooltipX, this.displayWidth - tooltipWidth - 10));
        tooltipY = Math.max(10, tooltipY);

        // Tooltip background with blur effect
        ctx.fillStyle = 'rgba(10, 10, 15, 0.95)';
        ctx.strokeStyle = car.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = car.color;
        ctx.shadowBlur = 15;

        this.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 10);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Accent line at top
        ctx.fillStyle = car.color;
        ctx.fillRect(tooltipX, tooltipY, tooltipWidth, 3);

        // Text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(text, tooltipX + padding, tooltipY + padding + 2);

        ctx.fillStyle = '#888';
        ctx.font = '11px Inter, sans-serif';
        ctx.fillText(teamText, tooltipX + padding, tooltipY + padding + 20);
    }

    /**
     * Draw rounded rectangle
     */
    roundRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.arcTo(x + width, y, x + width, y + radius, radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.arcTo(x, y + height, x, y + height - radius, radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.arcTo(x, y, x + radius, y, radius);
        this.ctx.closePath();
    }

    /**
     * Get contrasting text color
     */
    getContrastColor(hexColor) {
        const rgb = hexToRgb(hexColor);
        if (!rgb) return '#ffffff';
        const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    /**
     * Lighten a hex color
     */
    lightenColor(hex, percent) {
        const rgb = hexToRgb(hex);
        if (!rgb) return hex;

        const r = Math.min(255, rgb.r + (255 - rgb.r) * percent / 100);
        const g = Math.min(255, rgb.g + (255 - rgb.g) * percent / 100);
        const b = Math.min(255, rgb.b + (255 - rgb.b) * percent / 100);

        return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    }

    // ============================================
    // Animation Control
    // ============================================

    startAnimation() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.lastFrameTime = performance.now();
        if (this.raceReplayActive) {
            this.animateRace();
        }
    }

    stopAnimation() {
        this.isPlaying = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    // ============================================
    // Utility Methods
    // ============================================

    getTrackInfo() {
        return {
            name: this.trackData?.track_name || this.trackData?.circuit || 'Unknown',
            country: this.trackData?.country || '',
            points: this.trackCoordinates.length,
            bounds: this.bounds
        };
    }

    isTrackLoaded() {
        return this.trackCoordinates.length > 0;
    }

    getSelectedDriver() {
        return this.selectedCar;
    }

    selectDriver(driverCode) {
        this.selectedCar = driverCode;
        this.render();
    }

    /**
     * Get track coordinates array for external use
     */
    getTrackCoordinates() {
        return this.trackCoordinates;
    }
}

// ============================================
// Export to Global Scope
// ============================================

if (typeof window !== 'undefined') {
    window.TrackRenderer = TrackRenderer;
}
