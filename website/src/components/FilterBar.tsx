import React from 'react';
import { Search, RotateCcw, Filter, CheckCircle2, AlertTriangle, XCircle, Sparkles } from 'lucide-react';
import { CoralHealth, ObservationFilters } from '../types/coral';

interface FilterBarProps {
  filters: ObservationFilters;
  setFilters: React.Dispatch<React.SetStateAction<ObservationFilters>>;
  regions: string[];
  totalCount: number;
  filteredCount: number;
  candidateCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  setFilters,
  regions,
  totalCount,
  filteredCount,
  candidateCount,
}) => {
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const resetFilters = () => {
    setFilters({
      searchQuery: '',
      region: 'all',
      healthStatus: 'all',
      resilienceOnly: false,
      minTemp: 26,
      maxTemp: 35,
      minDepth: 0,
      maxDepth: 40,
      minDhw: 0,
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      {/* Top row: Search, Health Segmented Selector, Resilience Candidate Toggle */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search genus, site, sample code (e.g. Acropora, GBR, 0819)..."
            value={filters.searchQuery}
            onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
            className="w-full rounded-lg border border-slate-700 bg-slate-950/80 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* Health Segmented Control */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/90 p-1">
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, healthStatus: 'all' }))}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              filters.healthStatus === 'all'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All States
          </button>
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, healthStatus: 'healthy' }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              filters.healthStatus === 'healthy'
                ? 'bg-emerald-950/80 text-emerald-300 ring-1 ring-emerald-500/40 font-semibold'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>Healthy</span>
          </button>
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, healthStatus: 'bleached' }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              filters.healthStatus === 'bleached'
                ? 'bg-amber-950/80 text-amber-300 ring-1 ring-amber-500/40 font-semibold'
                : 'text-slate-400 hover:text-amber-400'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <span>Bleached</span>
          </button>
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, healthStatus: 'dead' }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              filters.healthStatus === 'dead'
                ? 'bg-rose-950/80 text-rose-300 ring-1 ring-rose-500/40 font-semibold'
                : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            <XCircle className="h-3.5 w-3.5 text-rose-400" />
            <span>Dead</span>
          </button>
        </div>

        {/* Resilience Candidates Toggle */}
        <button
          type="button"
          onClick={() => setFilters((prev) => ({ ...prev, resilienceOnly: !prev.resilienceOnly }))}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all ${
            filters.resilienceOnly
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
          }`}
          title="Filter for healthy corals surviving significant NOAA heat stress (DHW >= 4)"
        >
          <Sparkles className="h-4 w-4" />
          <span>Resilience Candidates</span>
          <span className={`rounded px-1.5 py-0.2 font-mono text-xs ${
            filters.resilienceOnly ? 'bg-slate-950/30 text-slate-950' : 'bg-amber-500/20 text-amber-300'
          }`}>
            {candidateCount}
          </span>
        </button>

        {/* Advanced Filters Toggle & Reset */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              showAdvanced
                ? 'border-teal-500/50 bg-teal-500/10 text-teal-300'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>{showAdvanced ? 'Hide Thresholds' : 'Thresholds'}</span>
          </button>

          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-2 text-xs text-slate-400 hover:text-slate-200"
            title="Reset filters"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Advanced threshold sliders & Region dropdown */}
      {showAdvanced && (
        <div className="grid grid-cols-1 gap-4 border-t border-slate-800 pt-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Region */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Reef System / Ocean</label>
            <select
              value={filters.region}
              onChange={(e) => setFilters((prev) => ({ ...prev, region: e.target.value }))}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-teal-500 focus:outline-none"
            >
              <option value="all">All Oceanic Regions</option>
              {regions.map((reg) => (
                <option key={reg} value={reg}>
                  {reg}
                </option>
              ))}
            </select>
          </div>

          {/* Min Water Temp */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-slate-400">Min In-situ Water Temp</span>
              <span className="font-mono text-teal-400 tabular-nums">{filters.minTemp.toFixed(1)}°C</span>
            </div>
            <input
              type="range"
              min="26.0"
              max="34.0"
              step="0.2"
              value={filters.minTemp}
              onChange={(e) => setFilters((prev) => ({ ...prev, minTemp: parseFloat(e.target.value) }))}
              className="w-full accent-teal-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Depth Range */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-slate-400">Depth Range</span>
              <span className="font-mono text-teal-400 tabular-nums">{filters.minDepth}m - {filters.maxDepth}m</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              step="1"
              value={filters.maxDepth}
              onChange={(e) => setFilters((prev) => ({ ...prev, maxDepth: parseInt(e.target.value, 10) }))}
              className="w-full accent-teal-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Min NOAA DHW */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-slate-400">Min NOAA Heat Stress</span>
              <span className="font-mono text-amber-400 tabular-nums">≥ {filters.minDhw.toFixed(1)} DHW</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={filters.minDhw}
              onChange={(e) => setFilters((prev) => ({ ...prev, minDhw: parseFloat(e.target.value) }))}
              className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
        <div>
          <span>Showing </span>
          <strong className="font-mono text-slate-200">{filteredCount}</strong>
          <span> of </span>
          <span className="font-mono text-slate-400">{totalCount}</span>
          <span> colonies</span>
          {filters.resilienceOnly && (
            <span className="text-amber-400 ml-1.5 font-medium">
              · Filtered to resilience candidates (surviving severe heat stress)
            </span>
          )}
        </div>
        <div className="hidden sm:block text-slate-500">
          Hardware telemetry synced via Edge Raspberry Pi + Arduino
        </div>
      </div>
    </div>
  );
};
