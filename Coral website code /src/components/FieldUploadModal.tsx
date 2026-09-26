import React, { useState } from 'react';
import { CoralObservation, CoralHealth } from '../types/coral';
import { X, Cpu, UploadCloud, Sparkles, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

interface FieldUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddObservation: (newObs: CoralObservation) => void;
}

const PRESET_CORALS = [
  {
    name: 'Acropora millepora (Healthy Variant)',
    genus: 'Acropora millepora',
    commonName: 'Staghorn Coral',
    url: 'https://images.unsplash.com/photo-1546026423-cc4642628d2b?auto=format&fit=crop&w=1000&q=80',
    typicalHealth: 'healthy' as CoralHealth,
  },
  {
    name: 'Acropora cervicornis (Bleached Head)',
    genus: 'Acropora cervicornis',
    commonName: 'Staghorn Coral',
    url: 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=1000&q=80',
    typicalHealth: 'bleached' as CoralHealth,
  },
  {
    name: 'Porites lutea (Massive Boulder)',
    genus: 'Porites lutea',
    commonName: 'Boulder Coral',
    url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1000&q=80',
    typicalHealth: 'healthy' as CoralHealth,
  },
  {
    name: 'Pocillopora verrucosa (Thermal Survivor)',
    genus: 'Pocillopora verrucosa',
    commonName: 'Cauliflower Coral',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80',
    typicalHealth: 'healthy' as CoralHealth,
  },
];

