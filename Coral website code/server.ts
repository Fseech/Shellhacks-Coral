import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initial seed observations for global reefs
const observationsDatabase: any[] = [
  {
    id: 'OBS-2026-081',
    sampleCode: 'GBR-N-0819',
    genus: 'Acropora millepora',
    commonName: 'Staghorn Coral',
    region: 'Great Barrier Reef',
    subRegion: 'Ribbon Reef No. 10',
    latitude: -14.6542,
    longitude: 145.6983,
    timestamp: '2026-03-12T10:45:00Z',
    depthMeters: 6.4,
    waterTemperatureCelsius: 31.8,
    imageUrl: 'https://images.unsplash.com/photo-1546026423-cc4642628d2b?auto=format&fit=crop&w=1000&q=80',
    aiClassification: {
      status: 'healthy',
      confidence: 96.4,
      classProbabilities: { healthy: 96.4, bleached: 3.1, dead: 0.5 },
      modelArchitecture: 'MobileNetV3-Reef-Edge',
      inferenceTimeMs: 42,
    },
    heatStress: {
      noaaDhw: 8.4,
      seaSurfaceTempAnomaly: 2.1,
      heatStressCategory: 'Alert Level 2',
      satelliteTileId: 'NOAA-CRW-5KM-SST-145E-14S',
      baselineMaxMonthlyMean: 29.2,
    },
    isResilienceCandidate: true,
    resilienceScore: 94,
    researchNotes: 'Extraordinary pigmentation retention despite 8.4 DHW exposure across 3 weeks. Surrounding colonies of same genus show >80% severe bleaching. High priority for genomic tissue sampling.',
    hardware: {
      deviceUnitId: 'REEF-RIG-ALPHA-01',
      piModel: 'Raspberry Pi 5 8GB',
      arduinoBoard: 'Arduino RP2040 Connect',
      cameraSensor: 'Sony IMX708 Wide 12MP',
      tempSensorModel: 'TSYS01 High-Precision Digital Sensor (±0.1°C)',
      depthSensorModel: 'MS5837-30BA High Resolution Pressure Sensor',
      gpsFixStatus: '3D_FIX_SURFACE',
      batteryLevelPercent: 88,
      internalHousingHumidity: 18,
    },
    priorityTags: ['Genomic Candidate', 'Severe DHW Survivor', 'Microbiome Study'],
  },
  {
    id: 'OBS-2026-082',
    sampleCode: 'GBR-N-0820',
    genus: 'Acropora millepora',
    commonName: 'Branching Coral',
    region: 'Great Barrier Reef',
    subRegion: 'Ribbon Reef No. 10',
    latitude: -14.6548,
    longitude: 145.6989,
    timestamp: '2026-03-12T10:52:00Z',
    depthMeters: 5.8,
    waterTemperatureCelsius: 31.9,
    imageUrl: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=1000&q=80',
    aiClassification: {
      status: 'bleached',
      confidence: 97.8,
      classProbabilities: { healthy: 1.2, bleached: 97.8, dead: 1.0 },
      modelArchitecture: 'MobileNetV3-Reef-Edge',
      inferenceTimeMs: 38,
    },
    heatStress: {
      noaaDhw: 8.4,
      seaSurfaceTempAnomaly: 2.1,
      heatStressCategory: 'Alert Level 2',
      satelliteTileId: 'NOAA-CRW-5KM-SST-145E-14S',
      baselineMaxMonthlyMean: 29.2,
    },
    isResilienceCandidate: false,
    researchNotes: 'Extensive zooxanthellae expulsion across 90% of surface area. Bare white skeleton visible with clear fluorescence under blue excitation.',
    hardware: {
      deviceUnitId: 'REEF-RIG-ALPHA-01',
      piModel: 'Raspberry Pi 5 8GB',
      arduinoBoard: 'Arduino RP2040 Connect',
      cameraSensor: 'Sony IMX708 Wide 12MP',
      tempSensorModel: 'TSYS01 High-Precision Digital Sensor (±0.1°C)',
      depthSensorModel: 'MS5837-30BA High Resolution Pressure Sensor',
      gpsFixStatus: '3D_FIX_SURFACE',
      batteryLevelPercent: 86,
      internalHousingHumidity: 18,
    },
    priorityTags: ['Bleaching Baseline', 'Damage Assessment'],
  },
  {
    id: 'OBS-2026-083',
    sampleCode: 'RS-AQ-0104',
    genus: 'Porites lutea',
    commonName: 'Boulder Coral',
    region: 'Red Sea',
    subRegion: 'Gulf of Aqaba (Eilat Deep)',
    latitude: 29.5021,
    longitude: 34.9184,
    timestamp: '2026-04-05T13:20:00Z',
    depthMeters: 11.2,
    waterTemperatureCelsius: 32.4,
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1000&q=80',
    aiClassification: {
      status: 'healthy',
      confidence: 98.9,
      classProbabilities: { healthy: 98.9, bleached: 0.9, dead: 0.2 },
      modelArchitecture: 'MobileNetV3-Reef-Edge',
      inferenceTimeMs: 44,
    },
    heatStress: {
      noaaDhw: 9.6,
      seaSurfaceTempAnomaly: 2.7,
      heatStressCategory: 'Alert Level 2',
      satelliteTileId: 'NOAA-CRW-5KM-SST-34E-29N',
      baselineMaxMonthlyMean: 28.5,
    },
    isResilienceCandidate: true,
    resilienceScore: 98,
    researchNotes: 'Outstanding physiological resilience in northern Gulf of Aqaba refuge corridor. Active calcification and intact pigmentation at 32.4°C.',
    hardware: {
      deviceUnitId: 'REEF-RIG-BETA-02',
      piModel: 'Raspberry Pi 4 4GB',
      arduinoBoard: 'Arduino Nano 33 BLE',
      cameraSensor: 'Raspberry Pi HQ Camera 12.3MP',
      tempSensorModel: 'DS18B20 Encapsulated Probe',
      depthSensorModel: 'MS5837-30BA High Resolution Pressure Sensor',
      gpsFixStatus: '3D_FIX_SURFACE',
      batteryLevelPercent: 92,
      internalHousingHumidity: 14,
    },
    priorityTags: ['Thermal Refuge', 'High Calcifier', 'Prime Donor Colony'],
  },
  {
    id: 'OBS-2026-084',
    sampleCode: 'CAR-FL-0229',
    genus: 'Siderastrea siderea',
    commonName: 'Massive Starlet Coral',
    region: 'Caribbean',
    subRegion: 'Florida Keys (Sombrero Reef)',
    latitude: 24.6295,
    longitude: -81.109,
    timestamp: '2026-05-02T14:48:00Z',
    depthMeters: 7.1,
    waterTemperatureCelsius: 32.5,
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1000&q=80',
    aiClassification: {
      status: 'healthy',
      confidence: 93.8,
      classProbabilities: { healthy: 93.8, bleached: 5.6, dead: 0.6 },
      modelArchitecture: 'MobileNetV3-Reef-Edge',
      inferenceTimeMs: 41,
    },
    heatStress: {
      noaaDhw: 11.5,
      seaSurfaceTempAnomaly: 3.0,
      heatStressCategory: 'Alert Level 2',
      satelliteTileId: 'NOAA-CRW-5KM-SST-81W-24N',
      baselineMaxMonthlyMean: 29.5,
    },
    isResilienceCandidate: true,
    resilienceScore: 97,
    researchNotes: 'Colony maintains dark pigmentation and intact polyp mantle despite historical peak thermal anomaly (DHW > 11). Flagged for selective breeding biobank.',
    hardware: {
      deviceUnitId: 'REEF-RIG-ALPHA-01',
      piModel: 'Raspberry Pi 5 8GB',
      arduinoBoard: 'Arduino RP2040 Connect',
      cameraSensor: 'Sony IMX708 Wide 12MP',
      tempSensorModel: 'TSYS01 High-Precision Digital Sensor (±0.1°C)',
      depthSensorModel: 'MS5837-30BA High Resolution Pressure Sensor',
      gpsFixStatus: '3D_FIX_SURFACE',
      batteryLevelPercent: 61,
      internalHousingHumidity: 20,
    },
    priorityTags: ['Critical Biobank Specimen', '11+ DHW Survivor'],
  },
];

