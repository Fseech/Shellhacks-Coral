// Static build: answers the page's /api/... requests from a data snapshot exported at build time
// (scripts/exportStatic.ts), so the site can be uploaded to any plain web host with no server.
import { REEF_LOCATIONS } from './data/reefLocations';
import type { ReefObservation } from './types/reefWatch';

export const IS_STATIC = import.meta.env.VITE_STATIC === '1';

type Snapshot = Omit<ReefObservation, 'place_name' | 'distance_km'>;
type Location = { name: string; lat: number; lon: number };

let snapshots: Promise<Snapshot[]> | null = null;

function loadSnapshots() {
  snapshots ??= fetch('/data/snapshots.json').then((response) => {
    if (!response.ok) throw new Error('The reef data file is missing from this upload.');
    return response.json() as Promise<Snapshot[]>;
  });
  return snapshots;
}

// same haversine distance the server computes in SQL
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2
    + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
}

function radiusFrom(params: URLSearchParams) {
  const value = Number(params.get('radiusKm'));
  return Number.isFinite(value) && value > 0 ? Math.min(100, Math.max(1, value)) : 10;
}

function locationsFrom(params: URLSearchParams): Location[] {
  const parsed = JSON.parse(params.get('locations') || '[]') as { kind: string; name?: string; lat?: number; lon?: number }[];
  return parsed.flatMap((item): Location[] => {
    if (item.kind === 'place') {
      const place = REEF_LOCATIONS.find((location) => location.name === item.name);
      return place ? [{ name: place.name, lat: place.lat, lon: place.lon }] : [];
    }
    if (typeof item.lat === 'number' && typeof item.lon === 'number') {
      return [{ name: `Coordinates ${item.lat.toFixed(4)}, ${item.lon.toFixed(4)}`, lat: item.lat, lon: item.lon }];
    }
    return [];
  });
}

const newestFirst = (left: Snapshot, right: Snapshot) => right.taken_at.localeCompare(left.taken_at);

export async function staticApi(url: string): Promise<unknown> {
  const { pathname, searchParams } = new URL(url, window.location.origin);
  const rows = await loadSnapshots();

  if (pathname === '/api/places') {
    const radius = radiusFrom(searchParams);
    const places = [...REEF_LOCATIONS].sort((left, right) => left.name.localeCompare(right.name)).map((place) => {
      const nearby = rows.filter((row) => distanceKm(place.lat, place.lon, row.lat, row.lon) <= radius);
      const sample = nearby.filter((row) => row.has_image).sort(newestFirst)[0];
      return { name: place.name, observation_count: nearby.length, sample_id: sample?.id ?? null, sample_taken_at: sample?.taken_at ?? null };
    });
    return { success: true, radiusKm: radius, places };
  }

  if (pathname === '/api/observations') {
    const radius = radiusFrom(searchParams);
    const observations = locationsFrom(searchParams)
      .sort((left, right) => left.name.localeCompare(right.name))
      .flatMap((place) => rows
        .map((row) => ({ ...row, place_name: place.name, distance_km: Math.round(distanceKm(place.lat, place.lon, row.lat, row.lon) * 100) / 100 }))
        .filter((row) => row.distance_km <= radius)
        .sort(newestFirst));
    return { success: true, radiusKm: radius, observations };
  }

  if (pathname === '/api/summary') {
    const count = (test: (row: Snapshot) => boolean) => rows.filter(test).length;
    const paleness = rows.map((row) => row.paleness).filter((value): value is number => value !== null);
    const heat = rows.map((row) => row.dhw).filter((value): value is number => value !== null);
    return {
      success: true,
      summary: {
        total: rows.length,
        healthy: count((row) => row.health === 'healthy'),
        pale: count((row) => row.health === 'pale'),
        bleached: count((row) => row.health === 'bleached'),
        dead_algae: count((row) => row.health === 'dead_algae'),
        not_coral: count((row) => row.health === 'not_coral'),
        candidates: count((row) => row.verdict === 'resistant_candidate'),
        non_heat_stress: count((row) => row.verdict === 'non_heat_stress'),
        avg_paleness: paleness.length ? Math.round((paleness.reduce((total, value) => total + value, 0) / paleness.length) * 10) / 10 : null,
        peak_dhw: heat.length ? Math.max(...heat) : null,
      },
    };
  }

  throw new Error('This part of Reef Watch needs the live server.');
}

export function snapshotImage(id: string, takenAt: string) {
  return IS_STATIC
    ? `/data/images/${encodeURIComponent(id)}.jpg`
    : `/api/observations/${encodeURIComponent(id)}/image?takenAt=${encodeURIComponent(takenAt)}`;
}
