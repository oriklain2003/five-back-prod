export interface Radar {
  name: string;
  position: {
    lat: number;
    lng: number;
  };
  range: number; // in meters
}

export const RADARS: Radar[] = [
  {
    name: 'north',
    position: {
      lat: 32.916485,
      lng: 35.354004,
    },
    range: 250000, // 250km in meters
  },
  {
    name: 'center',
    position: {
      lat: 32.157012,
      lng: 34.870605,
    },
    range: 250000,
  },
  {
    name: 'south',
    position: {
      lat: 30.642638,
      lng: 34.942017,
    },
    range: 250000,
  },
];

/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 Latitude of point 1 in degrees
 * @param lng1 Longitude of point 1 in degrees
 * @param lat2 Latitude of point 2 in degrees
 * @param lng2 Longitude of point 2 in degrees
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Get list of radars that can detect an object at given position
 * @param lng Longitude of object
 * @param lat Latitude of object
 * @returns Array of radar names that detect the object
 */
export function getDetectingRadars(lng: number, lat: number): string[] {
  const detectingRadars: string[] = [];

  for (const radar of RADARS) {
    const distance = calculateDistance(
      lat,
      lng,
      radar.position.lat,
      radar.position.lng,
    );

    if (distance <= radar.range) {
      detectingRadars.push(radar.name);
    }
  }

  return detectingRadars;
}