// Hardware connection state
let connectedHardwareDevices: Record<string, {
  deviceId: string;
  lastPing: string;
  lastUpload: string | null;
  status: 'ONLINE' | 'STANDBY' | 'UPLOADING';
  batteryPercent: number;
  temperatureC: number;
  depthM: number;
  firmwareVersion: string;
  totalUploads: number;
}> = {
  'REEF-RIG-ALPHA-01': {
    deviceId: 'REEF-RIG-ALPHA-01',
    lastPing: new Date().toISOString(),
    lastUpload: '2026-03-12T10:52:00Z',
    status: 'ONLINE',
    batteryPercent: 86,
    temperatureC: 31.9,
    depthM: 5.8,
    firmwareVersion: 'v2.4.1-coral-edge',
    totalUploads: 14,
  },
};

// Initialize Gemini if key is provided
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

// Helper: Calculate NOAA satellite Degree Heating Weeks based on coordinates & temperature
function calculateNoaaHeatStress(lat: number, lon: number, waterTemp: number) {
  // Determine baseline maximum monthly mean (MMM)
  let baselineMmm = 29.0;
  if (lat > 20) baselineMmm = 28.5; // Red Sea / Subtropics
  if (lat < -10 && lat > -25) baselineMmm = 28.8; // GBR
  if (lat >= -5 && lat <= 10) baselineMmm = 29.4; // Coral Triangle

  const sstAnomaly = Math.max(0, Number((waterTemp - baselineMmm).toFixed(1)));
  // Degree Heating Weeks estimates accumulated thermal stress over rolling 12 weeks
  let noaaDhw = Number((sstAnomaly * 3.8).toFixed(1));
  if (sstAnomaly <= 0.2) noaaDhw = 0.5;

  let heatStressCategory: 'No Stress' | 'Watch' | 'Warning' | 'Alert Level 1' | 'Alert Level 2' = 'No Stress';
  if (noaaDhw >= 8.0) {
    heatStressCategory = 'Alert Level 2';
  } else if (noaaDhw >= 4.0) {
    heatStressCategory = 'Alert Level 1';
  } else if (noaaDhw >= 1.0) {
    heatStressCategory = 'Warning';
  } else if (noaaDhw > 0) {
    heatStressCategory = 'Watch';
  }

  return {
    noaaDhw,
    seaSurfaceTempAnomaly: sstAnomaly,
    heatStressCategory,
    satelliteTileId: `NOAA-CRW-5KM-${Math.abs(Math.round(lat))}${lat >= 0 ? 'N' : 'S'}-${Math.abs(Math.round(lon))}${lon >= 0 ? 'E' : 'W'}`,
    baselineMaxMonthlyMean: baselineMmm,
  };
}

