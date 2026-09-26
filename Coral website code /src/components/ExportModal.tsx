import React, { useState } from 'react';
import { CoralObservation } from '../types/coral';
import { X, Download, FileSpreadsheet, MapPin, Copy, Check, FileCode } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredObservations: CoralObservation[];
  allObservations: CoralObservation[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  filteredObservations,
  allObservations,
}) => {
  const [exportScope, setExportScope] = useState<'filtered' | 'all'>('filtered');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const targetData = exportScope === 'filtered' ? filteredObservations : allObservations;

  const downloadCsv = () => {
    const headers = [
      'id',
      'sample_code',
      'scientific_name',
      'common_name',
      'region',
      'sub_region',
      'decimal_latitude',
      'decimal_longitude',
      'depth_meters',
      'in_situ_temp_celsius',
      'noaa_dhw_degree_heating_weeks',
      'sst_anomaly_celsius',
      'heat_stress_category',
      'ai_health_status',
      'ai_confidence_percent',
      'is_resilience_candidate',
      'resilience_priority_score',
      'hardware_unit_id',
      'timestamp_utc'
    ];

    const rows = targetData.map((obs) => [
      obs.id,
      obs.sampleCode,
      `"${obs.genus}"`,
      `"${obs.commonName}"`,
      `"${obs.region}"`,
      `"${obs.subRegion}"`,
      obs.latitude,
      obs.longitude,
      obs.depthMeters,
      obs.waterTemperatureCelsius,
      obs.heatStress.noaaDhw,
      obs.heatStress.seaSurfaceTempAnomaly,
      `"${obs.heatStress.heatStressCategory}"`,
      obs.aiClassification.status,
      obs.aiClassification.confidence,
      obs.isResilienceCandidate ? 'TRUE' : 'FALSE',
      obs.resilienceScore || '',
      obs.hardware.deviceUnitId,
      obs.timestamp
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ReefResilience_Dataset_${exportScope}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadGeoJson = () => {
    const geoJson = {
      type: 'FeatureCollection',
      metadata: {
        generated: new Date().toISOString(),
        count: targetData.length,
        platform: 'ReefResilience Marine Research Network',
      },
      features: targetData.map((obs) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [obs.longitude, obs.latitude],
        },
        properties: {
          id: obs.id,
          sampleCode: obs.sampleCode,
          genus: obs.genus,
          commonName: obs.commonName,
          region: obs.region,
          depthMeters: obs.depthMeters,
          temperatureCelsius: obs.waterTemperatureCelsius,
          noaaDhw: obs.heatStress.noaaDhw,
          aiStatus: obs.aiClassification.status,
          confidence: obs.aiClassification.confidence,
          isResilienceCandidate: obs.isResilienceCandidate,
          resilienceScore: obs.resilienceScore,
          timestamp: obs.timestamp,
        },
      })),
    };

    const jsonStr = JSON.stringify(geoJson, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/geo+json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ReefResilience_Spatial_${exportScope}_${new Date().toISOString().slice(0, 10)}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const copyJsonToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(targetData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-teal-400" />
            <h3 className="font-semibold text-white text-base">
              Export Scientific Reef Dataset
            </h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Scope Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Select Dataset Scope:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExportScope('filtered')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  exportScope === 'filtered'
                    ? 'border-teal-400 bg-slate-950 shadow-md ring-1 ring-teal-400/40'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <span className="font-bold text-sm text-white block">Current Filtered View</span>
                <span className="font-mono text-xs text-teal-400 font-semibold">{filteredObservations.length} records</span>
                <p className="text-[11px] text-slate-400 mt-1">Exports based on current map and threshold filters</p>
              </button>

              <button
                type="button"
                onClick={() => setExportScope('all')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  exportScope === 'all'
                    ? 'border-teal-400 bg-slate-950 shadow-md ring-1 ring-teal-400/40'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <span className="font-bold text-sm text-white block">All Global Surveys</span>
                <span className="font-mono text-xs text-teal-400 font-semibold">{allObservations.length} records</span>
                <p className="text-[11px] text-slate-400 mt-1">Complete multi-ocean dataset without filters</p>
              </button>
            </div>
          </div>

          {/* Export Format Actions */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300">Choose Output Format:</label>

            {/* CSV */}
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-white">Comma-Separated Values (.CSV)</h4>
                  <p className="text-xs text-slate-400">Standard Darwin Core / OBIS marine biology tabular format</p>
                </div>
              </div>
              <button
                onClick={downloadCsv}
                className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download CSV</span>
              </button>
            </div>

            {/* GeoJSON */}
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-white">Spatial GeoJSON (.geojson)</h4>
                  <p className="text-xs text-slate-400">For QGIS, ArcGIS, Mapbox, and spatial Python geopandas</p>
                </div>
              </div>
              <button
                onClick={downloadGeoJson}
                className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download GeoJSON</span>
              </button>
            </div>

            {/* Raw JSON */}
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
                  <FileCode className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-white">Copy Raw JSON Payload</h4>
                  <p className="text-xs text-slate-400">Formatted JSON string for direct API / script usage</p>
                </div>
              </div>
              <button
                onClick={copyJsonToClipboard}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 bg-slate-950 px-5 py-3 text-right">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-medium text-slate-300 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
