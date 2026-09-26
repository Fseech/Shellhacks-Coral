import React, { useState } from 'react';
import { CoralObservation } from '../types/coral';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Thermometer,
  ArrowDown,
  Navigation,
  Cpu,
  Layers,
  Calendar,
  Copy,
  Check,
  Download,
  ShieldCheck,
  Activity,
  Maximize2
} from 'lucide-react';

interface ObservationDetailModalProps {
  observation: CoralObservation | null;
  onClose: () => void;
}

export const ObservationDetailModal: React.FC<ObservationDetailModalProps> = ({
  observation,
  onClose,
}) => {
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [showAiOverlay, setShowAiOverlay] = useState(false);
  const [flaggedForBiobank, setFlaggedForBiobank] = useState(false);

  if (!observation) return null;

  const { aiClassification, heatStress, hardware, isResilienceCandidate } = observation;

  const copyCoordinates = () => {
    const text = `${observation.latitude.toFixed(6)}, ${observation.longitude.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  const downloadObservationJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(observation, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${observation.sampleCode}-ReefResilience.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-semibold text-teal-400 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800/60">
              {observation.sampleCode}
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-sm font-semibold text-white">
              Marine Telemetry & AI Diagnostic
            </span>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Top Banner: Resilience Status */}
          {isResilienceCandidate ? (
            <div className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/50 via-slate-900 to-amber-950/30 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-amber-200 text-sm sm:text-base">
                        Potential Coral Resilience Candidate
                      </h4>
                      <span className="font-mono text-xs bg-amber-500 text-slate-950 px-2 py-0.2 rounded font-bold">
                        Score {observation.resilienceScore}/100
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-amber-200/80 leading-relaxed">
                      This colony maintains intact pigmentation and active calcification despite exposure to{' '}
                      <strong>{heatStress.noaaDhw.toFixed(1)} Degree Heating Weeks</strong> ({heatStress.heatStressCategory}).
                      Surrounding colonies experienced widespread bleaching.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setFlaggedForBiobank(!flaggedForBiobank)}
                  className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    flaggedForBiobank
                      ? 'bg-amber-400 text-slate-950'
                      : 'border border-amber-400/50 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>{flaggedForBiobank ? 'Flagged for Biobank' : 'Flag for Biobank'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-teal-400" />
                <span>Standard Reef Survey Record</span>
                <span>·</span>
                <span>Category: {heatStress.heatStressCategory}</span>
              </div>
              <span className="text-slate-500 font-mono">DHW: {heatStress.noaaDhw.toFixed(1)} °C-weeks</span>
            </div>
          )}

          {/* Image & Primary Taxonomy Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Visualizer Frame */}
            <div className="lg:col-span-6 space-y-2">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                <img
                  src={observation.imageUrl}
                  alt={observation.genus}
                  className="h-full w-full object-cover"
                />

                {/* AI Mask Overlay Toggle */}
                {showAiOverlay && (
                  <div className="absolute inset-0 bg-teal-950/40 backdrop-blur-[0.5px] p-4 flex flex-col justify-between border-2 border-dashed border-teal-400/70">
                    <div className="flex justify-between items-start">
                      <div className="rounded bg-slate-950/90 p-2 text-xs border border-teal-500/40">
                        <span className="text-teal-300 font-mono font-semibold block">AI SEGMENTATION MASK</span>
                        <span className="text-slate-300 text-[11px]">Polyp Density: 94.2%</span>
                        <span className="text-slate-300 text-[11px] block">Chlorophyll Index: Normal</span>
                      </div>
                      <div className="rounded bg-emerald-500/90 text-slate-950 font-bold px-2 py-0.5 text-xs font-mono">
                        {aiClassification.status.toUpperCase()}
                      </div>
                    </div>

                    <div className="rounded bg-slate-950/90 p-2 text-[11px] text-slate-300 border border-teal-500/40">
                      Edge Model: {aiClassification.modelArchitecture} · {aiClassification.inferenceTimeMs}ms inference
                    </div>
                  </div>
                )}

                <div className="absolute bottom-2.5 right-2.5 flex items-center gap-2">
                  <button
                    onClick={() => setShowAiOverlay(!showAiOverlay)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium backdrop-blur-md transition-colors ${
                      showAiOverlay
                        ? 'bg-teal-500 text-slate-950 font-bold'
                        : 'bg-slate-950/80 text-teal-300 border border-teal-500/40 hover:bg-slate-900'
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>{showAiOverlay ? 'Mask Active' : 'Toggle AI Mask'}</span>
                  </button>
                </div>
              </div>

              {/* Observation Timestamp and Camera Info */}
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>{new Date(observation.timestamp).toUTCString()}</span>
                </div>
                <span className="font-mono text-slate-400">{hardware.cameraSensor}</span>
              </div>
            </div>

            {/* Scientific Details Column */}
            <div className="lg:col-span-6 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-teal-400 font-semibold">
                    Species Classification
                  </span>
                  <div className="flex items-center gap-1 text-xs">
                    {aiClassification.status === 'healthy' && (
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                        <CheckCircle2 className="h-4 w-4" /> Healthy ({aiClassification.confidence.toFixed(1)}%)
                      </span>
                    )}
                    {aiClassification.status === 'bleached' && (
                      <span className="flex items-center gap-1 text-amber-400 font-semibold">
                        <AlertTriangle className="h-4 w-4" /> Bleached ({aiClassification.confidence.toFixed(1)}%)
                      </span>
                    )}
                    {aiClassification.status === 'dead' && (
                      <span className="flex items-center gap-1 text-rose-400 font-semibold">
                        <XCircle className="h-4 w-4" /> Dead ({aiClassification.confidence.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="mt-1 text-2xl font-bold italic text-white">
                  {observation.genus}
                </h3>
                <p className="text-sm text-slate-300">{observation.commonName}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {observation.subRegion}, {observation.region}
                </p>
              </div>

              {/* Coordinates Card */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-teal-400" />
                  <div className="font-mono text-xs text-slate-200">
                    <span>{observation.latitude.toFixed(5)}°</span>, <span>{observation.longitude.toFixed(5)}°</span>
                  </div>
                </div>
                <button
                  onClick={copyCoordinates}
                  className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:text-white transition-colors"
                >
                  {copiedCoords ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedCoords ? 'Copied' : 'Copy GPS'}</span>
                </button>
              </div>

              {/* In-situ Environmental Measurements */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Thermometer className="h-4 w-4 text-teal-400" />
                    <span>In-situ Water Temp</span>
                  </div>
                  <div className="font-mono text-xl font-bold text-teal-200">
                    {observation.waterTemperatureCelsius.toFixed(1)}°C
                  </div>
                  <p className="text-[11px] text-slate-400">Probe: {hardware.tempSensorModel.split(' ')[0]}</p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <ArrowDown className="h-4 w-4 text-cyan-400" />
                    <span>Dive Depth</span>
                  </div>
                  <div className="font-mono text-xl font-bold text-cyan-200">
                    {observation.depthMeters.toFixed(1)}m
                  </div>
                  <p className="text-[11px] text-slate-400">Sensor: MS5837-30BA</p>
                </div>
              </div>

              {/* AI Class Probability Breakdown */}
              <div className="space-y-1.5 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <span className="text-xs font-semibold text-slate-300">
                  AI Edge Classifier Confidence Distribution
                </span>
                <div className="space-y-1.5 pt-1 text-xs font-mono">
                  <div>
                    <div className="flex justify-between text-slate-400 mb-0.5">
                      <span>Healthy</span>
                      <span className="text-emerald-400">{aiClassification.classProbabilities.healthy}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded"
                        style={{ width: `${aiClassification.classProbabilities.healthy}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 mb-0.5">
                      <span>Bleached</span>
                      <span className="text-amber-400">{aiClassification.classProbabilities.bleached}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded"
                        style={{ width: `${aiClassification.classProbabilities.bleached}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 mb-0.5">
                      <span>Dead / Macroalgae</span>
                      <span className="text-rose-400">{aiClassification.classProbabilities.dead}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded"
                        style={{ width: `${aiClassification.classProbabilities.dead}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dual Column: NOAA Heat-Stress Matchup & Hardware Rig Telemetry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* NOAA Satellite Data */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="font-semibold text-sm text-slate-200">
                  NOAA Satellite Heat-Stress Matchup
                </h4>
                <span className="text-xs text-slate-400">Coral Reef Watch 5km</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400">Degree Heating Weeks:</span>
                  <div className="font-mono text-base font-bold text-amber-400">
                    {heatStress.noaaDhw.toFixed(1)} °C-weeks
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">SST Anomaly:</span>
                  <div className="font-mono text-base font-bold text-rose-400">
                    +{heatStress.seaSurfaceTempAnomaly.toFixed(1)}°C
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Stress Category:</span>
                  <div className="font-medium text-slate-200">
                    {heatStress.heatStressCategory}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Climatological Max:</span>
                  <div className="font-mono text-slate-300">
                    {heatStress.baselineMaxMonthlyMean}°C
                  </div>
                </div>
              </div>

              <div className="text-[11px] font-mono text-slate-500 border-t border-slate-800/80 pt-2">
                Tile ID: {heatStress.satelliteTileId}
              </div>
            </div>

            {/* Hardware Rig Telemetry */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-1.5">
                  <Cpu className="h-4 w-4 text-teal-400" />
                  <h4 className="font-semibold text-sm text-slate-200">
                    Hardware Deployment Rig
                  </h4>
                </div>
                <span className="font-mono text-xs text-teal-400">{hardware.deviceUnitId}</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div>
                  <span className="text-slate-400">Compute Unit:</span>
                  <p className="font-medium text-slate-200">{hardware.piModel}</p>
                </div>
                <div>
                  <span className="text-slate-400">Sensor Interface:</span>
                  <p className="font-medium text-slate-200">{hardware.arduinoBoard}</p>
                </div>
                <div>
                  <span className="text-slate-400">GPS Status:</span>
                  <p className="font-mono text-emerald-400">{hardware.gpsFixStatus}</p>
                </div>
                <div>
                  <span className="text-slate-400">Rig Battery:</span>
                  <p className="font-mono text-slate-200">{hardware.batteryLevelPercent}% (Housing {hardware.internalHousingHumidity}% RH)</p>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                Temperature probe: {hardware.tempSensorModel}
              </div>
            </div>
          </div>

          {/* Research Notes & Field Assessment */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
            <h4 className="font-semibold text-sm text-slate-200">
              Marine Biologist Field Notes & Assessment
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {observation.researchNotes}
            </p>
            {observation.priorityTags && observation.priorityTags.length > 0 && (
              <div className="flex items-center gap-2 pt-2 flex-wrap">
                <span className="text-xs text-slate-400 font-medium">Research Tags:</span>
                {observation.priorityTags.map((tag, i) => (
                  <span key={i} className="text-xs text-teal-300 bg-teal-950/70 px-2 py-0.5 rounded border border-teal-800/60 font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-5 py-3">
          <div className="text-xs text-slate-400">
            Observation record: <span className="font-mono text-slate-300">{observation.id}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadObservationJson}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Record JSON</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg bg-teal-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