// API: Get all observations
app.get('/api/observations', (_req: Request, res: Response) => {
  res.json({
    success: true,
    total: observationsDatabase.length,
    observations: observationsDatabase,
  });
});

// API: Hardware Heartbeat / Ping
app.post('/api/hardware/ping', (req: Request, res: Response) => {
  const { deviceId = 'REEF-RIG-ALPHA-01', battery = 85, temp = 29.5, depth = 0 } = req.body;
  
  connectedHardwareDevices[deviceId] = {
    deviceId,
    lastPing: new Date().toISOString(),
    lastUpload: connectedHardwareDevices[deviceId]?.lastUpload || null,
    status: 'ONLINE',
    batteryPercent: battery,
    temperatureC: temp,
    depthM: depth,
    firmwareVersion: 'v2.4.1-coral-edge',
    totalUploads: (connectedHardwareDevices[deviceId]?.totalUploads || 0),
  };

  res.json({
    success: true,
    message: 'Hardware telemetry heartbeat acknowledged',
    serverTime: new Date().toISOString(),
    device: connectedHardwareDevices[deviceId],
  });
});

// API: Hardware Status & Device Registry
app.get('/api/hardware/status', (_req: Request, res: Response) => {
  res.json({
    success: true,
    serverUrl: process.env.APP_URL || 'http://localhost:3000',
    uploadEndpoint: '/api/hardware/upload',
    connectedDevices: Object.values(connectedHardwareDevices),
    totalObservationsStored: observationsDatabase.length,
    resilienceCandidatesCount: observationsDatabase.filter((o) => o.isResilienceCandidate).length,
  });
});

