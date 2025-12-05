/**
 * Kalman Filter Implementation
 *
 * Simple 1D Kalman filter for smoothing sensor readings (heading, bearing, etc.)
 * Reduces jitter while maintaining responsiveness to actual changes.
 */

export class KalmanFilter {
    private q: number; // Process noise covariance
    private r: number; // Measurement noise covariance
    private p: number; // Estimation error covariance
    private x: number; // Estimated value

    /**
     * @param q - Process noise (lower = smoother but slower response)
     * @param r - Measurement noise (higher = more smoothing)
     * @param initialValue - Starting value
     */
    constructor(q = 0.1, r = 1.0, initialValue = 0) {
        this.q = q;
        this.r = r;
        this.p = 1.0;
        this.x = initialValue;
    }

    /**
     * Update filter with new measurement
     * @param measurement - New measured value
     * @returns Filtered (smoothed) value
     */
    update(measurement: number): number {
        // Prediction step
        this.p = this.p + this.q;

        // Update step
        const k = this.p / (this.p + this.r); // Kalman gain
        this.x = this.x + k * (measurement - this.x);
        this.p = (1 - k) * this.p;

        return this.x;
    }

    /**
     * Get current filtered value without updating
     */
    getValue(): number {
        return this.x;
    }

    /**
     * Reset filter to new initial state
     */
    reset(initialValue = 0): void {
        this.x = initialValue;
        this.p = 1.0;
    }
}

/**
 * Specialized Kalman filter for angular values (handles 0°/360° wraparound)
 *
 * Essential for compass heading and bearing where 359° and 1° are close together.
 */
export class AngularKalmanFilter extends KalmanFilter {
    /**
     * Update filter with new angle measurement (handles wraparound)
     * @param measurement - Angle in degrees (0-360)
     * @returns Filtered angle in degrees (0-360)
     */
    updateAngle(measurement: number): number {
        const current = this.getValue();

        // Calculate shortest angular distance
        let diff = measurement - current;

        // Handle wraparound: if diff > 180, go the other way
        if (diff > 180) {
            diff -= 360;
        } else if (diff < -180) {
            diff += 360;
        }

        // Update with adjusted measurement
        const adjusted = current + diff;
        const filtered = super.update(adjusted);

        // Normalize result to 0-360 range
        return ((filtered % 360) + 360) % 360;
    }
}

/**
 * Smoothly interpolate between colors based on a value
 * Used for hot/cold color transitions
 */
export function interpolateColor(
    value: number,
    minValue: number,
    maxValue: number,
    coldColor: string,
    warmColor: string,
    hotColor: string,
): string {
    // Normalize value to 0-1
    const normalized = Math.max(
        0,
        Math.min(1, (value - minValue) / (maxValue - minValue)),
    );

    // If < 0.5, interpolate cold -> warm
    // If >= 0.5, interpolate warm -> hot
    if (normalized < 0.5) {
        return lerpColor(coldColor, warmColor, normalized * 2);
    } else {
        return lerpColor(warmColor, hotColor, (normalized - 0.5) * 2);
    }
}

/**
 * Linear interpolation between two hex colors
 */
function lerpColor(color1: string, color2: string, t: number): string {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);

    if (!c1 || !c2) return color1;

    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : null;
}

export default KalmanFilter;
