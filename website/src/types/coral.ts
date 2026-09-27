export type CoralHealth = 'healthy' | 'bleached' | 'dead';

export interface HardwareTelemetry {
  deviceUnitId: string;
  piModel: string;
  arduinoBoard: string;
  cameraSensor: string;
  tempSensorModel: string;
  depthSensorModel: string;
  gpsFixStatus: '3D_FIX_SURFACE' | 'ESTIMATED_TRANSECT_DRFT' | 'SURFACE_BUOY_BEACON';
  batteryLevelPercent: number;
  internalHousingHumidity: number;
  rawAdcReading?: number;
}

export interface HeatStressData {
  noaaDhw: number; // Degree Heating Weeks (°C-weeks)
  seaSurfaceTempAnomaly: number; // °C above climatological maximum
  heatStressCategory: 'No Stress' | 'Watch' | 'Warning' | 'Alert Level 1' | 'Alert Level 2';
  satelliteTileId: string;
  baselineMaxMonthlyMean: number; // °C
}

export interface AIClassification {
  status: CoralHealth;
  confidence: number; // 0 - 100
  classProbabilities: {
    healthy: number;
    bleached: number;
    dead: number;
  };
  modelArchitecture: string; // e.g., "MobileNetV3-Reef-Edge"
  inferenceTimeMs: number;
}

export interface CoralObservation {
  id: string;
  sampleCode: string;
  genus: string;
  commonName: string;
  region: string;
  subRegion: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  depthMeters: number;
  waterTemperatureCelsius: number;
  imageUrl: string;
  aiClassification: AIClassification;
  heatStress: HeatStressData;
  isResilienceCandidate: boolean; // healthy coral + significant heat stress (DHW >= 4.0)
  resilienceScore?: number; // 0 - 100 calculated index for research prioritization
  researchNotes: string;
  hardware: HardwareTelemetry;
  priorityTags: string[];
}

export interface ObservationFilters {
  searchQuery: string;
  region: string;
  healthStatus: CoralHealth | 'all';
  resilienceOnly: boolean;
  minTemp: number;
  maxTemp: number;
  minDepth: number;
  maxDepth: number;
  minDhw: number;
}
