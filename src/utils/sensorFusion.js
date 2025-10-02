/**
 * Sensor Fusion Utilities with Kalman Filter
 * Combines GPS, Barometer, IMU (Accelerometer + Gyroscope) for accurate positioning
 */

/**
 * Simple 1D Kalman Filter for sensor fusion
 */
export class KalmanFilter {
  constructor(processNoise = 0.01, measurementNoise = 0.1, initialEstimate = 0) {
    this.processNoise = processNoise; // Q - how much we trust our model
    this.measurementNoise = measurementNoise; // R - how much we trust measurements
    this.estimate = initialEstimate; // Current best estimate
    this.errorCovariance = 1; // P - estimation error
  }

  update(measurement) {
    // Prediction step (we assume estimate doesn't change between updates)
    const predictedErrorCovariance = this.errorCovariance + this.processNoise;

    // Update step
    const kalmanGain = predictedErrorCovariance / (predictedErrorCovariance + this.measurementNoise);
    this.estimate = this.estimate + kalmanGain * (measurement - this.estimate);
    this.errorCovariance = (1 - kalmanGain) * predictedErrorCovariance;

    return this.estimate;
  }

  getEstimate() {
    return this.estimate;
  }
}

/**
 * Convert barometric pressure to altitude
 * Uses standard atmospheric pressure model
 *
 * @param {number} pressureHPa - Pressure in hectopascals (hPa)
 * @param {number} seaLevelPressure - Sea level pressure in hPa (default 1013.25)
 * @returns {number} Altitude in meters
 */
export function pressureToAltitude(pressureHPa, seaLevelPressure = 1013.25) {
  // Barometric formula: h = 44330 * (1 - (P/P0)^(1/5.255))
  return 44330 * (1 - Math.pow(pressureHPa / seaLevelPressure, 1 / 5.255));
}

/**
 * Estimate floor number from altitude
 * Assumes average floor height of 3.5 meters (typical for NYC buildings)
 *
 * @param {number} altitudeMeters - Altitude in meters above ground
 * @param {number} groundAltitude - Ground level altitude (default 0)
 * @param {number} floorHeight - Average floor height in meters (default 3.5)
 * @returns {number} Estimated floor number (0 = ground floor)
 */
export function altitudeToFloor(altitudeMeters, groundAltitude = 0, floorHeight = 3.5) {
  const relativeAltitude = altitudeMeters - groundAltitude;
  return Math.max(0, Math.floor(relativeAltitude / floorHeight));
}

/**
 * Multi-sensor Position Fusion
 * Combines GPS, Barometer, and IMU data using Kalman filters
 */
export class PositionFusion {
  constructor() {
    // Kalman filters for each dimension
    this.latFilter = new KalmanFilter(0.001, 0.01, 0); // GPS lat (more trust in measurements)
    this.lngFilter = new KalmanFilter(0.001, 0.01, 0); // GPS lng
    this.altFilter = new KalmanFilter(0.01, 0.05, 0); // Altitude (barometer more reliable)

    // Dead reckoning state
    this.lastPosition = null;
    this.velocity = { x: 0, y: 0, z: 0 };
    this.lastUpdateTime = Date.now();

    // Calibration
    this.seaLevelPressure = 1013.25; // Will be calibrated on first GPS lock
    this.groundAltitude = 0;
  }

  /**
   * Update with GPS data
   */
  updateGPS(latitude, longitude, altitude, accuracy) {
    const fusedLat = this.latFilter.update(latitude);
    const fusedLng = this.lngFilter.update(longitude);

    // Use GPS altitude to calibrate barometer if accuracy is good
    if (accuracy < 20 && altitude) {
      this.groundAltitude = altitude;
    }

    this.lastPosition = { latitude: fusedLat, longitude: fusedLng };
    this.lastUpdateTime = Date.now();

    return { latitude: fusedLat, longitude: fusedLng };
  }

