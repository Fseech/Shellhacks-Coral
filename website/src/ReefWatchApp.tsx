import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronDown,
  Database,
  MapPin,
  Plus,
  Sparkles,
  Waves,
  X,
} from 'lucide-react';
import { REEF_LOCATIONS } from './data/reefLocations';
import type { ReefLocation, ReefObservation } from './types/reefWatch';

type Page = 'overview' | 'explore';
type ApiPayload<T> = { success: boolean; error?: string } & T;
type PlaceSuggestion = ReefLocation;
type SearchArea = { kind: 'place' | 'coordinates'; name: string; lat: number; lon: number };

const radiusChoices = [1, 5, 10, 25, 50];
const heroImage = 'https://images.unsplash.com/photo-1546026423-cc4642628d2b?auto=format&fit=crop&w=2200&q=85';

async function readApi<T>(url: string, signal: AbortSignal): Promise<ApiPayload<T>> {
  const response = await fetch(url, { signal });
  const payload = await response.json() as ApiPayload<T>;
  if (!response.ok) throw new Error(payload.error || 'The data service is unavailable.');
  return payload;
}

function formatValue(value: number | null | undefined, suffix = '') {
  return value === null || value === undefined || !Number.isFinite(Number(value))
    ? 'Not recorded'
    : `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })}${suffix}`;
}

function formatDate(value: string) {
  return `${new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(value))} UTC`;
}

const DEMO_VERDICTS: Record<string, string> = {
  demo_alive: 'Alive (demo)',
  demo_dead: 'Dead (demo)',
  demo_unclear: 'No card (demo)',
};

function isColorDemo(observation: ReefObservation) {
  return Boolean(observation.verdict?.startsWith('demo_'));
}

function verdictName(value: string | null) {
  if (!value) return 'No verdict';
  if (DEMO_VERDICTS[value]) return DEMO_VERDICTS[value];
  return value.replaceAll('_', ' ');
}

function healthName(value: string | null) {
  if (!value) return 'Unknown health';
  return value.replaceAll('_', ' ');
}

export default function ReefWatchApp() {
  const page: Page = window.location.pathname.startsWith('/explore') ? 'explore' : 'overview';

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Reef Watch home">
          <span className="brand-mark"><Waves size={21} strokeWidth={2.2} /></span>
          <span>Reef Watch</span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="/" aria-current={page === 'overview' ? 'page' : undefined}>Overview</a>
          <a href="/explore" aria-current={page === 'explore' ? 'page' : undefined}>Explore data</a>
        </nav>
        <div className="read-only-mark"><Database size={15} /> Read-only research</div>
      </header>

      {page === 'overview' ? <OverviewPage /> : <ExplorePage />}

      <footer className="site-footer">
        <a className="brand brand-footer" href="/">
          <span className="brand-mark"><Waves size={18} /></span>
          <span>Reef Watch</span>
        </a>
        <p>Field observations, coral health, and reef heat stress.</p>
        <a href="/explore">Explore analyzed records <ArrowRight size={15} /></a>
      </footer>
    </div>
  );
}

