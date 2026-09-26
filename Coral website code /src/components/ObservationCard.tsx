import React from 'react';
import { CoralObservation } from '../types/coral';
import { CheckCircle2, AlertTriangle, XCircle, Sparkles, Thermometer, ArrowDown, Cpu, ChevronRight } from 'lucide-react';

interface ObservationCardProps {
  observation: CoralObservation;
  isSelected: boolean;
  onSelect: (obs: CoralObservation) => void;
  onOpenDetails: (obs: CoralObservation) => void;
}

export const ObservationCard: React.FC<ObservationCardProps> = ({
  observation,
  isSelected,
  onSelect,
  onOpenDetails,
}) => {
  const { aiClassification, heatStress, isResilienceCandidate } = observation;

  return (
    <div
      onClick={() => onSelect(observation)}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'border-teal-400 bg-slate-900/90 shadow-lg shadow-teal-950/40 ring-1 ring-teal-400'
          : isResilienceCandidate
          ? 'border-amber-500/40 bg-slate-900/70 hover:border-amber-400/80 hover:bg-slate-900'
          : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/80'
      }`}
    >
      <div>
        {/* Coral Photo with Status Indicator */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950">
          <img
            src={observation.imageUrl}
            alt={observation.genus}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Scrim for contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />

          {/* Top Left: Sample Code */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 font-mono text-xs font-semibold text-white/90 bg-slate-950/80 px-2 py-0.5 rounded backdrop-blur-sm">
            <span>{observation.sampleCode}</span>
          </div>

          {/* Top Right: Resilience Candidate Star Banner */}
          {isResilienceCandidate && (
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded bg-amber-500 px-2 py-0.5 text-xs font-bold text-slate-950 shadow-md">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Resilience Candidate</span>
            </div>
          )}

          {/* Bottom Overlay on Image: Taxonomy */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5">
            <h3 className="text-base font-semibold text-white italic truncate">
              {observation.genus}
            </h3>
            <p className="text-xs text-slate-300 truncate">
              {observation.commonName}
            </p>
          </div>
        </div>

        {/* Card Body: Clean Unboxed Metadata */}
        <div className="p-3.5 space-y-3">
          {/* AI Health Classification with dual icon/text */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center gap-1.5">
              {aiClassification.status === 'healthy' && (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wide">
                    Healthy Colony
                  </span>
                </>
              )}
              {aiClassification.status === 'bleached' && (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-300 uppercase tracking-wide">
                    Bleached Colony
                  </span>
                </>
              )}
              {aiClassification.status === 'dead' && (
                <>
                  <XCircle className="h-4 w-4 text-rose-400" />
                  <span className="text-xs font-semibold text-rose-300 uppercase tracking-wide">
                    Dead / Turf Algae
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1 text-xs text-slate-400">
              <span>Confidence:</span>
              <span className="font-mono font-medium text-slate-200">
                {aiClassification.confidence.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Sensor Telemetry & In-situ Data (Unboxed metadata with typographic separators) */}
          <div className="flex items-center gap-2 text-xs text-slate-300 flex-wrap">
            <div className="flex items-center gap-1">
              <ArrowDown className="h-3.5 w-3.5 text-cyan-400" />
              <span className="font-mono text-cyan-200">{observation.depthMeters}m</span>
            </div>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <div className="flex items-center gap-1">
              <Thermometer className="h-3.5 w-3.5 text-teal-400" />
              <span className="font-mono text-teal-200">{observation.waterTemperatureCelsius.toFixed(1)}°C</span>
            </div>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="text-slate-400 truncate max-w-[120px]">
              {observation.subRegion}
            </span>
          </div>

          {/* Satellite Heat Stress Reading */}
          <div className="rounded-lg bg-slate-950/60 p-2 text-xs space-y-1 border border-slate-800/60">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">NOAA Heat Stress:</span>
              <span className={`font-mono font-semibold ${
                heatStress.noaaDhw >= 8 ? 'text-rose-400' : heatStress.noaaDhw >= 4 ? 'text-amber-400' : 'text-slate-300'
              }`}>
                {heatStress.noaaDhw.toFixed(1)} DHW
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Category:</span>
              <span className="text-slate-300 font-medium">{heatStress.heatStressCategory}</span>
            </div>
          </div>

          {/* Hardware Device Fingerprint */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <div className="flex items-center gap-1">
              <Cpu className="h-3 w-3 text-slate-400" />
              <span className="font-mono">{observation.hardware.deviceUnitId}</span>
            </div>
            <span className="truncate max-w-[140px]">{observation.hardware.tempSensorModel.split(' ')[0]}</span>
          </div>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="border-t border-slate-800/80 bg-slate-950/40 p-2.5 flex items-center justify-between">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails(observation);
          }}
          className="w-full flex items-center justify-center gap-1 rounded bg-slate-800/90 py-1.5 text-xs font-medium text-slate-200 hover:bg-teal-600 hover:text-white transition-colors"
        >
          <span>View Telemetry & Analysis</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
