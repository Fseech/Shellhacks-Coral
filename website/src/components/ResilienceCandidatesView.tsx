import React, { useState } from 'react';
import { CoralObservation } from '../types/coral';
import {
  Sparkles,
  Thermometer,
  ArrowDown,
  Navigation,
  Download,
  AlertCircle,
  Eye,
  SlidersHorizontal,
  Dna,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface ResilienceCandidatesViewProps {
  observations: CoralObservation[];
  onSelectObservation: (obs: CoralObservation) => void;
  onOpenDetails: (obs: CoralObservation) => void;
}

export const ResilienceCandidatesView: React.FC<ResilienceCandidatesViewProps> = ({
  observations,
  onSelectObservation,
  onOpenDetails,
}) => {
  const [sortBy, setSortBy] = useState<'score' | 'dhw' | 'temp'>('score');
  const [selectedForComparison, setSelectedForComparison] = useState<string | null>(null);

  // Filter only resilience candidates
  const candidates = observations.filter((obs) => obs.isResilienceCandidate);

  // Sorted candidates
  const sortedCandidates = [...candidates].sort((a, b) => {
    if (sortBy === 'score') return (b.resilienceScore || 0) - (a.resilienceScore || 0);
    if (sortBy === 'dhw') return b.heatStress.noaaDhw - a.heatStress.noaaDhw;
    if (sortBy === 'temp') return b.waterTemperatureCelsius - a.waterTemperatureCelsius;
    return 0;
  });

  // Calculate summary metrics
  const maxDhwSurvived = Math.max(...candidates.map((c) => c.heatStress.noaaDhw), 0);
  const maxTemp = Math.max(...candidates.map((c) => c.waterTemperatureCelsius), 0);
  const avgDepth = candidates.length
    ? (candidates.reduce((acc, c) => acc + c.depthMeters, 0) / candidates.length).toFixed(1)
    : '0';

  // Pair for comparison: take first candidate and find a bleached colony from the same or nearby region
  const comparisonCandidate = selectedForComparison
    ? candidates.find((c) => c.id === selectedForComparison) || candidates[0]
    : candidates[0];

  const nearbyBleached = observations.find(
    (obs) =>
      obs.aiClassification.status === 'bleached' &&
      (obs.region === comparisonCandidate?.region || obs.heatStress.noaaDhw >= 6)
  );

  const exportCandidatesCsv = () => {
    const headers = [
      'SampleCode',
      'Genus',
      'CommonName',
      'Region',
      'SubRegion',
      'Latitude',
      'Longitude',
      'Depth_m',
      'WaterTemp_C',
      'NOAA_DHW',
      'SST_Anomaly_C',
      'ResilienceScore',
      'AI_Confidence',
      'Timestamp',
    ];

    const rows = candidates.map((c) => [
      c.sampleCode,
      `"${c.genus}"`,
      `"${c.commonName}"`,
      `"${c.region}"`,
      `"${c.subRegion}"`,
      c.latitude,
      c.longitude,
      c.depthMeters,
      c.waterTemperatureCelsius,
      c.heatStress.noaaDhw,
      c.heatStress.seaSurfaceTempAnomaly,
      c.resilienceScore || 0,
      c.aiClassification.confidence,
      c.timestamp,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ReefResilience_Priority_Candidates_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Editorial Header / Principle explanation */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40">
                <Sparkles className="h-4 w-4" />
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
                Resilience Candidate Discovery Queue
              </h2>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              The detection algorithm crosses underwater camera and in-situ sensor telemetry with satellite thermal data:
              <span className="font-semibold text-emerald-300 ml-1">🟢 Healthy Coral Status</span> +
              <span className="font-semibold text-amber-300 ml-1">🔥 Significant NOAA Heat Stress (DHW ≥ 4.0 °C-weeks)</span>.
            </p>

            <div className="flex items-start gap-2 rounded-lg bg-slate-950/80 p-3 text-xs text-amber-200/90 border border-amber-500/20">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <p>
                <strong>Scientific Protocol Note:</strong> Identification flags phenotypic thermal survival under high heat stress.
                It does not prove permanent genetic adaptation alone. Candidates should be prioritized for genomic tissue sampling,
                symbiodiniaceae clade identification, and gamete biobanking.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <button
              onClick={exportCandidatesCsv}
              className="flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export Candidates CSV ({candidates.length})</span>
            </button>
            <div className="text-[11px] text-slate-400 text-center lg:text-right font-mono">
              Ready for GPS Plotter / QGIS
            </div>
          </div>
        </div>

        {/* Aggregate Stats */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-slate-800/80 pt-4">
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
            <span className="text-xs text-slate-400">Total Candidates</span>
            <div className="font-mono text-2xl font-bold text-amber-300">{candidates.length}</div>
            <span className="text-[11px] text-slate-500">Across 5 global reef systems</span>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
            <span className="text-xs text-slate-400">Max DHW Survived</span>
            <div className="font-mono text-2xl font-bold text-rose-400">{maxDhwSurvived.toFixed(1)} °C-wks</div>
            <span className="text-[11px] text-slate-500">NOAA Alert Level 2</span>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
            <span className="text-xs text-slate-400">Peak Water Temp</span>
            <div className="font-mono text-2xl font-bold text-teal-300">{maxTemp.toFixed(1)}°C</div>
            <span className="text-[11px] text-slate-500">In-situ probe reading</span>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
            <span className="text-xs text-slate-400">Average Depth</span>
            <div className="font-mono text-2xl font-bold text-cyan-300">{avgDepth}m</div>
            <span className="text-[11px] text-slate-500">Shallow & mesophotic mix</span>
          </div>
        </div>
      </div>

      {/* Comparative Showcase: Resilient Colony vs Neighboring Bleached Reef */}
      {comparisonCandidate && nearbyBleached && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dna className="h-5 w-5 text-teal-400" />
              <h3 className="font-semibold text-base text-white">
                Field Contrast Analysis: Resilient Candidate vs. Reef Baseline
              </h3>
            </div>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Observed under equivalent high-temperature conditions
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Resilient Colony */}
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  {comparisonCandidate.sampleCode} (Resilience Candidate)
                </span>
                <span className="text-xs font-mono font-bold bg-amber-500 text-slate-950 px-2 py-0.2 rounded">
                  Score {comparisonCandidate.resilienceScore}/100
                </span>
              </div>

              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-950">
                <img
                  src={comparisonCandidate.imageUrl}
                  alt={comparisonCandidate.genus}
                  className="h-full w-full object-cover"
                />
              </div>

              <div>
                <h4 className="font-semibold text-white italic">{comparisonCandidate.genus}</h4>
                <p className="text-xs text-slate-300">{comparisonCandidate.commonName}</p>
                <div className="mt-2 flex items-center gap-2 text-xs font-mono text-slate-300 flex-wrap">
                  <span className="text-teal-300">{comparisonCandidate.waterTemperatureCelsius}°C</span>
                  <span>·</span>
                  <span className="text-cyan-300">{comparisonCandidate.depthMeters}m depth</span>
                  <span>·</span>
                  <span className="text-amber-400 font-bold">{comparisonCandidate.heatStress.noaaDhw} DHW</span>
                </div>
                <p className="mt-2 text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  {comparisonCandidate.researchNotes}
                </p>
              </div>

              <button
                onClick={() => onOpenDetails(comparisonCandidate)}
                className="w-full rounded-lg bg-teal-600/90 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 transition-colors"
              >
                Inspect Telemetry
              </button>
            </div>

            {/* Right: Bleached Colony */}
            <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  {nearbyBleached.sampleCode} (Typical Heat Stress Response)
                </span>
                <span className="text-xs text-amber-300 font-semibold uppercase">
                  Bleached
                </span>
              </div>

              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-slate-950">
                <img
                  src={nearbyBleached.imageUrl}
                  alt={nearbyBleached.genus}
                  className="h-full w-full object-cover"
                />
              </div>

              <div>
                <h4 className="font-semibold text-white italic">{nearbyBleached.genus}</h4>
                <p className="text-xs text-slate-300">{nearbyBleached.commonName}</p>
                <div className="mt-2 flex items-center gap-2 text-xs font-mono text-slate-300 flex-wrap">
                  <span className="text-teal-300">{nearbyBleached.waterTemperatureCelsius}°C</span>
                  <span>·</span>
                  <span className="text-cyan-300">{nearbyBleached.depthMeters}m depth</span>
                  <span>·</span>
                  <span className="text-amber-400 font-bold">{nearbyBleached.heatStress.noaaDhw} DHW</span>
                </div>
                <p className="mt-2 text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  {nearbyBleached.researchNotes}
                </p>
              </div>

              <button
                onClick={() => onOpenDetails(nearbyBleached)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
              >
                Inspect Telemetry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Priority Sort and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-300">Sort Candidates By:</span>
          <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1 text-xs">
            <button
              onClick={() => setSortBy('score')}
              className={`px-2.5 py-1 rounded transition-colors ${
                sortBy === 'score' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Priority Score
            </button>
            <button
              onClick={() => setSortBy('dhw')}
              className={`px-2.5 py-1 rounded transition-colors ${
                sortBy === 'dhw' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Degree Heating Weeks (DHW)
            </button>
            <button
              onClick={() => setSortBy('temp')}
              className={`px-2.5 py-1 rounded transition-colors ${
                sortBy === 'temp' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Water Temperature
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-400">
          Showing <span className="font-mono text-amber-300 font-bold">{sortedCandidates.length}</span> high-priority colonies
        </div>
      </div>

      {/* Candidates Detailed List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedCandidates.map((candidate) => (
          <div
            key={candidate.id}
            className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-amber-500/30 bg-slate-900/60 transition-all hover:border-amber-400 hover:bg-slate-900 shadow-lg"
          >
            <div>
              {/* Photo */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950">
                <img
                  src={candidate.imageUrl}
                  alt={candidate.genus}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />

                <div className="absolute top-2.5 left-2.5 font-mono text-xs font-semibold text-white bg-slate-950/80 px-2 py-0.5 rounded">
                  {candidate.sampleCode}
                </div>

                <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded bg-amber-500 px-2 py-0.5 text-xs font-bold text-slate-950">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Score {candidate.resilienceScore}/100</span>
                </div>

                <div className="absolute bottom-2.5 left-2.5 right-2.5">
                  <h4 className="text-base font-bold text-white italic truncate">
                    {candidate.genus}
                  </h4>
                  <p className="text-xs text-slate-300 truncate">{candidate.commonName}</p>
                </div>
              </div>

              {/* Body */}
              <div className="p-4 space-y-3">
                {/* Location */}
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Navigation className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                  <span className="truncate">{candidate.subRegion}, {candidate.region}</span>
                </div>

                {/* Telemetry Metrics */}
                <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-950/80 p-2.5 text-xs border border-slate-800">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Temp</span>
                    <span className="font-mono font-bold text-teal-300">{candidate.waterTemperatureCelsius}°C</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Depth</span>
                    <span className="font-mono font-bold text-cyan-300">{candidate.depthMeters}m</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Heat Stress</span>
                    <span className="font-mono font-bold text-amber-400">{candidate.heatStress.noaaDhw} DHW</span>
                  </div>
                </div>

                {/* Scientific notes excerpt */}
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                  {candidate.researchNotes}
                </p>

                {/* Priority Tags */}
                {candidate.priorityTags && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {candidate.priorityTags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-medium text-amber-200/90 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t border-slate-800 p-3 bg-slate-950/50 flex items-center gap-2">
              <button
                onClick={() => onOpenDetails(candidate)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-teal-600/90 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 transition-colors"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Examine Telemetry</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
