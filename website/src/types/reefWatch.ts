export interface ReefLocation {
  name: string;
  lat: number;
  lon: number;
  observation_count: number | null;
  sample_id?: string | null;
  sample_taken_at?: string | null;
}

export interface ReefObservation {
  id: string;
  place_name: string;
  taken_at: string;
  device_id: string | null;
  lat: number;
  lon: number;
  image_path: string | null;
  has_image: boolean;
  is_test: boolean;
  coral_type: string | null;
  health: string | null;
  paleness: number | null;
  confidence: number | null;
  reason: string | null;
  dhw: number | null;
  neighbor_count: number | null;
  neighbor_median: number | null;
  verdict: string | null;
  verdict_reason: string | null;
  temp_c: number | null;
  distance_km: number;
}