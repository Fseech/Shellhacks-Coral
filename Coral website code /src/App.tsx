import React, { useState, useMemo, useEffect } from 'react';
import { INITIAL_OBSERVATIONS } from './data/mockObservations';
import { CoralObservation, ObservationFilters } from './types/coral';
import { Navbar, ActiveTab } from './components/Navbar';
import { FilterBar } from './components/FilterBar';
import { ObservationCard } from './components/ObservationCard';
import { ObservationDetailModal } from './components/ObservationDetailModal';
import { ResilienceCandidatesView } from './components/ResilienceCandidatesView';
import { TrendsAnalyticsView } from './components/TrendsAnalyticsView';
import { HardwareSchematicView } from './components/HardwareSchematicView';
import { MainFrontCameraScanner } from './components/MainFrontCameraScanner';
import { FieldUploadModal } from './components/FieldUploadModal';
import { ExportModal } from './components/ExportModal';
import { Sparkles, Waves, Thermometer, ShieldCheck, ArrowRight, Globe2, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [observations, setObservations] = useState<CoralObservation[]>(INITIAL_OBSERVATIONS);
  const [activeTab, setActiveTab] = useState<ActiveTab>('map');
  const [selectedObservation, setSelectedObservation] = useState<CoralObservation | null>(null);
  const [detailModalObs, setDetailModalObs] = useState<CoralObservation | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [ingestionToast, setIngestionToast] = useState<{ message: string; isCandidate: boolean } | null>(null);

  // Sync observations from backend database on mount
  useEffect(() => {
    fetch('/api/observations')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.observations && data.observations.length > 0) {
          setObservations(data.observations);
        }
      })
      .catch((err) => console.log('Using local dataset cache:', err));
  }, []);

  // Filters State
  const [filters, setFilters] = useState<ObservationFilters>({
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

  // Extract unique regions
  const availableRegions = useMemo(() => {
    return Array.from(new Set(observations.map((o) => o.region)));
  }, [observations]);

  // Candidate count
  const candidateCount = useMemo(() => {
    return observations.filter((o) => o.isResilienceCandidate).length;
  }, [observations]);

  // Filtered observations
  const filteredObservations = useMemo(() => {
    return observations.filter((obs) => {
      // Search query
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchesQuery =
          obs.genus.toLowerCase().includes(query) ||
          obs.commonName.toLowerCase().includes(query) ||
          obs.sampleCode.toLowerCase().includes(query) ||
          obs.subRegion.toLowerCase().includes(query) ||
          obs.region.toLowerCase().includes(query);
        if (!matchesQuery) return false;
      }

      // Region
      if (filters.region !== 'all' && obs.region !== filters.region) {
        return false;
      }

      // Health status
      if (filters.healthStatus !== 'all' && obs.aiClassification.status !== filters.healthStatus) {
        return false;
      }

      // Resilience candidate filter
      if (filters.resilienceOnly && !obs.isResilienceCandidate) {
        return false;
      }

      // In-situ temperature
      if (obs.waterTemperatureCelsius < filters.minTemp) {
        return false;
      }

      // Depth
      if (obs.depthMeters > filters.maxDepth) {
        return false;
      }

      // NOAA DHW heat stress
      if (obs.heatStress.noaaDhw < filters.minDhw) {
        return false;
      }

      return true;
    });
  }, [observations, filters]);

  // Handler for adding new simulated/field observation
  const handleAddObservation = (newObs: CoralObservation) => {
    setObservations((prev) => [newObs, ...prev.filter((o) => o.id !== newObs.id)]);
    setSelectedObservation(newObs);
    setIngestionToast({
      message: newObs.isResilienceCandidate
        ? `⭐ New Resilience Candidate Ingested: ${newObs.sampleCode} surviving ${newObs.heatStress.noaaDhw} DHW!`
        : `Hardware observation ${newObs.sampleCode} received & analyzed.`,
      isCandidate: newObs.isResilienceCandidate,
    });
    setTimeout(() => setIngestionToast(null), 6000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500/20 selection:text-teal-200">
      {/* Top Bar Navigation (Strict 3-zone contract) */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        candidateCount={candidateCount}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* Main Body */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Mission Statement Banner */}
        <section className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 p-5 sm:p-6 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-400">
                <Waves className="h-4 w-4" />
                <span>Marine Biology & Hardware AI System</span>
              </div>
              <h1 className="font-display text-xl sm:text-3xl font-bold tracking-tight text-white text-balance">
                Finding Healthy Corals Under Extreme Heat Stress
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                ReefResilience couples an underwater sensor rig (Raspberry Pi + Arduino + sensors) with edge computer
                vision and NOAA satellite thermal telemetry to pinpoint resilient coral colonies surviving high Degree Heating Weeks.
              </p>
            </div>

            {/* Scientific stats cluster */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
                <span className="text-[11px] text-slate-400">Total Surveyed</span>
                <div className="font-mono text-xl font-bold text-white">{observations.length}</div>
                <span className="text-[10px] text-slate-500">Live Dive Records</span>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3">
                <span className="text-[11px] text-amber-300">Resilience Candidates</span>
                <div className="font-mono text-xl font-bold text-amber-300">{candidateCount}</div>
                <span className="text-[10px] text-amber-400/80">Healthy + DHW ≥ 4</span>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
                <span className="text-[11px] text-slate-400">Max Temp Survived</span>
                <div className="font-mono text-xl font-bold text-teal-300">32.8°C</div>
                <span className="text-[10px] text-slate-500">In-situ Probe</span>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
                <span className="text-[11px] text-slate-400">Global Reef Systems</span>
                <div className="font-mono text-xl font-bold text-cyan-300">{availableRegions.length}</div>
                <span className="text-[10px] text-slate-500">Ocean Basins</span>
              </div>
            </div>
          </div>
        </section>

        {/* Tab 1: Front Camera & Accessible Reef Observation Dataset */}
        {activeTab === 'map' && (
          <div className="space-y-8">
            {/* Front & Center: Underwater Camera & AI Scanner */}
            <MainFrontCameraScanner
              onObservationIngested={handleAddObservation}
              onOpenDetails={(obs) => setDetailModalObs(obs)}
            />

            {/* Accessible Reef Data Explorer Section */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-display font-bold text-lg text-white">
                    Accessible Reef Observation Dataset
                  </h3>
                  <p className="text-xs text-slate-400">
                    Search and inspect surveyed coral colonies, depth stratification, and resilience scores.
                  </p>
                </div>
                <button
                  onClick={() => setIsExportOpen(true)}
                  className="self-start sm:self-auto flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-700 transition-colors"
                >
                  <span>Download Dataset ({filteredObservations.length} items)</span>
                </button>
              </div>

              {/* Filter Bar with Segmented Controls */}
              <FilterBar
                filters={filters}
                setFilters={setFilters}
                regions={availableRegions}
                totalCount={observations.length}
                filteredCount={filteredObservations.length}
                candidateCount={candidateCount}
              />

              {/* Observation Cards Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    Colonies Displayed ({filteredObservations.length} of {observations.length})
                  </span>
                  <span className="text-xs text-slate-400">
                    Click any colony card to inspect full sensor telemetry & AI confidence
                  </span>
                </div>

                {filteredObservations.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center space-y-3">
                    <p className="text-sm text-slate-400">No coral colonies match your active filter criteria.</p>
                    <button
                      onClick={() =>
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
                        })
                      }
                      className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500"
                    >
                      Reset All Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredObservations.map((obs) => (
                      <ObservationCard
                        key={obs.id}
                        observation={obs}
                        isSelected={selectedObservation?.id === obs.id}
                        onSelect={(target) => setSelectedObservation(target)}
                        onOpenDetails={(target) => setDetailModalObs(target)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Dedicated Resilience Candidates Queue */}
        {activeTab === 'candidates' && (
          <ResilienceCandidatesView
            observations={observations}
            onSelectObservation={(obs) => setSelectedObservation(obs)}
            onOpenDetails={(obs) => setDetailModalObs(obs)}
          />
        )}

        {/* Tab 3: Trends & Scientific Analytics */}
        {activeTab === 'trends' && (
          <TrendsAnalyticsView
            observations={observations}
            onOpenDetails={(obs) => setDetailModalObs(obs)}
          />
        )}

        {/* Tab 4: Physical Hardware & System Pipeline */}
        {activeTab === 'hardware' && (
          <HardwareSchematicView onObservationIngested={handleAddObservation} />
        )}
      </main>

      {/* Floating Ingestion Toast Notification */}
      {ingestionToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-teal-500/40 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md max-w-md animate-in fade-in slide-in-from-bottom-4">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            ingestionToast.isCandidate
              ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50'
              : 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50'
          }`}>
            {ingestionToast.isCandidate ? <Sparkles className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
          </div>
          <div className="flex-1 text-xs">
            <span className="font-semibold text-white block">
              {ingestionToast.isCandidate ? 'Resilience Candidate Discovered!' : 'Hardware Data Ingested'}
            </span>
            <p className="text-slate-300 mt-0.5">{ingestionToast.message}</p>
          </div>
          <button
            onClick={() => setIngestionToast(null)}
            className="text-slate-400 hover:text-white text-xs font-mono px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Single Observation Deep Dive Modal */}
      <ObservationDetailModal
        observation={detailModalObs}
        onClose={() => setDetailModalObs(null)}
      />

      {/* Dive Simulator & Edge Inference Modal */}
      <FieldUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onAddObservation={handleAddObservation}
      />

      {/* Export Dataset Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        filteredObservations={filteredObservations}
        allObservations={observations}
      />

      {/* Anti-Slop Clean Editorial Footer */}
      <footer className="mt-12 border-t border-slate-800/80 bg-slate-950 py-8 text-xs text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-white text-sm">ReefResilience</span>
            <span className="text-slate-600">·</span>
            <span>Marine Heat-Stress & Coral Discovery Platform</span>
          </div>

          <div className="flex items-center gap-4 text-slate-500">
            <span>Hardware: Raspberry Pi + Arduino + TSYS01 + MS5837</span>
            <span>·</span>
            <span>Satellite: NOAA Coral Reef Watch (5km)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
