/**
 * ================================================
 * F1 Race Replay - Utility Functions
 * ================================================
 * Helper functions used across the application.
 * 
 * Author: Aryan Raj
 * Created: 2026-01-29
 */

// ============================================
// DOM Utilities
// ============================================

/**
 * Shorthand for document.getElementById
 * @param {string} id - Element ID
 * @returns {HTMLElement|null}
 */
function $(id) {
    return document.getElementById(id);
}

/**
 * Shorthand for document.querySelector
 * @param {string} selector - CSS selector
 * @returns {HTMLElement|null}
 */
function $$(selector) {
    return document.querySelector(selector);
}

/**
 * Shorthand for document.querySelectorAll
 * @param {string} selector - CSS selector
 * @returns {NodeList}
 */
function $$$(selector) {
    return document.querySelectorAll(selector);
}

/**
 * Create an HTML element with attributes and content
 * @param {string} tag - HTML tag name
 * @param {Object} attrs - Attributes object
 * @param {string|HTMLElement|Array} content - Inner content
 * @returns {HTMLElement}
 */
function createElement(tag, attrs = {}, content = '') {
    const el = document.createElement(tag);

    for (const [key, value] of Object.entries(attrs)) {
        if (key === 'className') {
            el.className = value;
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(el.style, value);
        } else if (key.startsWith('on') && typeof value === 'function') {
            el.addEventListener(key.slice(2).toLowerCase(), value);
        } else {
            el.setAttribute(key, value);
        }
    }

    if (typeof content === 'string') {
        el.innerHTML = content;
    } else if (content instanceof HTMLElement) {
        el.appendChild(content);
    } else if (Array.isArray(content)) {
        content.forEach(child => {
            if (child instanceof HTMLElement) {
                el.appendChild(child);
            } else if (typeof child === 'string') {
                el.appendChild(document.createTextNode(child));
            }
        });
    }

    return el;
}

/**
 * Remove all children from an element
 * @param {HTMLElement} element 
 */
function clearElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

/**
 * Show an element (remove hidden class)
 * @param {HTMLElement|string} element - Element or ID
 */
function showElement(element) {
    const el = typeof element === 'string' ? $(element) : element;
    if (el) el.classList.remove('hidden');
}

/**
 * Hide an element (add hidden class)
 * @param {HTMLElement|string} element - Element or ID
 */
function hideElement(element) {
    const el = typeof element === 'string' ? $(element) : element;
    if (el) el.classList.add('hidden');
}

/**
 * Toggle element visibility
 * @param {HTMLElement|string} element - Element or ID
 */
function toggleElement(element) {
    const el = typeof element === 'string' ? $(element) : element;
    if (el) el.classList.toggle('hidden');
}

// ============================================
// Toast Notification System
// ============================================

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type: 'success', 'error', 'info', 'warning'
 * @param {number} duration - Duration in ms (default: 4000)
 */
