/**
 * ================================================
 * F1 Race Replay - Chart Manager
 * ================================================
 * Handles Lap Time Analysis charts using Chart.js
 */

class ChartManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.chart = null;
        this.isInitialized = false;
    }

    /**
     * Initialize chart instance
     */
    init() {
        if (!this.canvas) return;

        Chart.defaults.color = '#888';
        Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';

        this.chart = new Chart(this.canvas, {
            type: 'line',
            data: {
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#e0e0e0',
                            font: { family: 'Inter' }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(10, 10, 15, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#ccc',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        title: { display: true, text: 'Lap Number', color: '#666' },
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { stepSize: 1 }
                    },
                    y: {
                        title: { display: true, text: 'Lap Time (s)', color: '#666' },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    }
                }
            }
        });

        this.isInitialized = true;
    }

    /**
     * Update chart with driver lap data
     * @param {Array} driversData - Array of driver objects with laps
     */
    update(driversData) {
        if (!this.isInitialized) this.init();
        if (!this.chart) return;

        const datasets = driversData.map(driver => {
            // Convert lap times strings "1:30.123" to seconds
            const dataPoints = driver.laps.map(lap => {
                return {
                    x: lap.lap_number,
                    y: this.parseTime(lap.lap_time)
                };
            }).filter(p => !isNaN(p.y));

            return {
                label: driver.name || driver.code,
                data: dataPoints,
                borderColor: driver.color || '#fff',
                backgroundColor: driver.color || '#fff',
                borderWidth: 2,
                pointRadius: 3,
                tension: 0.3
            };
        });

        this.chart.data.datasets = datasets;
        this.chart.update();
    }

    /**
     * Parse time string to seconds
     * @param {string} timeStr - "1:23.456"
     */
    parseTime(timeStr) {
        if (!timeStr) return NaN;
        const parts = timeStr.split(':');
        if (parts.length === 2) {
            return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
        }
        return parseFloat(timeStr);
    }
}
