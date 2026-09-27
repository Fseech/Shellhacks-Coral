import React, { useState } from 'react';
import { CoralObservation } from '../types/coral';
import { BarChart3, TrendingUp, ScatterChart, ShieldCheck, Thermometer, ArrowDown } from 'lucide-react';

interface TrendsAnalyticsViewProps {
  observations: CoralObservation[];
  onOpenDetails: (obs: CoralObservation) => void;
}

export const TrendsAnalyticsView: React.FC<TrendsAnalyticsViewProps> = ({
  observations,
  onOpenDetails,
}) => {
  const [hoveredObs, setHoveredObs] = useState<CoralObservation | null>(null);

  // Group by DHW brackets
  const lowStress = observations.filter((o) => o.heatStress.noaaDhw < 4);
  const midStress = observations.filter((o) => o.heatStress.noaaDhw >= 4 && o.heatStress.noaaDhw < 8);
  const highStress = observations.filter((o) => o.heatStress.noaaDhw >= 8);

  const getStats = (group: CoralObservation[]) => {
    const total = group.length || 1;
    const healthy = group.filter((o) => o.aiClassification.status === 'healthy').length;
    const bleached = group.filter((o) => o.aiClassification.status === 'bleached').length;
    const dead = group.filter((o) => o.aiClassification.status === 'dead').length;
    const candidates = group.filter((o) => o.isResilienceCandidate).length;
    return {
      total,
      healthy,
      bleached,
      dead,
      candidates,
      healthyPct: Math.round((healthy / total) * 100),
      bleachedPct: Math.round((bleached / total) * 100),
      deadPct: Math.round((dead / total) * 100),
    };
  };

  const lowStats = getStats(lowStress);
  const midStats = getStats(midStress);
  const highStats = getStats(highStress);

  // Genus breakdown
  const genera = Array.from(new Set(observations.map((o) => o.genus.split(' ')[0])));
  const genusData = genera.map((g) => {
    const subset = observations.filter((o) => o.genus.startsWith(g));
    const healthy = subset.filter((o) => o.aiClassification.status === 'healthy').length;
    const candidates = subset.filter((o) => o.isResilienceCandidate).length;
    return {
      genus: g,
      total: subset.length,
      healthy,
      candidates,
      survivalRate: ((healthy / subset.length) * 100).toFixed(0),
    };
  });

  // Scatter plot geometry: X = Temp (28°C to 33.5°C), Y = Depth (0m to 25m)
  const plotWidth = 600;
  const plotHeight = 320;
  const padding = { top: 20, right: 30, bottom: 40, left: 45 };

  const minTemp = 28.5;
  const maxTemp = 33.5;
  const maxDepth = 22;

  const projectPoint = (temp: number, depth: number) => {
    const x = padding.left + ((temp - minTemp) / (maxTemp - minTemp)) * (plotWidth - padding.left - padding.right);
    const y = padding.top + (depth / maxDepth) * (plotHeight - padding.top - padding.bottom);
    return { x, y };
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-teal-400" />
          <h2 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
            Scientific Trends & Thermal Stratification
          </h2>
        </div>
        <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
          Aggregated correlation between in-situ depth and temperature sensors, NOAA satellite Degree Heating Weeks,
          and AI-classified coral health across all dive survey stations.
        </p>
      </div>

      {/* Grid: DHW Response Bar Chart & Scatter Plot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: DHW Stress Response Breakdown */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-semibold text-sm sm:text-base text-slate-200">
              Coral Health Distribution by NOAA Heat Stress Tier
            </h3>
            <span className="text-xs text-slate-400">Degree Heating Weeks</span>
          </div>

          <div className="space-y-5">
            {/* Low Stress Tier: < 4 DHW */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-300">0 – 4.0 DHW (No Stress / Watch)</span>
                <span className="font-mono text-slate-400">{lowStress.length} colonies</span>
              </div>
              <div className="flex h-5 w-full rounded-lg overflow-hidden bg-slate-800">
                <div style={{ width: `${lowStats.healthyPct}%` }} className="bg-emerald-500 transition-all flex items-center justify-center text-[10px] font-bold text-slate-950" title={`Healthy: ${lowStats.healthyPct}%`}>
                  {lowStats.healthyPct}%
                </div>
                <div style={{ width: `${lowStats.bleachedPct}%` }} className="bg-amber-500 transition-all flex items-center justify-center text-[10px] font-bold text-slate-950" title={`Bleached: ${lowStats.bleachedPct}%`}>
                  {lowStats.bleachedPct}%
                </div>
                <div style={{ width: `${lowStats.deadPct}%` }} className="bg-rose-500 transition-all flex items-center justify-center text-[10px] font-bold text-white" title={`Dead: ${lowStats.deadPct}%`}>
                  {lowStats.deadPct > 0 ? `${lowStats.deadPct}%` : ''}
                </div>
              </div>
              <p className="text-[11px] text-slate-400">Baseline thermal conditions with high overall pigment retention.</p>
            </div>

            {/* Mid Stress Tier: 4 – 8 DHW (Alert Level 1) */}
            <div className="space-y-1.5 rounded-xl border border-amber-500/20 bg-amber-950/10 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-300">4.0 – 8.0 DHW (Alert Level 1 - Bleaching Expected)</span>
                <span className="font-mono text-amber-200 font-bold">{midStress.length} colonies ({midStats.candidates} Candidates)</span>
              </div>
              <div className="flex h-5 w-full rounded-lg overflow-hidden bg-slate-800">
                <div style={{ width: `${midStats.healthyPct}%` }} className="bg-emerald-500 transition-all flex items-center justify-center text-[10px] font-bold text-slate-950" title={`Healthy Candidates: ${midStats.healthyPct}%`}>
                  {midStats.healthyPct}%
                </div>
                <div style={{ width: `${midStats.bleachedPct}%` }} className="bg-amber-500 transition-all flex items-center justify-center text-[10px] font-bold text-slate-950" title={`Bleached: ${midStats.bleachedPct}%`}>
                  {midStats.bleachedPct}%
                </div>
                <div style={{ width: `${midStats.deadPct}%` }} className="bg-rose-500 transition-all flex items-center justify-center text-[10px] font-bold text-white" title={`Dead: ${midStats.deadPct}%`}>
                  {midStats.deadPct > 0 ? `${midStats.deadPct}%` : ''}
                </div>
              </div>
              <p className="text-[11px] text-amber-200/80">
                ⭐ Corals that remain healthy here are designated as <strong>Resilience Candidates</strong>.
              </p>
            </div>

            {/* High Stress Tier: 8+ DHW (Alert Level 2) */}
            <div className="space-y-1.5 rounded-xl border border-rose-500/30 bg-rose-950/10 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-rose-300">8.0+ DHW (Alert Level 2 - Severe Mortality Likely)</span>
                <span className="font-mono text-rose-200 font-bold">{highStress.length} colonies ({highStats.candidates} Extreme Survivors)</span>
              </div>
              <div className="flex h-5 w-full rounded-lg overflow-hidden bg-slate-800">
                <div style={{ width: `${highStats.healthyPct}%` }} className="bg-emerald-500 transition-all flex items-center justify-center text-[10px] font-bold text-slate-950" title={`Surviving Candidates: ${highStats.healthyPct}%`}>
                  {highStats.healthyPct}%
                </div>
                <div style={{ width: `${highStats.bleachedPct}%` }} className="bg-amber-500 transition-all flex items-center justify-center text-[10px] font-bold text-slate-950" title={`Bleached: ${highStats.bleachedPct}%`}>
                  {highStats.bleachedPct}%
                </div>
                <div style={{ width: `${highStats.deadPct}%` }} className="bg-rose-500 transition-all flex items-center justify-center text-[10px] font-bold text-white" title={`Dead: ${highStats.deadPct}%`}>
                  {highStats.deadPct}%
                </div>
              </div>
              <p className="text-[11px] text-rose-200/80">
                Extreme thermal stress. Healthy survivors here represent top global targets for heat-shock genetics.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400 border-t border-slate-800 pt-3">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-emerald-500" />
              <span>Healthy</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-amber-500" />
              <span>Bleached</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-rose-500" />
              <span>Dead</span>
            </span>
          </div>
        </div>

        {/* Right Column: In-situ Temp vs Depth Scatter Plot */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-slate-200">
                In-situ Water Temp (°C) vs. Survey Depth (m)
              </h3>
              <p className="text-xs text-slate-400">
                Telemetry recorded by TSYS01 temperature probe & MS5837 pressure sensor
              </p>
            </div>
          </div>

          <div className="relative aspect-[16/10] w-full rounded-xl bg-slate-950 p-2 border border-slate-800/80">
            <svg viewBox={`0 0 ${plotWidth} ${plotHeight}`} className="h-full w-full">
              {/* Axes & Grid */}
              <g stroke="rgba(255, 255, 255, 0.08)" strokeWidth="0.8">
                {/* Horizontal Depth grid lines */}
                {[0, 5, 10, 15, 20].map((d) => {
                  const y = padding.top + (d / maxDepth) * (plotHeight - padding.top - padding.bottom);
                  return (
                    <g key={d}>
                      <line x1={padding.left} y1={y} x2={plotWidth - padding.right} y2={y} />
                      <text x={padding.left - 6} y={y + 3} fill="rgba(255, 255, 255, 0.4)" fontSize="9" textAnchor="end" fontFamily="monospace">
                        {d}m
                      </text>
                    </g>
                  );
                })}

                {/* Vertical Temp grid lines */}
                {[29.0, 30.0, 31.0, 32.0, 33.0].map((t) => {
                  const x = padding.left + ((t - minTemp) / (maxTemp - minTemp)) * (plotWidth - padding.left - padding.right);
                  return (
                    <g key={t}>
                      <line x1={x} y1={padding.top} x2={x} y2={plotHeight - padding.bottom} />
                      <text x={x} y={plotHeight - padding.bottom + 14} fill="rgba(255, 255, 255, 0.4)" fontSize="9" textAnchor="middle" fontFamily="monospace">
                        {t}°C
                      </text>
                    </g>
                  );
                })}
              </g>

              {/* Axis Labels */}
              <text x={plotWidth / 2} y={plotHeight - 8} fill="rgba(255, 255, 255, 0.6)" fontSize="10" textAnchor="middle">
                Water Temperature (°C)
              </text>
              <text transform={`rotate(-90)`} x={-(plotHeight / 2)} y={14} fill="rgba(255, 255, 255, 0.6)" fontSize="10" textAnchor="middle">
                Depth (meters)
              </text>

              {/* Scatter Points */}
              {observations.map((obs) => {
                const { x, y } = projectPoint(obs.waterTemperatureCelsius, obs.depthMeters);
                const isCand = obs.isResilienceCandidate;
                let fill = '#10b981';
                if (obs.aiClassification.status === 'bleached') fill = '#f59e0b';
                if (obs.aiClassification.status === 'dead') fill = '#f43f5e';

                return (
                  <g
                    key={obs.id}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredObs(obs)}
                    onMouseLeave={() => setHoveredObs(null)}
                    onClick={() => onOpenDetails(obs)}
                  >
                    {isCand && (
                      <circle cx={x} cy={y} r="8" fill="none" stroke="#f59e0b" strokeWidth="1.2" opacity="0.8" />
                    )}
                    <circle
                      cx={x}
                      cy={y}
                      r={isCand ? '5' : '4'}
                      fill={fill}
                      stroke="#ffffff"
                      strokeWidth="1"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip inside chart */}
            {hoveredObs && (
              <div className="absolute top-3 right-3 rounded-lg border border-slate-700 bg-slate-900/95 p-2 text-xs shadow-xl pointer-events-none backdrop-blur-sm">
                <span className="font-mono text-teal-400 font-bold">{hoveredObs.sampleCode}</span>
                <span className="italic text-slate-200 block">{hoveredObs.genus}</span>
                <div className="flex gap-2 text-slate-300 font-mono text-[11px] mt-0.5">
                  <span>{hoveredObs.waterTemperatureCelsius}°C</span>
                  <span>·</span>
                  <span>{hoveredObs.depthMeters}m</span>
                  <span>·</span>
                  <span className="text-amber-400">{hoveredObs.heatStress.noaaDhw} DHW</span>
                </div>
              </div>
            )}
          </div>

          <div className="text-xs text-slate-400">
            Click any scatter point to open full observation telemetry and high-resolution imaging.
          </div>
        </div>
      </div>

      {/* Genus Resilience Tolerance Matrix */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
        <h3 className="font-semibold text-base text-slate-200">
          Taxonomic Genus Tolerance & Resilience Retention
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {genusData.map((item) => (
            <div key={item.genus} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold italic text-slate-100 text-sm">{item.genus}</h4>
                <span className="font-mono text-xs text-slate-400">{item.total} surveyed</span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-400">Candidate Discovery:</span>
                <span className="font-mono text-base font-bold text-amber-400">
                  {item.candidates} colonies
                </span>
              </div>

              <div className="h-1.5 w-full rounded bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-teal-400 rounded"
                  style={{ width: `${item.survivalRate}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Healthy Ratio:</span>
                <span className="font-mono text-teal-300 font-semibold">{item.survivalRate}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
