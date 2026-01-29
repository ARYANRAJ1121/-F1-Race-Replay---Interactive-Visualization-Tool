/**
 * ================================================
 * F1 Race Replay - Track Renderer
 * ================================================
 * Canvas-based track visualization and car positioning.
 * 
 * Author: Aryan Raj
 * Created: 2026-01-29
 */

// ============================================
// Track Renderer Class
// ============================================

class TrackRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Track data
        this.trackData = null;
        this.trackCoordinates = [];
        this.bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

        // Car positions
        this.cars = new Map(); // driverCode -> { x, y, color, name }

        // Rendering settings
        this.padding = 50;
        this.trackWidth = 12;
        this.carRadius = 8;
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;

        // Animation
        this.animationId = null;
        this.isPlaying = false;

        // Interaction
        this.hoveredCar = null;
        this.selectedCar = null;

        // Initialize
        this.setupCanvas();
        this.setupEventListeners();
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

        // Account for device pixel ratio
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;

        this.ctx.scale(dpr, dpr);

        // Store display dimensions
        this.displayWidth = rect.width;
        this.displayHeight = rect.height;

        // Recalculate scale if track is loaded
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
     * Handle mouse move for hover effects
     * @param {MouseEvent} e 
     */
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        let foundCar = null;

        for (const [code, car] of this.cars) {
            const screenPos = this.worldToScreen(car.x, car.y);
            const dist = Math.sqrt((x - screenPos.x) ** 2 + (y - screenPos.y) ** 2);

            if (dist <= this.carRadius + 5) {
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
     * @param {MouseEvent} e 
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
     * @param {Object} data - Track data from API
     */
    loadTrack(data) {
        this.trackData = data;

        // Handle different data formats from the API
        if (data.coordinates && data.coordinates.x && data.coordinates.y) {
            // Format: { coordinates: { x: [...], y: [...] } }
            this.trackCoordinates = data.coordinates.x.map((x, i) => ({
                x: x,
                y: data.coordinates.y[i]
            }));
        } else if (data.x && data.y) {
            // Format: { x: [...], y: [...] }
            this.trackCoordinates = data.x.map((x, i) => ({
                x: x,
                y: data.y[i]
            }));
        } else if (Array.isArray(data.coordinates)) {
            // Format: { coordinates: [{ x, y }, ...] }
            this.trackCoordinates = data.coordinates;
        } else {
            console.error('Invalid track data format:', data);
            return;
        }

        // Calculate bounds
        this.calculateBounds();
        this.calculateTransform();

        // Clear cars and render
        this.cars.clear();
        this.render();

        console.log(`Track loaded: ${this.trackCoordinates.length} points`);
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

        // Scale to fit
        const scaleX = availableWidth / trackWidth;
        const scaleY = availableHeight / trackHeight;
        this.scale = Math.min(scaleX, scaleY);

        // Center offset
        this.offsetX = (this.displayWidth - trackWidth * this.scale) / 2;
        this.offsetY = (this.displayHeight - trackHeight * this.scale) / 2;
    }

    /**
     * Convert world coordinates to screen coordinates
     * @param {number} x - World X
     * @param {number} y - World Y
     * @returns {Object} - { x, y } screen coordinates
     */
    worldToScreen(x, y) {
        return {
            x: (x - this.bounds.minX) * this.scale + this.offsetX,
            y: (y - this.bounds.minY) * this.scale + this.offsetY
        };
    }

    // ============================================
    // Car Position Updates
    // ============================================

    /**
     * Update car positions
     * @param {Array} positions - Array of { driver, x, y, color, name, team }
     */
    updateCarPositions(positions) {
        positions.forEach(pos => {
            this.cars.set(pos.driver, {
                x: pos.x,
                y: pos.y,
                color: pos.color || getTeamColor(pos.team) || '#ffffff',
                name: pos.name || pos.driver,
                team: pos.team || '',
                position: pos.position || 0
            });
        });

        this.render();
    }

    /**
     * Update single car position
     * @param {string} driver - Driver code
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    updateCar(driver, x, y) {
        const car = this.cars.get(driver);
        if (car) {
            car.x = x;
            car.y = y;
        }
    }

    /**
     * Clear all car positions
     */
    clearCars() {
        this.cars.clear();
        this.render();
    }

    // ============================================
    // Rendering
    // ============================================

    /**
     * Main render function
     */
    render() {
        this.clear();
        this.drawTrack();
        this.drawCars();
        this.drawHoverInfo();
    }

    /**
     * Clear the canvas
     */
    clear() {
        this.ctx.fillStyle = getCSSVar('--color-bg-primary') || '#0a0a0b';
        this.ctx.fillRect(0, 0, this.displayWidth, this.displayHeight);
    }

    /**
     * Draw the track layout
     */
    drawTrack() {
        if (this.trackCoordinates.length < 2) return;

        const ctx = this.ctx;

        // Draw track outline (darker)
        ctx.beginPath();
        ctx.strokeStyle = '#2a2a2e';
        ctx.lineWidth = this.trackWidth + 4;
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

        // Draw track surface
        ctx.beginPath();
        ctx.strokeStyle = '#3a3a3e';
        ctx.lineWidth = this.trackWidth;

        ctx.moveTo(first.x, first.y);

        for (let i = 1; i < this.trackCoordinates.length; i++) {
            const point = this.worldToScreen(this.trackCoordinates[i].x, this.trackCoordinates[i].y);
            ctx.lineTo(point.x, point.y);
        }

        ctx.closePath();
        ctx.stroke();

        // Draw start/finish line
        this.drawStartFinish();
    }

    /**
     * Draw start/finish line
     */
    drawStartFinish() {
        if (this.trackCoordinates.length < 2) return;

        const ctx = this.ctx;
        const start = this.worldToScreen(this.trackCoordinates[0].x, this.trackCoordinates[0].y);

        // Checkerboard pattern
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(start.x, start.y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(start.x, start.y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(start.x, start.y, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Draw all cars on track
     */
    drawCars() {
        const ctx = this.ctx;

        // Sort by position (draw leaders last so they're on top)
        const sortedCars = Array.from(this.cars.entries())
            .sort((a, b) => (b[1].position || 0) - (a[1].position || 0));

        for (const [code, car] of sortedCars) {
            const pos = this.worldToScreen(car.x, car.y);
            const isHovered = code === this.hoveredCar;
            const isSelected = code === this.selectedCar;

            // Draw shadow
            ctx.beginPath();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.arc(pos.x + 2, pos.y + 2, this.carRadius, 0, Math.PI * 2);
            ctx.fill();

            // Draw car circle
            ctx.beginPath();
            ctx.fillStyle = car.color;
            ctx.arc(pos.x, pos.y, this.carRadius, 0, Math.PI * 2);
            ctx.fill();

            // Draw border
            ctx.beginPath();
            ctx.strokeStyle = isHovered || isSelected ? '#ffffff' : 'rgba(255,255,255,0.3)';
            ctx.lineWidth = isSelected ? 3 : 2;
            ctx.arc(pos.x, pos.y, this.carRadius, 0, Math.PI * 2);
            ctx.stroke();

            // Draw driver code
            ctx.fillStyle = this.getContrastColor(car.color);
            ctx.font = 'bold 8px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(code.substring(0, 3), pos.x, pos.y);

            // Draw glow for selected car
            if (isSelected) {
                ctx.beginPath();
                ctx.strokeStyle = car.color;
                ctx.lineWidth = 2;
                ctx.shadowColor = car.color;
                ctx.shadowBlur = 10;
                ctx.arc(pos.x, pos.y, this.carRadius + 5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0;
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

        // Tooltip content
        const text = `${car.position ? 'P' + car.position + ' - ' : ''}${car.name}`;
        const teamText = car.team;

        // Measure text
        ctx.font = 'bold 12px Inter, sans-serif';
        const textWidth = Math.max(ctx.measureText(text).width, ctx.measureText(teamText).width);

        const padding = 8;
        const tooltipWidth = textWidth + padding * 2;
        const tooltipHeight = 40;

        // Position tooltip above car
        let tooltipX = pos.x - tooltipWidth / 2;
        let tooltipY = pos.y - this.carRadius - tooltipHeight - 10;

        // Keep on screen
        tooltipX = Math.max(5, Math.min(tooltipX, this.displayWidth - tooltipWidth - 5));
        tooltipY = Math.max(5, tooltipY);

        // Draw tooltip background
        ctx.fillStyle = 'rgba(30, 30, 34, 0.95)';
        ctx.strokeStyle = car.color;
        ctx.lineWidth = 2;

        this.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 6);
        ctx.fill();
        ctx.stroke();

        // Draw text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(text, tooltipX + padding, tooltipY + padding);

        ctx.fillStyle = '#888888';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText(teamText, tooltipX + padding, tooltipY + padding + 16);
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
     * Get contrasting text color for background
     * @param {string} hexColor 
     * @returns {string}
     */
    getContrastColor(hexColor) {
        const rgb = hexToRgb(hexColor);
        if (!rgb) return '#ffffff';

        const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    // ============================================
    // Animation Control
    // ============================================

    /**
     * Start animation loop
     */
    startAnimation() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.animate();
    }

    /**
     * Stop animation loop
     */
    stopAnimation() {
        this.isPlaying = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Animation loop
     */
    animate() {
        if (!this.isPlaying) return;

        this.render();
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    // ============================================
    // Utility Methods
    // ============================================

    /**
     * Get track info
     * @returns {Object}
     */
    getTrackInfo() {
        return {
            name: this.trackData?.track_name || 'Unknown',
            country: this.trackData?.country || '',
            points: this.trackCoordinates.length,
            bounds: this.bounds
        };
    }

    /**
     * Check if track is loaded
     * @returns {boolean}
     */
    isTrackLoaded() {
        return this.trackCoordinates.length > 0;
    }

    /**
     * Get selected driver
     * @returns {string|null}
     */
    getSelectedDriver() {
        return this.selectedCar;
    }

    /**
     * Select a driver programmatically
     * @param {string} driverCode 
     */
    selectDriver(driverCode) {
        this.selectedCar = driverCode;
        this.render();
    }
}

// ============================================
// Export to Global Scope
// ============================================

if (typeof window !== 'undefined') {
    window.TrackRenderer = TrackRenderer;
}