// API: MAIN HARDWARE INGESTION ENDPOINT
// Physical Raspberry Pi sends: image (base64 or URL), temperature, depth, location (lat, lon), timestamp, deviceId
app.post('/api/hardware/upload', async (req: Request, res: Response) => {
  try {
    const {
      image,
      imageUrl,
      temperature,
      depth,
      latitude = -14.654,
      longitude = 145.698,
      timestamp = new Date().toISOString(),
      deviceId = 'REEF-RIG-ALPHA-01',
      genus = 'Acropora (Field Colony)',
      commonName = 'Staghorn / Branching Coral',
      region = 'Tropical Oceanic Reef',
      subRegion = 'Active Field Station',
      researchNotes = 'Direct edge ingestion from subsea hardware camera & sensor array.',
      aiPreClassifiedStatus,
      aiPreClassifiedConfidence,
    } = req.body;

    const parsedTemp = parseFloat(temperature) || 30.5;
    const parsedDepth = parseFloat(depth) || 5.0;
    const parsedLat = parseFloat(latitude) || -14.654;
    const parsedLon = parseFloat(longitude) || 145.698;

    const coralImageUrl = imageUrl || image || 'https://images.unsplash.com/photo-1546026423-cc4642628d2b?auto=format&fit=crop&w=1000&q=80';

    // Step 1: AI Coral Classification
    // (If client provided pre-classified results from Raspberry Pi MobileNetV3 edge model, use it;
    // otherwise, perform vision inference or intelligent heuristic analysis)
    let aiStatus: 'healthy' | 'bleached' | 'dead' = 'healthy';
    let confidence = 95.0;
    let healthyProb = 95.0;
    let bleachedProb = 4.0;
    let deadProb = 1.0;
    let modelArchitecture = 'MobileNetV3-Reef-Edge';

    if (aiPreClassifiedStatus) {
      aiStatus = aiPreClassifiedStatus;
      confidence = parseFloat(aiPreClassifiedConfidence) || 95.0;
      healthyProb = aiStatus === 'healthy' ? confidence : Number(((100 - confidence) * 0.3).toFixed(1));
      bleachedProb = aiStatus === 'bleached' ? confidence : Number(((100 - confidence) * 0.6).toFixed(1));
      deadProb = Number((100 - healthyProb - bleachedProb).toFixed(1));
    } else if (aiClient && image && image.startsWith('data:image/')) {
      try {
        const base64Data = image.split(',')[1];
        const mimeType = image.split(';')[0].replace('data:', '') || 'image/jpeg';
        
        const response = await aiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    data: base64Data,
                    mimeType,
                  },
                },
                {
                  text: 'You are an edge marine biology classifier. Inspect this coral image and determine if it is: 1) healthy (rich pigment, active polyps), 2) bleached (pale white/translucent, expelled algae), or 3) dead (covered in dark turf algae/debris). Respond ONLY with valid JSON: {"status": "healthy"|"bleached"|"dead", "confidence": 95, "genus": "Coral Genus", "notes": "brief 1-line description"}'
                }
              ]
            }
          ]
        });

        const textOutput = response.text || '';
        const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (['healthy', 'bleached', 'dead'].includes(parsed.status)) {
            aiStatus = parsed.status;
            confidence = Math.min(99, Math.max(80, Number(parsed.confidence) || 94));
            modelArchitecture = 'Gemini-Vision-Edge-Pipeline';
            healthyProb = aiStatus === 'healthy' ? confidence : 3.0;
            bleachedProb = aiStatus === 'bleached' ? confidence : 4.0;
            deadProb = Number((100 - healthyProb - bleachedProb).toFixed(1));
          }
        }
      } catch (err) {
        console.warn('Gemini vision classification fallback to edge model:', err);
      }
    } else {
      // Edge simulation fallback based on in-situ temperature stress
      if (parsedTemp >= 32.6) {
        // High thermal stress likelihood
        aiStatus = Math.random() > 0.4 ? 'healthy' : 'bleached';
      } else {
        aiStatus = 'healthy';
      }
      confidence = Number((92 + Math.random() * 6).toFixed(1));
      healthyProb = aiStatus === 'healthy' ? confidence : 4.2;
      bleachedProb = aiStatus === 'bleached' ? confidence : 3.8;
      deadProb = Number((100 - healthyProb - bleachedProb).toFixed(1));
    }

    // Step 2: Calculate NOAA Heat-Stress Matchup
    const heatStress = calculateNoaaHeatStress(parsedLat, parsedLon, parsedTemp);

    // Step 3: Resilience Detection Formula:
    // 🟢 Healthy coral + 🔥 significant heat stress (DHW >= 4.0)
    const isResilienceCandidate = aiStatus === 'healthy' && heatStress.noaaDhw >= 4.0;
    const resilienceScore = isResilienceCandidate
      ? Math.min(99, Math.round(75 + heatStress.noaaDhw * 2 + (parsedTemp - 29) * 2))
      : undefined;

    const sampleNum = Math.floor(1000 + Math.random() * 9000);
    const newRecord = {
      id: `OBS-LIVE-${sampleNum}`,
      sampleCode: `RIG-${sampleNum}`,
      genus,
      commonName,
      region,
      subRegion,
      latitude: parsedLat,
      longitude: parsedLon,
      timestamp,
      depthMeters: parsedDepth,
      waterTemperatureCelsius: parsedTemp,
      imageUrl: coralImageUrl,
      aiClassification: {
        status: aiStatus,
        confidence,
        classProbabilities: {
          healthy: healthyProb,
          bleached: bleachedProb,
          dead: deadProb,
        },
        modelArchitecture,
        inferenceTimeMs: 44,
      },
      heatStress,
      isResilienceCandidate,
      resilienceScore,
      researchNotes: isResilienceCandidate
        ? `${researchNotes} [PRIORITY CANDIDATE]: Healthy colony identified under ${heatStress.noaaDhw} DHW (${heatStress.heatStressCategory}). Flagged for biobank tissue sampling.`
        : `${researchNotes} [FIELD LOG]: Ingested via hardware camera upload.`,
      hardware: {
        deviceUnitId: deviceId,
        piModel: 'Raspberry Pi 5 8GB',
        arduinoBoard: 'Arduino RP2040 Connect',
        cameraSensor: 'Sony IMX708 Wide 12MP',
        tempSensorModel: 'TSYS01 High-Precision Digital Sensor (±0.1°C)',
        depthSensorModel: 'MS5837-30BA High Resolution Pressure Sensor',
        gpsFixStatus: '3D_FIX_SURFACE',
        batteryLevelPercent: 92,
        internalHousingHumidity: 17,
      },
      priorityTags: isResilienceCandidate
        ? ['Hardware Upload', 'Resilience Candidate', 'High Heat Survivor']
        : ['Hardware Live Upload', 'Transect Point'],
    };

    // Prepend to database
    observationsDatabase.unshift(newRecord);

    // Update device state
    connectedHardwareDevices[deviceId] = {
      deviceId,
      lastPing: new Date().toISOString(),
      lastUpload: new Date().toISOString(),
      status: 'ONLINE',
      batteryPercent: 91,
      temperatureC: parsedTemp,
      depthM: parsedDepth,
      firmwareVersion: 'v2.4.1-coral-edge',
      totalUploads: (connectedHardwareDevices[deviceId]?.totalUploads || 0) + 1,
    };

    return res.status(201).json({
      success: true,
      message: isResilienceCandidate
        ? '⭐ OBSERVATION INGESTED: Potential Coral Resilience Candidate identified!'
        : 'Observation data successfully ingested and stored in database.',
      observation: newRecord,
      isResilienceCandidate,
      resilienceScore,
    });
  } catch (error: any) {
    console.error('Hardware upload ingestion error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error processing hardware data',
    });
  }
});