function OverviewPage() {
  const steps = [
    { number: '01', title: 'Capture', copy: 'A diver device records coral snapshots with the time and location.' },
    { number: '02', title: 'Assess', copy: 'AI scores coral health and paleness from each image.' },
    { number: '03', title: 'Add heat context', copy: 'NOAA heat data and nearby living corals help explain the observation.' },
    { number: '04', title: 'Explore', copy: 'Browse analyzed records and compare reef areas. The website never edits them.' },
  ];

  return (
    <main>
      <section className="hero" aria-labelledby="hero-title">
        <img className="hero-image" src={heroImage} alt="Coral colonies growing across a tropical reef" />
        <div className="hero-shade" />
        <div className="hero-content">
          <p className="eyebrow eyebrow-light"><span className="eyebrow-dot" /> Field science for a warming ocean</p>
          <h1 id="hero-title">Reef Watch</h1>
          <p className="hero-statement">Find the corals that stay healthier under heat stress.</p>
          <p className="hero-copy">
            Field photographs, AI health assessments, and NOAA heat data help researchers spot corals
            that may be more resilient than nearby colonies.
          </p>
          <a className="button button-hot" href="/explore">
            Explore reef data <ArrowRight size={17} />
          </a>
          <p className="hero-caveat">A resilience candidate is a research lead, not proof of heat resistance.</p>
        </div>
        <a className="hero-scroll" href="#how-it-works" aria-label="Scroll to how Reef Watch works">
          <ArrowDown size={17} />
        </a>
        <span className="hero-image-credit">Coral reef observation</span>
      </section>

      <section className="mission-band" aria-label="Our mission">
        <p className="eyebrow eyebrow-blue">Our mission</p>
        <h2>Turn reef observations into better questions about survival.</h2>
        <p>
          Reef Watch brings image-based coral health, local comparisons, and satellite heat stress
          together in one place, so researchers can find promising corals to study further.
        </p>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="section-heading">
          <div>
            <p className="eyebrow eyebrow-blue">From snapshot to science</p>
            <h2>How Reef Watch works</h2>
          </div>
          <p className="section-aside">Each stage uses the shared database to hand analyzed observations forward.</p>
        </div>
        <div className="steps-grid">
          {steps.map((step) => (
            <article className="step-item" key={step.number}>
              <span className="step-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </article>
          ))}
        </div>
        <div className="read-only-note">
          <span className="read-only-icon"><Database size={17} /></span>
          <p><strong>Read-only by design.</strong> Reef Watch displays completed analyses; field devices and processors handle data collection and updates.</p>
        </div>
      </section>

      <section className="overview-cta">
        <div>
          <p className="eyebrow eyebrow-light">Explore the evidence</p>
          <h2>Start with a reef location.</h2>
          <p>Search analyzed snapshots by place and compare coral observations across reef areas.</p>
        </div>
        <a className="button button-white" href="/explore">Open data explorer <ArrowRight size={17} /></a>
      </section>
    </main>
  );
}