export const FieldUploadModal: React.FC<FieldUploadModalProps> = ({
  isOpen,
  onClose,
  onAddObservation,
}) => {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [customImageUrl, setCustomImageUrl] = useState<string>('');
  const [genus, setGenus] = useState<string>('Acropora millepora');
  const [commonName, setCommonName] = useState<string>('Staghorn Coral');
  const [region, setRegion] = useState<string>('Great Barrier Reef');
  const [subRegion, setSubRegion] = useState<string>('Osprey Reef Pinnacle');
  const [latitude, setLatitude] = useState<number>(-13.912);
  const [longitude, setLongitude] = useState<number>(146.612);
  const [waterTemp, setWaterTemp] = useState<number>(31.9);
  const [depth, setDepth] = useState<number>(7.5);
  const [simulatedDhw, setSimulatedDhw] = useState<number>(7.8);
  const [researchNotes, setResearchNotes] = useState<string>(
    'Field transect specimen observed during midday low tide. Intense solar radiation and high thermal anomaly.'
  );

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processedResult, setProcessedResult] = useState<CoralObservation | null>(null);

  if (!isOpen) return null;

  const handlePresetChange = (idx: number) => {
    setSelectedPresetIndex(idx);
    setGenus(PRESET_CORALS[idx].genus);
    setCommonName(PRESET_CORALS[idx].commonName);
  };

  const handleRunInference = async () => {
    setIsProcessing(true);
    setProcessedResult(null);

    const activePreset = PRESET_CORALS[selectedPresetIndex];
    const imgUrl = customImageUrl.trim() || activePreset.url;

    try {
      const response = await fetch('/api/hardware/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: 'REEF-RIG-DELTA-04',
          imageUrl: imgUrl,
          temperature: waterTemp,
          depth: depth,
          latitude: latitude,
          longitude: longitude,
          genus: genus,
          commonName: commonName,
          region: region,
          subRegion: subRegion,
          researchNotes: researchNotes,
          aiPreClassifiedStatus: activePreset.typicalHealth,
          aiPreClassifiedConfidence: 95.8,
        }),
      });

      const data = await response.json();
      if (data.success && data.observation) {
        setProcessedResult(data.observation);
      } else {
        throw new Error(data.error || 'Server ingestion failed');
      }
    } catch (err) {
      console.warn('Backend upload fallback to local state:', err);
      // Fallback local creation if offline
      const status: CoralHealth = activePreset.typicalHealth;
      const isResilienceCandidate = status === 'healthy' && simulatedDhw >= 4.0;
      const randomIdSuffix = Math.floor(100 + Math.random() * 900);
      const fallbackObs: CoralObservation = {
        id: `OBS-SIM-${randomIdSuffix}`,
        sampleCode: `EXP-${region.slice(0, 3).toUpperCase()}-${randomIdSuffix}`,
        genus,
        commonName,
        region,
        subRegion,
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
        depthMeters: depth,
        waterTemperatureCelsius: waterTemp,
        imageUrl: imgUrl,
        aiClassification: {
          status,
          confidence: 96.0,
          classProbabilities: { healthy: 96.0, bleached: 3.5, dead: 0.5 },
          modelArchitecture: 'MobileNetV3-Reef-Edge',
          inferenceTimeMs: 41,
        },
        heatStress: {
          noaaDhw: simulatedDhw,
          seaSurfaceTempAnomaly: Number(((simulatedDhw / 4) * 1.2).toFixed(1)),
          heatStressCategory: simulatedDhw >= 8 ? 'Alert Level 2' : 'Alert Level 1',
          satelliteTileId: `NOAA-CRW-5KM-SIM-${Math.round(longitude)}E`,
          baselineMaxMonthlyMean: 29.0,
        },
        isResilienceCandidate,
        resilienceScore: isResilienceCandidate ? 92 : undefined,
        researchNotes,
        hardware: {
          deviceUnitId: 'REEF-RIG-DELTA-04',
          piModel: 'Raspberry Pi 5 8GB',
          arduinoBoard: 'Arduino RP2040 Connect',
          cameraSensor: 'Sony IMX708 Wide 12MP',
          tempSensorModel: 'TSYS01 High-Precision Digital Sensor (±0.1°C)',
          depthSensorModel: 'MS5837-30BA High Resolution Pressure Sensor',
          gpsFixStatus: '3D_FIX_SURFACE',
          batteryLevelPercent: 94,
          internalHousingHumidity: 16,
        },
        priorityTags: isResilienceCandidate
          ? ['Simulated Discovery', 'High Heat Survivor']
          : ['Simulated Transect Record'],
      };
      setProcessedResult(fallbackObs);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCommitToDatabase = () => {
    if (!processedResult) return;
    onAddObservation(processedResult);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-teal-400" />
            <h3 className="font-semibold text-white text-base">
              Simulate Dive Shutter & Edge AI Inference
            </h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5 space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Test the physical device pipeline: select an optical camera specimen, input underwater depth
            and temperature sensors, fetch simulated NOAA Degree Heating Weeks, and observe the AI candidate decision.
          </p>

          {/* Preset Coral Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Select Optical Camera Shot (or supply custom URL):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_CORALS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePresetChange(idx)}
                  className={`text-left rounded-lg border p-1.5 text-xs transition-all ${
                    selectedPresetIndex === idx && !customImageUrl
                      ? 'border-teal-400 bg-teal-950/50 ring-1 ring-teal-400'
                      : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                  }`}
                >
                  <img src={preset.url} alt={preset.name} className="h-16 w-full object-cover rounded mb-1" />
                  <p className="font-medium text-[11px] text-white truncate italic">{preset.genus}</p>
                  <span className="text-[10px] text-slate-400">{preset.typicalHealth}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom image option */}
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Custom Coral Image URL (optional):</label>
            <input
              type="text"
              placeholder="https://..."
              value={customImageUrl}
              onChange={(e) => setCustomImageUrl(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-1.5 px-3 text-xs text-slate-200 focus:border-teal-500 focus:outline-none"
            />
          </div>

          {/* Sensor Telemetry Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            {/* Water Temp */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Water Temp (TSYS01):</span>
                <span className="font-mono text-teal-400 font-bold">{waterTemp.toFixed(1)}°C</span>
              </div>
              <input
                type="range"
                min="27.0"
                max="34.0"
                step="0.1"
                value={waterTemp}
                onChange={(e) => setWaterTemp(parseFloat(e.target.value))}
                className="w-full accent-teal-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Depth */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Depth (MS5837):</span>
                <span className="font-mono text-cyan-400 font-bold">{depth.toFixed(1)}m</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="30.0"
                step="0.5"
                value={depth}
                onChange={(e) => setDepth(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Satellite DHW */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">NOAA Satellite DHW:</span>
                <span className="font-mono text-amber-400 font-bold">{simulatedDhw.toFixed(1)} DHW</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="12.0"
                step="0.5"
                value={simulatedDhw}
                onChange={(e) => setSimulatedDhw(parseFloat(e.target.value))}
                className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Region and Location */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-400">Reef Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-200"
              >
                <option value="Great Barrier Reef">Great Barrier Reef</option>
                <option value="Coral Triangle">Coral Triangle</option>
                <option value="Red Sea">Red Sea</option>
                <option value="Caribbean">Caribbean</option>
                <option value="Hawaii & Pacific">Hawaii & Pacific</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-slate-400">Sub-Region / Reef Name</label>
              <input
                type="text"
                value={subRegion}
                onChange={(e) => setSubRegion(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-200"
              />
            </div>
          </div>

          {/* Run Inference Button */}
          {!processedResult && (
            <button
              onClick={handleRunInference}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-sm font-bold text-white hover:bg-teal-500 transition-colors disabled:opacity-50"
            >
              <Cpu className="h-4 w-4" />
              <span>{isProcessing ? 'Processing Edge Model (MobileNetV3)...' : 'Run Edge AI & Match Heat Stress'}</span>
            </button>
          )}

          {/* Inference Output Card */}
          {processedResult && (
            <div className="rounded-xl border border-teal-500/40 bg-teal-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-teal-800/40 pb-2">
                <span className="font-mono text-xs text-teal-300 font-semibold">
                  Inference Complete ({processedResult.aiClassification.inferenceTimeMs}ms)
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Result: {processedResult.aiClassification.status} ({processedResult.aiClassification.confidence}%)
                </span>
              </div>

              {processedResult.isResilienceCandidate ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 bg-amber-950/60 p-2.5 rounded-lg border border-amber-500/30">
                  <Sparkles className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>
                    ⭐ FLAGGED AS RESILIENCE CANDIDATE! Survived {processedResult.heatStress.noaaDhw} DHW
                    (Priority Score: {processedResult.resilienceScore}/100)
                  </span>
                </div>
              ) : (
                <div className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  Standard observation. Heat stress level: {processedResult.heatStress.heatStressCategory}.
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleCommitToDatabase}
                  className="flex-1 rounded-lg bg-teal-500 py-2 text-xs font-bold text-slate-950 hover:bg-teal-400 transition-colors"
                >
                  Save to Global Observation Dataset
                </button>
                <button
                  onClick={() => setProcessedResult(null)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs text-slate-300 hover:text-white"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