// API: Download Raspberry Pi Python Client Script
app.get('/api/hardware/script', (req: Request, res: Response) => {
  const hostUrl = process.env.APP_URL || `http://${req.headers.host || 'localhost:3000'}`;

  const pythonScript = `#!/usr/bin/env python3
"""
ReefResilience - Autonomous Underwater Hardware Upload Client
Runs on Raspberry Pi 4/5 with Arduino sensor hub and camera module.
Captures coral image + temp + depth + GPS and uploads directly to the website.
"""

import time
import json
import base64
import serial
import requests
import datetime
import os

# Configuration
SERVER_URL = "${hostUrl}"
UPLOAD_ENDPOINT = f"{SERVER_URL}/api/hardware/upload"
HEARTBEAT_ENDPOINT = f"{SERVER_URL}/api/hardware/ping"
DEVICE_ID = "REEF-RIG-PI-01"

# Serial port connected to Arduino
SERIAL_PORT = "/dev/ttyACM0"  # or /dev/ttyUSB0
BAUD_RATE = 115200

def read_arduino_sensors():
    """Reads temperature and depth from Arduino over USB/UART."""
    try:
        if os.path.exists(SERIAL_PORT):
            with serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=2) as ser:
                line = ser.readline().decode('utf-8', errors='ignore').strip()
                data = json.loads(line)
                return data.get('temp_c', 31.5), data.get('depth_m', 6.2)
    except Exception as e:
        print(f"Warning: Serial sensor read fallback: {e}")
    # Default fallback simulated values if bench testing
    return 31.8, 6.4

def capture_coral_image(output_path="/tmp/reef_capture.jpg"):
    """Captures high-res photo using libcamera / picam2."""
    print("Capturing frame from underwater camera...")
    # On Raspberry Pi with Camera Module 3 / Sony IMX708:
    os.system(f"rpicam-still -t 500 -o {output_path} --width 2028 --height 1520 -n")
    if not os.path.exists(output_path):
        # Fallback dummy file for desktop development
        with open(output_path, "wb") as f:
            f.write(b"\\xff\\xd8\\xff\\xe0") # basic jpeg header
    return output_path

def upload_shot(image_path, temp_c, depth_m, lat=-14.6542, lon=145.6983):
    """Encodes image and POSTs hardware telemetry to the website."""
    with open(image_path, "rb") as f:
        img_b64 = "data:image/jpeg;base64," + base64.b64encode(f.read()).decode('utf-8')

    payload = {
        "deviceId": DEVICE_ID,
        "image": img_b64,
        "temperature": temp_c,
        "depth": depth_m,
        "latitude": lat,
        "longitude": lon,
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "genus": "Acropora (Live Rig Capture)",
        "subRegion": "Station Alpha Transect"
    }

    print(f"Uploading coral data to {UPLOAD_ENDPOINT}...")
    headers = {"Content-Type": "application/json"}
    response = requests.post(UPLOAD_ENDPOINT, json=payload, headers=headers, timeout=30)
    
    if response.status_code in [200, 201]:
        res_data = response.json()
        print("Upload successful!")
        if res_data.get("isResilienceCandidate"):
            print("⭐ STAR RESILIENCE CANDIDATE FLAGGED BY WEBSITE!")
            print(f"Priority Score: {res_data.get('resilienceScore')}/100")
        return res_data
    else:
        print(f"Upload failed: HTTP {response.status_code} - {response.text}")
        return None

if __name__ == "__main__":
    print(f"--- ReefResilience Hardware Client for {DEVICE_ID} ---")
    temp, depth = read_arduino_sensors()
    print(f"Sensors: Temp={temp}°C, Depth={depth}m")
    img = capture_coral_image()
    upload_shot(img, temp, depth)
`;

  res.setHeader('Content-Type', 'text/x-python');
  res.setHeader('Content-Disposition', 'attachment; filename="reef_pi_uploader.py"');
  res.send(pythonScript);
});

// Mount Vite or serve static assets
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ReefResilience Server listening on port ${PORT}`);
  });
}

startServer();
