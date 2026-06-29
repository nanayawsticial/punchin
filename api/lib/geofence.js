function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  const d = R * c; // in metres
  return d;
}

function isWithinZone(lat, lng, zones) {
  if (!zones || zones.length === 0) {
    return { valid: true, zone: null, distance: 0 };
  }

  let nearestZone = null;
  let minDistance = Infinity;

  for (const zone of zones) {
    if (!zone.isActive) continue;
    const distance = getDistance(lat, lng, zone.latitude, zone.longitude);
    if (distance <= zone.radiusMeters) {
      return { valid: true, zone, distance };
    }
    if (distance < minDistance) {
      minDistance = distance;
      nearestZone = zone;
    }
  }

  return { valid: false, zone: nearestZone, distance: minDistance };
}

module.exports = {
  isWithinZone,
  getDistance
};