function showToast(message, type = 'info', duration = 4000) {
    const container = $('toastContainer');
    if (!container) return;

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    const toast = createElement('div', {
        className: `toast ${type}`,
        role: 'alert'
    }, `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `);

    container.appendChild(toast);

    // Auto-remove after duration
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Show success toast
 * @param {string} message 
 */
function showSuccess(message) {
    showToast(message, 'success');
}

/**
 * Show error toast
 * @param {string} message 
 */
function showError(message) {
    showToast(message, 'error', 6000);
}

/**
 * Show info toast
 * @param {string} message 
 */
function showInfo(message) {
    showToast(message, 'info');
}

/**
 * Show warning toast
 * @param {string} message 
 */
function showWarning(message) {
    showToast(message, 'warning', 5000);
}

// ============================================
// Loading State Management
// ============================================

/**
 * Show loading overlay
 * @param {string} message - Loading message
 */
function showLoading(message = 'Loading...') {
    const overlay = $('canvasOverlay');
    const loadingText = overlay?.querySelector('.loading-text');

    if (overlay) {
        overlay.classList.add('active');
        if (loadingText) loadingText.textContent = message;
    }

    hideElement('emptyState');
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    const overlay = $('canvasOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

/**
 * Update status indicator
 * @param {string} status - Status text
 * @param {string} type - 'ready', 'loading', 'error'
 */
function updateStatus(status, type = 'ready') {
    const indicator = $('statusIndicator');
    if (!indicator) return;

    const dot = indicator.querySelector('.status-dot');
    const text = indicator.querySelector('.status-text');

    if (text) text.textContent = status;

    if (dot) {
        dot.style.background = {
            ready: 'var(--color-accent-green)',
            loading: 'var(--color-accent-yellow)',
            error: 'var(--color-accent-primary)'
        }[type] || 'var(--color-accent-green)';
    }
}

// ============================================
// Performance Utilities
// ============================================

/**
 * Debounce function - delays execution until after wait ms
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function}
 */
function debounce(func, wait = 250) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function - limits execution to once per wait ms
 * @param {Function} func - Function to throttle
 * @param {number} wait - Wait time in ms
 * @returns {Function}
 */
function throttle(func, wait = 100) {
    let lastTime = 0;
    return function executedFunction(...args) {
        const now = Date.now();
        if (now - lastTime >= wait) {
            lastTime = now;
            func(...args);
        }
    };
}

/**
 * Request animation frame with throttling
 * @param {Function} callback 
 * @returns {Function}
 */
function rafThrottle(callback) {
    let requestId = null;
    return function throttled(...args) {
        if (requestId === null) {
            requestId = requestAnimationFrame(() => {
                callback(...args);
                requestId = null;
            });
        }
    };
}

// ============================================
// Data Formatting Utilities
// ============================================

/**
 * Format a number with thousand separators
 * @param {number} num 
 * @returns {string}
 */
function formatNumber(num) {
    return num.toLocaleString();
}

/**
 * Format speed value
 * @param {number} speed - Speed in km/h
 * @returns {string}
 */
function formatSpeed(speed) {
    if (speed === null || speed === undefined) return '---';
    return Math.round(speed).toString();
}

/**
 * Format percentage value
 * @param {number} value - Value 0-100
 * @returns {string}
 */
function formatPercentage(value) {
    if (value === null || value === undefined) return '---';
    return Math.round(value).toString();
}

/**
 * Format lap time from seconds or timedelta string
 * @param {number|string} time 
 * @returns {string}
 */
function formatLapTimeDisplay(time) {
    if (!time || time === 'None' || time === 'null' || time === 'NaT') {
        return '--:--.---';
    }

    // If it's a number (seconds)
    if (typeof time === 'number') {
        const minutes = Math.floor(time / 60);
        const seconds = (time % 60).toFixed(3);
        return `${minutes}:${seconds.padStart(6, '0')}`;
    }

    // If already formatted
    if (typeof time === 'string') {
        // Handle pandas timedelta format: "0 days 00:01:23.456000"
        const tdMatch = time.match(/(\d+):(\d+):(\d+\.?\d*)/);
        if (tdMatch) {
            const hours = parseInt(tdMatch[1]);
            const minutes = parseInt(tdMatch[2]) + hours * 60;
            const seconds = parseFloat(tdMatch[3]).toFixed(3);
            return `${minutes}:${seconds.padStart(6, '0')}`;
        }

        // Already in m:ss.sss format
        if (time.includes(':')) {
            return time;
        }
    }

    return time.toString();
}

/**
 * Format time difference (delta)
 * @param {number} delta - Time difference in seconds
 * @returns {string}
 */
function formatDelta(delta) {
    if (delta === null || delta === undefined) return '';
    if (delta === 0) return '±0.000';

    const sign = delta > 0 ? '+' : '-';
    const absValue = Math.abs(delta).toFixed(3);
    return `${sign}${absValue}`;
}

/**
 * Format race time (hours:minutes:seconds)
 * @param {number} seconds - Total seconds
 * @returns {string}
 */
function formatRaceTime(seconds) {
    if (!seconds) return '--:--:--';

    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ============================================
// Color Utilities
// ============================================

/**
 * Get CSS variable value
 * @param {string} varName - CSS variable name (with or without --)
 * @returns {string}
 */
function getCSSVar(varName) {
    const name = varName.startsWith('--') ? varName : `--${varName}`;
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Set CSS variable value
 * @param {string} varName - CSS variable name
 * @param {string} value - New value
 */
function setCSSVar(varName, value) {
    const name = varName.startsWith('--') ? varName : `--${varName}`;
    document.documentElement.style.setProperty(name, value);
}

/**
 * Convert hex color to RGB object
 * @param {string} hex - Hex color code
 * @returns {Object} - { r, g, b }
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

/**
 * Lighten or darken a color
 * @param {string} color - Hex color
 * @param {number} percent - Percent to lighten (positive) or darken (negative)
 * @returns {string}
 */
function adjustColor(color, percent) {
    const rgb = hexToRgb(color);
    if (!rgb) return color;

    const adjust = (value) => {
        const adjusted = value + (percent / 100) * 255;
        return Math.min(255, Math.max(0, Math.round(adjusted)));
    };

    const r = adjust(rgb.r).toString(16).padStart(2, '0');
    const g = adjust(rgb.g).toString(16).padStart(2, '0');
    const b = adjust(rgb.b).toString(16).padStart(2, '0');

    return `#${r}${g}${b}`;
}

// ============================================
// Local Storage Utilities
// ============================================

const STORAGE_PREFIX = 'f1replay_';

/**
 * Save data to local storage
 * @param {string} key 
 * @param {any} value 
 */
function saveToStorage(key, value) {
    try {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (e) {
        console.warn('Failed to save to localStorage:', e);
    }
}

/**
 * Load data from local storage
 * @param {string} key 
 * @param {any} defaultValue 
 * @returns {any}
 */
function loadFromStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(STORAGE_PREFIX + key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
        console.warn('Failed to load from localStorage:', e);
        return defaultValue;
    }
}

/**
 * Remove item from local storage
 * @param {string} key 
 */
function removeFromStorage(key) {
    try {
        localStorage.removeItem(STORAGE_PREFIX + key);
    } catch (e) {
        console.warn('Failed to remove from localStorage:', e);
    }
}

// ============================================
// Miscellaneous Utilities
// ============================================

/**
 * Generate a unique ID
 * @param {string} prefix 
 * @returns {string}
 */
function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sleep/delay function for async operations
 * @param {number} ms - Milliseconds
 * @returns {Promise}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Clamp a value between min and max
 * @param {number} value 
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values
 * @param {number} start 
 * @param {number} end 
 * @param {number} t - Progress (0-1)
 * @returns {number}
 */
function lerp(start, end, t) {
    return start + (end - start) * clamp(t, 0, 1);
}

/**
 * Map a value from one range to another
 * @param {number} value 
 * @param {number} inMin 
 * @param {number} inMax 
 * @param {number} outMin 
 * @param {number} outMax 
 * @returns {number}
 */
function mapRange(value, inMin, inMax, outMin, outMax) {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

/**
 * Check if device is mobile
 * @returns {boolean}
 */
function isMobile() {
    return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * Copy text to clipboard
 * @param {string} text 
 * @returns {Promise<boolean>}
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showSuccess('Copied to clipboard!');
        return true;
    } catch (e) {
        showError('Failed to copy');
        return false;
    }
}

// ============================================
// Export to Global Scope
// ============================================

if (typeof window !== 'undefined') {
    // DOM utilities
    window.$ = $;
    window.$$ = $$;
    window.$$$ = $$$;
    window.createElement = createElement;
    window.clearElement = clearElement;
    window.showElement = showElement;
    window.hideElement = hideElement;
    window.toggleElement = toggleElement;

    // Toast notifications
    window.showToast = showToast;
    window.showSuccess = showSuccess;
    window.showError = showError;
    window.showInfo = showInfo;
    window.showWarning = showWarning;

    // Loading states
    window.showLoading = showLoading;
    window.hideLoading = hideLoading;
    window.updateStatus = updateStatus;

    // Performance
    window.debounce = debounce;
    window.throttle = throttle;
    window.rafThrottle = rafThrottle;

    // Formatting
    window.formatNumber = formatNumber;
    window.formatSpeed = formatSpeed;
    window.formatPercentage = formatPercentage;
    window.formatLapTimeDisplay = formatLapTimeDisplay;
    window.formatDelta = formatDelta;
    window.formatRaceTime = formatRaceTime;

    // Colors
    window.getCSSVar = getCSSVar;
    window.setCSSVar = setCSSVar;
    window.hexToRgb = hexToRgb;
    window.adjustColor = adjustColor;

    // Storage
    window.saveToStorage = saveToStorage;
    window.loadFromStorage = loadFromStorage;
    window.removeFromStorage = removeFromStorage;

    // Misc
    window.generateId = generateId;
    window.sleep = sleep;
    window.clamp = clamp;
    window.lerp = lerp;
    window.mapRange = mapRange;
    window.isMobile = isMobile;
    window.copyToClipboard = copyToClipboard;
}