function ExplorePage() {
  const [radiusKm, setRadiusKm] = useState(10);
  const [places, setPlaces] = useState<PlaceSuggestion[]>(REEF_LOCATIONS.map((location) => ({
    ...location,
    observation_count: null,
    sample_id: null,
    sample_taken_at: null,
  })));
  const [placeError, setPlaceError] = useState('');
  const [selectedPlaces, setSelectedPlaces] = useState<(SearchArea | null)[]>([null]);
  const [observations, setObservations] = useState<ReefObservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataError, setDataError] = useState('');
  const [analysisText, setAnalysisText] = useState('');
  const [analysisRecordCount, setAnalysisRecordCount] = useState(0);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    readApi<{ radiusKm: number; places: { name: string; observation_count: number; sample_id: string | null; sample_taken_at: string | null }[] }>(
      `/api/places?radiusKm=${radiusKm}`,
      controller.signal,
    )
      .then((payload) => {
        setPlaces((current) => current.map((location) => ({
          ...location,
          observation_count: payload.places.find((place) => place.name === location.name)?.observation_count ?? 0,
          sample_id: payload.places.find((place) => place.name === location.name)?.sample_id ?? null,
          sample_taken_at: payload.places.find((place) => place.name === location.name)?.sample_taken_at ?? null,
        })));
        setPlaceError('');
      })
      .catch((error: Error) => {
        if (error.name !== 'AbortError') setPlaceError(error.message);
      });
    return () => controller.abort();
  }, [radiusKm]);

  useEffect(() => {
    setAnalysisText('');
    setAnalysisRecordCount(0);
    setAnalysisError('');
    if (!selectedPlaces.length || selectedPlaces.some((place) => !place)) {
      setObservations([]);
      setDataError('');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const locations = selectedPlaces.map((place) => place?.kind === 'place'
      ? { kind: 'place', name: place.name }
      : { kind: 'coordinates', lat: place?.lat, lon: place?.lon });
    const params = new URLSearchParams({ locations: JSON.stringify(locations), radiusKm: String(radiusKm) });
    setLoading(true);
    setDataError('');
    readApi<{ radiusKm: number; observations: ReefObservation[] }>(`/api/observations?${params}`, controller.signal)
      .then((payload) => setObservations(payload.observations))
      .catch((error: Error) => {
        if (error.name !== 'AbortError') {
          setObservations([]);
          setDataError(error.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [selectedPlaces, radiusKm]);

  const completeSelection = selectedPlaces.length > 0 && selectedPlaces.every((place) => place !== null);
  const selectedAreas = selectedPlaces.filter((place): place is SearchArea => place !== null);
  const selectedRecords = observations.filter((observation) => selectedAreas.some((place) => place.name === observation.place_name));

  function changePlace(index: number, value: SearchArea | null) {
    setSelectedPlaces((current) => current.map((place, placeIndex) => placeIndex === index ? value : place));
  }

  function removePlace(index: number) {
    setSelectedPlaces((current) => {
      const remaining = current.filter((_, placeIndex) => placeIndex !== index);
      return remaining.length ? remaining : [null];
    });
  }

  async function generateAnalysis() {
    setAnalysisLoading(true);
    setAnalysisError('');
    setAnalysisText('');
    try {
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          radiusKm,
          locations: selectedAreas.map((place) => place.kind === 'place'
            ? { kind: 'place', name: place.name }
            : { kind: 'coordinates', lat: place.lat, lon: place.lon }),
        }),
      });
      const payload = await response.json() as ApiPayload<{ analysis: string; recordCount: number }>;
      if (!response.ok) throw new Error(payload.error || 'Unable to generate the analysis.');
      setAnalysisText(payload.analysis);
      setAnalysisRecordCount(payload.recordCount);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Unable to generate the analysis.');
    } finally {
      setAnalysisLoading(false);
    }
  }

  return (
    <main className="explore-page">
      <section className="explore-intro">
        <div>
          <p className="eyebrow eyebrow-blue">Analyzed observations</p>
          <h1>Explore reef data</h1>
          <p className="explore-lede">Choose a reef to see what has been observed nearby. Add other reefs to compare coral health under different conditions.</p>
        </div>
        <div className="source-note"><Database size={17} /><span>Read-only from analyzed records</span></div>
      </section>

      <section className="search-panel" aria-labelledby="location-heading">
        <div className="search-panel-heading">
          <div>
            <p className="eyebrow eyebrow-blue">Location search</p>
            <h2 id="location-heading">Where should we look?</h2>
          </div>
          <label className="radius-control">
            <span>Search radius</span>
            <select value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))}>
              {radiusChoices.map((radius) => <option value={radius} key={radius}>{radius} km</option>)}
            </select>
          </label>
        </div>

        <div className="location-pickers">
          {selectedPlaces.map((place, index) => (
            <div className="location-picker-row" key={`reef-place-${index}`}>
              <PlacePicker
                label={selectedPlaces.length > 1 ? `Reef area ${index + 1}` : 'Reef area'}
                value={place}
                places={places}
                excluded={selectedPlaces.flatMap((selected, placeIndex) =>
                  placeIndex !== index && selected?.kind === 'place' ? [selected.name] : [],
                )}
                onChange={(value) => changePlace(index, value)}
              />
              {selectedPlaces.length > 1 && (
                <button className="icon-button remove-place" type="button" onClick={() => removePlace(index)} aria-label={`Remove reef area ${index + 1}`} title="Remove reef area">
                  <X size={17} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="search-panel-actions">
          {completeSelection && selectedPlaces.length < 4 && (
            <button className="text-button" type="button" onClick={() => setSelectedPlaces((current) => [...current, null])}>
              <Plus size={17} /> Add another reef to compare
            </button>
          )}
          {selectedPlaces.length === 4 && <span className="limit-note">Up to four reef areas can be compared at once.</span>}
          <p className="radius-note">The search radius finds nearby snapshots; analyzer neighbor comparisons use 50 m and a 7-day window.</p>
        </div>
        {(placeError || dataError) && (
          <div className="connection-alert" role="alert">
            <Database size={18} />
            <div>
              <strong>Live reef data isn’t available.</strong>
              <p>{dataError || placeError}</p>
            </div>
          </div>
        )}
      </section>

      {completeSelection && (
        <section className="results-section" aria-live="polite">
          <div className="results-heading">
            <div>
              <p className="eyebrow eyebrow-blue">Location comparison</p>
              <h2>What the records show</h2>
            </div>
            {!loading && !dataError && <span className="result-count">{selectedRecords.length} analyzed {selectedRecords.length === 1 ? 'snapshot' : 'snapshots'}</span>}
          </div>

          {!loading && !dataError && selectedRecords.length > 0 && (
            <div className="analysis-action">
              <button className="analysis-button" type="button" onClick={generateAnalysis} disabled={analysisLoading}>
                {analysisLoading ? <span className="loading-mark" /> : <Sparkles size={16} />}
                {analysisLoading ? 'Generating analysis...' : 'Generate in-depth analysis'}
              </button>
              <p>Optional AI interpretation of summary data. On request, reef names and aggregate measurements are sent to Gemini; photos, record IDs, and exact coordinates are not. Nothing is saved back to the database.</p>
            </div>
          )}

          {analysisError && <div className="analysis-error" role="alert">{analysisError}</div>}
          {analysisText && (
            <section className="analysis-panel" aria-live="polite">
              <div className="analysis-panel-heading">
                <div>
                  <p className="eyebrow eyebrow-blue">Optional AI interpretation</p>
                  <h3>Research notes from {analysisRecordCount} analyzed {analysisRecordCount === 1 ? 'snapshot' : 'snapshots'}</h3>
                </div>
                <Sparkles size={19} aria-hidden="true" />
              </div>
              <pre className="analysis-text">{analysisText}</pre>
              <p className="analysis-disclaimer">AI-generated synthesis of recorded measurements, not a diagnosis or proof of biological resistance. Check conclusions against the underlying observations.</p>
            </section>
          )}

          {loading ? (
            <div className="empty-state"><span className="loading-mark" /> Loading analyzed observations...</div>
          ) : dataError ? (
            <div className="empty-state">Connect a read-only database account to load analyzed observations.</div>
          ) : selectedRecords.length === 0 ? (
            <div className="empty-state">No analyzed snapshots were found within {radiusKm} km of the selected reef area.</div>
          ) : (
            <>
              <CoralComparisonTable locations={selectedAreas.map((place) => place.name)} observations={selectedRecords} />
              <div className="evidence-note">
                <span className="evidence-mark">i</span>
                <p>These are observed records, not predicted temperature limits. Candidate labels follow the analyzer verdict; more observations improve confidence.</p>
              </div>
              {selectedAreas.map((place) => (
                <LocationRecords
                  key={place.name}
                  place={place.name}
                  radiusKm={radiusKm}
                  observations={selectedRecords.filter((observation) => observation.place_name === place.name)}
                />
              ))}
            </>
          )}
        </section>
      )}
    </main>
  );
}

interface PlacePickerProps {
  label: string;
  value: SearchArea | null;
  places: PlaceSuggestion[];
  excluded: string[];
  onChange: (value: SearchArea | null) => void;
}

function PlacePicker({ label, value, places, excluded, onChange }: PlacePickerProps) {
  const [mode, setMode] = useState<'place' | 'coordinates'>(value?.kind || 'place');
  const [query, setQuery] = useState(value?.kind === 'place' ? value.name : '');
  const [isOpen, setIsOpen] = useState(false);
  const [latitude, setLatitude] = useState(value?.kind === 'coordinates' ? String(value.lat) : '');
  const [longitude, setLongitude] = useState(value?.kind === 'coordinates' ? String(value.lon) : '');
  const [coordinateError, setCoordinateError] = useState('');
  const listId = `reef-options-${label.toLowerCase().replaceAll(' ', '-')}`;
  const filteredPlaces = places.filter((place) =>
    !excluded.includes(place.name) && place.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    if (value?.kind === 'place') {
      setMode('place');
      setQuery(value.name);
    } else if (value?.kind === 'coordinates') {
      setMode('coordinates');
      setLatitude(String(value.lat));
      setLongitude(String(value.lon));
    }
  }, [value]);

  function choose(place: PlaceSuggestion) {
    onChange({ kind: 'place', name: place.name, lat: place.lat, lon: place.lon });
    setQuery(place.name);
    setIsOpen(false);
  }

  function useCoordinates(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!latitude.trim() || !longitude.trim() || !Number.isFinite(lat) || lat < -90 || lat > 90
      || !Number.isFinite(lon) || lon < -180 || lon > 180) {
      setCoordinateError('Enter a latitude from -90 to 90 and longitude from -180 to 180.');
      return;
    }
    setCoordinateError('');
    onChange({
      kind: 'coordinates',
      name: `Coordinates ${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      lat,
      lon,
    });
  }

  function changeMode(nextMode: 'place' | 'coordinates') {
    setMode(nextMode);
    setIsOpen(false);
    setCoordinateError('');
    onChange(null);
  }

  return (
    <div className="place-picker">
      <label htmlFor={listId}>{label}</label>
      <div className="picker-modes" role="group" aria-label={`${label} input type`}>
        <button type="button" aria-pressed={mode === 'place'} className={mode === 'place' ? 'mode-active' : ''} onClick={() => changeMode('place')}>Place name</button>
        <button type="button" aria-pressed={mode === 'coordinates'} className={mode === 'coordinates' ? 'mode-active' : ''} onClick={() => changeMode('coordinates')}>Coordinates</button>
      </div>
      {mode === 'place' ? (
        <>
          <div className="place-input-wrap">
            <MapPin size={18} aria-hidden="true" />
            <input
              id={listId}
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={isOpen}
              aria-controls={`${listId}-list`}
              aria-label={label}
              autoComplete="off"
              placeholder="Type a reef or atoll"
              value={query}
              onFocus={() => setIsOpen(true)}
              onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
              onChange={(event) => {
                setQuery(event.target.value);
                if (value?.kind === 'place' && event.target.value !== value.name) onChange(null);
                setIsOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setIsOpen(false);
                if (event.key === 'ArrowDown') setIsOpen(true);
                if (event.key === 'Enter' && filteredPlaces[0]) {
                  event.preventDefault();
                  choose(filteredPlaces[0]);
                }
              }}
            />
            <button className="picker-toggle" type="button" aria-label={`Show ${label} suggestions`} onClick={() => setIsOpen((current) => !current)}>
              <ChevronDown size={17} />
            </button>
          </div>
          {isOpen && (
            <ul className="place-options" id={`${listId}-list`} role="listbox" aria-label={`${label} suggestions`}>
              {filteredPlaces.length ? filteredPlaces.map((place) => (
                <li key={place.name} role="option" aria-selected={place.name === value?.name}>
                  <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => choose(place)}>
                    {place.sample_id && place.sample_taken_at ? (
                      <img
                        className="place-option-thumb"
                        src={`/api/observations/${encodeURIComponent(place.sample_id)}/image?takenAt=${encodeURIComponent(place.sample_taken_at)}`}
                        alt={`${place.name} coral snapshot`}
                        loading="lazy"
                      />
                    ) : <span className="place-option-placeholder"><Waves size={18} /></span>}
                    <span className="place-option-copy">
                      <span>{place.name}</span>
                      <small>{place.observation_count === null ? 'count unavailable' : `${place.observation_count} analyzed`}</small>
                    </span>
                  </button>
                </li>
              )) : (
                <li className="no-suggestions" role="option" aria-disabled="true">No matching named reef locations.</li>
              )}
            </ul>
          )}
        </>
      ) : (
        <form className="coordinate-entry" onSubmit={useCoordinates}>
          <label>
            Latitude
            <input type="number" min="-90" max="90" step="any" value={latitude} onChange={(event) => {
              setLatitude(event.target.value);
              setCoordinateError('');
              if (value?.kind === 'coordinates') onChange(null);
            }} placeholder="-14.6542" required />
          </label>
          <label>
            Longitude
            <input type="number" min="-180" max="180" step="any" value={longitude} onChange={(event) => {
              setLongitude(event.target.value);
              setCoordinateError('');
              if (value?.kind === 'coordinates') onChange(null);
            }} placeholder="145.6983" required />
          </label>
          <button className="coordinate-submit" type="submit">Use this point <Check size={15} /></button>
          {coordinateError && <p className="coordinate-error" role="alert">{coordinateError}</p>}
        </form>
      )}
    </div>
  );
}

interface CoralSummary {
  coralType: string;
  total: number;
  healthy: number;
  candidates: number;
  warmestHealthyTemp: number | null;
  minDepth: number | null;
  maxDepth: number | null;
}

function summarizeCoralTypes(observations: ReefObservation[]): CoralSummary[] {
  const summaries = new Map<string, CoralSummary>();
  observations.forEach((observation) => {
    const coralType = observation.coral_type?.trim() || 'Unknown coral type';
    const summary = summaries.get(coralType) || {
      coralType,
      total: 0,
      healthy: 0,
      candidates: 0,
      warmestHealthyTemp: null,
      minDepth: null,
      maxDepth: null,
    };
    summary.total += 1;
    if (observation.health === 'healthy') {
      summary.healthy += 1;
      if (observation.temp_c !== null && (summary.warmestHealthyTemp === null || observation.temp_c > summary.warmestHealthyTemp)) {
        summary.warmestHealthyTemp = observation.temp_c;
      }
    }
    if (observation.verdict === 'resistant_candidate') summary.candidates += 1;
    if (observation.depth_m !== null) {
      summary.minDepth = summary.minDepth === null ? observation.depth_m : Math.min(summary.minDepth, observation.depth_m);
      summary.maxDepth = summary.maxDepth === null ? observation.depth_m : Math.max(summary.maxDepth, observation.depth_m);
    }
    summaries.set(coralType, summary);
  });
  return [...summaries.values()].sort((left, right) => left.coralType.localeCompare(right.coralType));
}

function CoralComparisonTable({ locations, observations }: { locations: string[]; observations: ReefObservation[] }) {
  const coralTypes = [...new Set(observations.map((observation) => observation.coral_type?.trim() || 'Unknown coral type'))]
    .sort((left, right) => left.localeCompare(right));

  return (
    <div className="comparison-wrap">
      <table className="comparison-table">
        <thead>
          <tr>
            <th scope="col">Coral type</th>
            {locations.map((location) => <th scope="col" key={location}>{location}</th>)}
          </tr>
        </thead>
        <tbody>
          {coralTypes.map((coralType) => (
            <tr key={coralType}>
              <th scope="row">{coralType}</th>
              {locations.map((location) => {
                const summary = summarizeCoralTypes(observations.filter((observation) =>
                  observation.place_name === location && (observation.coral_type?.trim() || 'Unknown coral type') === coralType,
                ))[0];
                return (
                  <td key={location}>
                    {summary ? (
                      <div className="comparison-cell">
                        <strong>{summary.total} {summary.total === 1 ? 'snapshot' : 'snapshots'}</strong>
                        <span>{summary.healthy} healthy · {summary.candidates} candidate{summary.candidates === 1 ? '' : 's'}</span>
                        <span>Warmest healthy: {formatValue(summary.warmestHealthyTemp, '°C')}</span>
                        <span>Depth recorded: {formatDepth(summary.minDepth, summary.maxDepth)}</span>
                      </div>
                    ) : <span className="no-type-records">No records</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDepth(minimum: number | null, maximum: number | null) {
  if (minimum === null || maximum === null) return 'Not recorded';
  return minimum === maximum ? `${minimum} m` : `${minimum}-${maximum} m`;
}

function LocationRecords({ place, radiusKm, observations }: { place: string; radiusKm: number; observations: ReefObservation[] }) {
  const summaries = summarizeCoralTypes(observations);

  return (
    <section className="location-results">
      <div className="location-results-heading">
        <div>
          <p className="eyebrow eyebrow-blue">Within {radiusKm} km</p>
          <h3>{place}</h3>
        </div>
        <span>{observations.length} analyzed {observations.length === 1 ? 'snapshot' : 'snapshots'}</span>
      </div>
      {summaries.length > 0 && (
        <div className="type-summary-list">
          {summaries.map((summary) => (
            <div className="type-summary-row" key={summary.coralType}>
              <strong>{summary.coralType}</strong>
              <span>{summary.total} records · {summary.healthy} healthy · {summary.candidates} candidates</span>
              <span>Warmest healthy: {formatValue(summary.warmestHealthyTemp, '°C')}</span>
            </div>
          ))}
        </div>
      )}
      <div className="observation-list">
        {observations.map((observation) => (
          <ObservationRow observation={observation} key={`${observation.id}-${observation.taken_at}`} />
        ))}
      </div>
    </section>
  );
}

function ObservationRow({ observation }: { observation: ReefObservation }) {
  const imageUrl = `/api/observations/${encodeURIComponent(observation.id)}/image?takenAt=${encodeURIComponent(observation.taken_at)}`;

  return (
    <article className="observation-row">
      {observation.has_image ? (
        <img className="observation-image" src={imageUrl} alt={`Coral snapshot: ${observation.coral_type || 'unknown coral'}`} loading="lazy" />
      ) : <div className="observation-image image-placeholder"><Waves size={23} /></div>}
      <div className="observation-main">
        <div className="observation-title-line">
          <h4>{observation.coral_type || 'Unknown coral type'}</h4>
          <span className={`status-tag status-${observation.verdict || 'unknown'}`}>{verdictName(observation.verdict)}</span>
        </div>
        <p className="observation-meta">{formatDate(observation.taken_at)} · {observation.lat.toFixed(4)}, {observation.lon.toFixed(4)}</p>
        {observation.verdict_reason && <p className="observation-reason">{observation.verdict_reason}</p>}
        <div className="observation-facts">
          {isColorDemo(observation) ? (
            <>
              <span><b>Category</b> {verdictName(observation.verdict)}</span>
              <span><b>Detected</b> {observation.reason || 'Not recorded'}</span>
              <span><b>Confidence</b> {formatPercent(observation.confidence)}</span>
              <span><b>Location</b> {observation.lat.toFixed(5)}, {observation.lon.toFixed(5)} (simulated route)</span>
              <span><b>Heat data</b> Skipped for the live demo</span>
            </>
          ) : (
            <>
              <span><b>Health</b> {healthName(observation.health)}</span>
              <span><b>Paleness</b> {formatValue(observation.paleness, '/6')}</span>
              <span><b>Confidence</b> {formatPercent(observation.confidence)}</span>
              <span><b>NOAA DHW</b> {formatValue(observation.dhw)}</span>
              <span><b>Neighbors</b> {formatValue(observation.neighbor_count)} within 50 m / 7 d</span>
              <span><b>Neighbor median</b> {formatValue(observation.neighbor_median, '/6')}</span>
              <span><b>Water temperature</b> {formatValue(observation.temp_c, '°C')}</span>
              <span><b>Depth</b> {formatValue(observation.depth_m, ' m')}</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function formatPercent(value: number | null) {
  if (value === null || value === undefined) return 'Not recorded';
  return `${(Number(value) * 100).toFixed(1)}%`;
}