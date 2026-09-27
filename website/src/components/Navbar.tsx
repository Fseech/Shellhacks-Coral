import React from 'react';
import { Waves, Camera, Sparkles, BarChart3, Download, PlusCircle } from 'lucide-react';

export type ActiveTab = 'map' | 'candidates' | 'trends' | 'hardware';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  candidateCount: number;
  onOpenUpload: () => void;
  onOpenExport: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  candidateCount,
  onOpenUpload,
  onOpenExport,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single element wordmark (Display face, anti-slop) */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('map')}
            className="group flex items-center gap-2.5 text-left focus:outline-none"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400 ring-1 ring-teal-500/30 transition-all group-hover:bg-teal-500/20 group-hover:ring-teal-400/50">
              <Waves className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold tracking-tight text-white transition-colors group-hover:text-teal-300">
                ReefResilience
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links (Clean text with subtle active state) */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === 'map'
                ? 'text-teal-300 border-b-2 border-teal-400 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span>Reef Camera & Data</span>
          </button>

          <button
            onClick={() => setActiveTab('candidates')}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === 'candidates'
                ? 'text-teal-300 border-b-2 border-teal-400 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>Resilience Candidates</span>
            <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-xs font-mono font-semibold text-amber-300 ring-1 ring-amber-500/30">
              {candidateCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('trends')}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === 'trends'
                ? 'text-teal-300 border-b-2 border-teal-400 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <BarChart3 className="h-4 w-4 text-slate-400" />
            <span>Analysis & Trends</span>
          </button>

          <button
            onClick={() => setActiveTab('hardware')}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === 'hardware'
                ? 'text-teal-300 border-b-2 border-teal-400 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Camera className="h-4 w-4 text-slate-400" />
            <span>Diver Camera</span>
          </button>
        </nav>

        {/* Zone 3: 1-2 Functional Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 rounded-lg bg-teal-950/80 px-3 py-2 text-xs sm:text-sm font-semibold text-teal-300 ring-1 ring-teal-500/40 hover:bg-teal-900/60 hover:text-white transition-colors"
            title="Upload camera photo & sensor telemetry from dive"
          >
            <PlusCircle className="h-4 w-4 text-teal-400" />
            <span className="hidden sm:inline">Camera Upload</span>
            <span className="sm:hidden">Upload</span>
          </button>

          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-teal-500 transition-colors"
            title="Export observations as CSV or GeoJSON"
          >
            <Download className="h-4 w-4" />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* Mobile nav row */}
      <div className="flex md:hidden border-t border-slate-800/80 bg-slate-900/90 overflow-x-auto px-4 py-2 gap-2 text-xs">
        <button
          onClick={() => setActiveTab('map')}
          className={`shrink-0 px-2.5 py-1 rounded ${
            activeTab === 'map' ? 'bg-teal-900/60 text-teal-200' : 'text-slate-300'
          }`}
        >
          Camera & Data
        </button>
        <button
          onClick={() => setActiveTab('candidates')}
          className={`shrink-0 px-2.5 py-1 rounded flex items-center gap-1 ${
            activeTab === 'candidates' ? 'bg-amber-900/60 text-amber-200' : 'text-slate-300'
          }`}
        >
          <Sparkles className="h-3 w-3 text-amber-400" />
          <span>Candidates ({candidateCount})</span>
        </button>
        <button
          onClick={() => setActiveTab('trends')}
          className={`shrink-0 px-2.5 py-1 rounded ${
            activeTab === 'trends' ? 'bg-teal-900/60 text-teal-200' : 'text-slate-300'
          }`}
        >
          Trends
        </button>
        <button
          onClick={() => setActiveTab('hardware')}
          className={`shrink-0 px-2.5 py-1 rounded ${
            activeTab === 'hardware' ? 'bg-teal-900/60 text-teal-200' : 'text-slate-300'
          }`}
        >
          Diver Camera
        </button>
      </div>
    </header>
  );
};
