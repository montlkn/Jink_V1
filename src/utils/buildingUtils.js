/**
 * Validates and formats a building name, falling back to address if invalid
 * @param {object} building - Building object with name, title, and des_addres properties
 * @returns {string} - Valid building name or address
 */
export function getBuildingDisplayName(building) {
  if (!building) return 'Unknown Building';
  
  // Try name first
  const name = building.name || building.title || '';
  
  // Check if name is valid (not "0", not empty, and meaningful length)
  const isValidName = name && 
    name !== '0' && 
    name.trim().length > 1 &&
    !/^\d+$/.test(name.trim()); // Not just numbers
  
  if (isValidName) {
    return name;
  }
  
  // Fall back to address
  const address = building.des_addres || building.address || '';
  if (address && address.trim().length > 0) {
    return address;
  }
  
  return 'Unknown Building';
}

/**
 * Calculate distance in kilometers between two points
 * @param {{lat:number, lng:number}} from
 * @param {{lat:number, lng:number}} to
 * @returns {number} Distance in kilometers
 */
export function haversineDistance(from, to) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Format distance for display in feet/miles
 * @param {number} km - Distance in kilometers
 * @returns {string} Formatted distance string
 */
export function formatDistance(km) {
  if (!Number.isFinite(km)) return '';
  
  const feet = km * 3280.84; // Convert km to feet
  
  // Show in feet for distances under 0.5 miles (2640 feet)
  if (feet < 2640) {
    return `${Math.round(feet)} ft`;
  }
  
  // Otherwise show in miles for longer distances
  const miles = km * 0.621371;
  return `${miles.toFixed(1)} mi`;
}

/**
 * Calculate ETA based on walking speed
 * @param {number} km - Distance in kilometers
 * @param {number} speedKmh - Walking speed in km/h (default 4.5)
 * @returns {string} Formatted ETA string
 */
export function calculateWalkingETA(km, speedKmh = 4.5) {
  if (!Number.isFinite(km)) return '';
  
  const minutes = Math.round((km / speedKmh) * 60);
  
  if (minutes < 1) {
    return '< 1 min';
  }
  
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${mins}m`;
}

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}