  /**
   * Update with barometer data
   */
  updateBarometer(pressureHPa) {
    const rawAltitude = pressureToAltitude(pressureHPa, this.seaLevelPressure);
    const fusedAltitude = this.altFilter.update(rawAltitude);
    const floor = altitudeToFloor(fusedAltitude, this.groundAltitude);

    return {
      altitude: fusedAltitude,
      relativeAltitude: fusedAltitude - this.groundAltitude,
      floor
    };
  }

  /**
   * Update with IMU data (accelerometer + gyroscope)
   * Implements simple dead reckoning when GPS is lost
   */
  updateIMU(acceleration, rotation) {
    const now = Date.now();
    const dt = (now - this.lastUpdateTime) / 1000; // seconds

    if (!this.lastPosition) return null;

    // Simple integration: v = v0 + a*dt
    // Filter out gravity and noise with high-pass filter
    const ax = Math.abs(acceleration.x) > 0.1 ? acceleration.x : 0;
    const ay = Math.abs(acceleration.y) > 0.1 ? acceleration.y : 0;
    const az = Math.abs(acceleration.z - 9.81) > 0.2 ? acceleration.z - 9.81 : 0; // Remove gravity

    this.velocity.x += ax * dt;
    this.velocity.y += ay * dt;
    this.velocity.z += az * dt;

    // Apply damping (velocity decays without sustained acceleration)
    const damping = 0.9;
    this.velocity.x *= damping;
    this.velocity.y *= damping;
    this.velocity.z *= damping;

    // Dead reckoning position update (very rough approximation)
    // In reality, you'd need proper coordinate transformation based on device orientation
    const latDelta = (this.velocity.y * dt) / 111320; // 1 degree lat ≈ 111.32 km
    const lngDelta = (this.velocity.x * dt) / (111320 * Math.cos(this.lastPosition.latitude * Math.PI / 180));

    return {
      latitude: this.lastPosition.latitude + latDelta,
      longitude: this.lastPosition.longitude + lngDelta,
      isDeadReckoning: true
    };
  }

  /**
   * Get current best position estimate
   */
  getCurrentPosition() {
    return this.lastPosition;
  }

  /**
   * Calibrate sea level pressure using current GPS altitude and barometer reading
   */
  calibrate(gpsAltitude, barometerPressure) {
    // Reverse the barometric formula to find sea level pressure
    // P0 = P / (1 - h/44330)^5.255
    this.seaLevelPressure = barometerPressure / Math.pow(1 - gpsAltitude / 44330, 5.255);
    this.groundAltitude = gpsAltitude;
  }
}

/**
 * Detect movement type from accelerometer data
 * Useful for improving positioning accuracy
 */
export function detectMovementType(accelerometerData) {
  const { x, y, z } = accelerometerData;
  const magnitude = Math.sqrt(x * x + y * y + z * z);

  // Remove gravity (9.81 m/s²)
  const acceleration = Math.abs(magnitude - 9.81);

  // Detect patterns
  if (acceleration < 0.1) return 'stationary';
  if (acceleration < 0.5) return 'walking';
  if (acceleration < 2.0) return 'running';
  if (acceleration > 5.0) return 'elevator'; // Sudden vertical acceleration

  return 'unknown';
}

/**
 * Calculate confidence score for position estimate
 * Based on sensor availability and quality
 */
export function calculatePositionConfidence(sensors) {
  const {
    hasGPS = false,
    gpsAccuracy = 100,
    hasBarometer = false,
    hasIMU = false,
    timeSinceLastGPS = 0
  } = sensors;

  let confidence = 0;

  // GPS contribution (0-50 points)
  if (hasGPS) {
    if (gpsAccuracy < 10) confidence += 50;
    else if (gpsAccuracy < 20) confidence += 40;
    else if (gpsAccuracy < 50) confidence += 30;
    else confidence += 20;
  }

  // Barometer contribution (0-30 points)
  if (hasBarometer) confidence += 30;

  // IMU contribution (0-20 points)
  if (hasIMU) confidence += 20;

  // Penalty for stale GPS (decrease confidence over time)
  const stalePenalty = Math.min(30, timeSinceLastGPS / 1000); // 1 point per second, max 30
  confidence -= stalePenalty;

  return Math.max(0, Math.min(100, confidence));
}
