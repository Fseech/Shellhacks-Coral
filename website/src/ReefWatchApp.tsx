import { Fragment, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronDown,
  Download,
  GitCompare,
  Send,
  MapPin,
  Sparkles,
  Thermometer,
  Waves,
  X,
} from 'lucide-react';
import { REEF_LOCATIONS } from './data/reefLocations';
import { IS_STATIC, snapshotImage, staticApi } from './staticApi';
import { LAND_ROWS, MAP_STEP, MAP_TOP_LAT } from './data/worldDots';
import type { ReefLocation, ReefObservation } from './types/reefWatch';

type Page = 'overview' | 'explore';
type ApiPayload<T> = { success: boolean; error?: string } & T;
type PlaceSuggestion = ReefLocation;
type Units = 'metric' | 'us';
type PlaceCount = { name: string; observation_count: number; sample_id: string | null; sample_taken_at: string | null };

const KM_PER_MILE = 1.609344;
const RADIUS_CHOICES: Record<Units, { label: string; km: number }[]> = {
  metric: [1, 5, 10, 25, 50].map((km) => ({ label: `${km} km`, km })),
  us: [1, 3, 5, 15, 30].map((miles) => ({ label: `${miles} mi`, km: Math.round(miles * KM_PER_MILE * 100) / 100 })),
};

function shortDistance(meters: number, units: Units) {
  return units === 'us' ? `${Math.round(meters * 3.28084)} ft` : `${meters} m`;
}

function temperature(celsius: number | null, units: Units) {
  if (!isNumber(celsius)) return '—';
  return units === 'us' ? `${(celsius * 9 / 5 + 32).toFixed(1)}°F` : `${celsius.toFixed(1)}°C`;
}

function useStoredUnits(): [Units, (units: Units) => void] {
  const [units, setUnits] = useState<Units>(() => {
    try {
      return window.localStorage.getItem('reef-watch-units') === 'us' ? 'us' : 'metric';
    } catch {
      return 'metric';
    }
  });
  const save = (next: Units) => {
    setUnits(next);
    try {
      window.localStorage.setItem('reef-watch-units', next);
    } catch {
      // storage can be blocked; the choice still applies for this visit
    }
  };
  return [units, save];
}
const heroImage = 'https://images.unsplash.com/photo-1546026423-cc4642628d2b?auto=format&fit=crop&w=2200&q=85';

// health runs from colorful to white, like the coral itself
const HEALTH_ORDER = ['healthy', 'pale', 'bleached', 'dead_algae', 'not_coral'] as const;
const HEALTH_LABEL: Record<string, string> = {
  healthy: 'Healthy',
  pale: 'Pale',
  bleached: 'Bleached',
  dead_algae: 'Dead / algae',
  not_coral: 'Not coral',
};
const VERDICT_LABEL: Record<string, string> = {
  resistant_candidate: 'Survivor',
  regular: 'Regular',
  non_heat_stress: 'Unexplained damage',
  needs_more_data: 'Needs more data',
  dead_or_algae: 'Dead or algae',
  not_coral: 'Not coral',
  demo_alive: 'Alive (demo)',
  demo_dead: 'Dead (demo)',
  demo_unclear: 'No card (demo)',
};
const HIGH_HEAT_DHW = 4;
const MAX_REEFS = 3;

const CORAL_HALF = 'M32 52 C27 48 20 45 13 41 M13 41 C10 39 8 36 6 32 M13 41 C10 42 7 43 4 42 M29 49 C26 43 23 37 21 30 M21 30 C19 26 16 23 13 20 M21 30 C21 25 22 21 22 16 M13 20 C12 17 11 15 9 13 M13 20 C11 20 9 21 7 23 M22 16 C21 13 20 11 18 9 M22 16 C23 13 25 11 26 9 M32 34 C30 28 29 23 28 18 M28 18 C27 15 27 12 26 9';
const CORAL_MID = 'M32 60 V15';
const CORAL_SHINE = 'M31 55 V47 M31 40 V33 M21 33 C20 30 19 28 18 26 M43 33 C44 30 45 28 46 26 M15 41 C12 39 10 37 9 35 M49 41 C52 39 54 37 55 35';

function CoralLogo({ className }: { className?: string }) {
  const layer = (stroke: string, width: number, baseWidth: number) => (
    <g stroke={stroke} strokeWidth={width}>
      <path d={CORAL_HALF} />
      <path d={CORAL_HALF} transform="matrix(-1 0 0 1 64 0)" />
      <path d={CORAL_MID} />
      <path d="M26.5 60 H37.5" strokeWidth={baseWidth} />
    </g>
  );
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {layer('#c24848', 5.4, 6)}
      {layer('#ea7070', 3.4, 4)}
      <path d={CORAL_SHINE} stroke="#fdc4b6" strokeWidth={1.2} opacity={0.95} />
    </svg>
  );
}

// fixed behind every page: soft light rays, a few drifting particles, three slow bubbles, faint texture
function OceanBackdrop() {
  return (
    <div className="ocean" aria-hidden="true">
      <span className="ocean-rays" />
      <span className="ocean-particles" />
      <span className="ocean-bubble" style={{ left: '8%', animationDelay: '0s' }} />
      <span className="ocean-bubble" style={{ left: '63%', animationDelay: '12s', width: 5, height: 5 }} />
      <span className="ocean-bubble" style={{ left: '88%', animationDelay: '23s' }} />
    </div>
  );
}

function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 12);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return scrolled;
}

// sections fade up as they scroll into view, on every page
function useRevealOnScroll() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        // also reveal anything already scrolled past, so fast jumps never leave blank sections
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    const scan = () => document.querySelectorAll('.reveal:not(.is-visible)').forEach((element) => observer.observe(element));
    scan();
    const mutations = new MutationObserver(scan);
    mutations.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, []);
}

async function readApi<T>(url: string, signal: AbortSignal): Promise<ApiPayload<T>> {
  if (IS_STATIC) {
    const payload = await staticApi(url) as ApiPayload<T>;
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    return payload;
  }
  const response = await fetch(url, { signal });
  const payload = await response.json() as ApiPayload<T>;
  if (!response.ok) throw new Error(payload.error || 'The data service is unavailable.');
  return payload;
}

function isNumber(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

function formatValue(value: number | null | undefined, suffix = '') {
  return isNumber(value)
    ? `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })}${suffix}`
    : '—';
}

function formatPercent(value: number | null) {
  return isNumber(value) ? `${Math.round(Number(value) * 100)}%` : '—';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value));
}

function formatDateTime(value: string) {
  return `${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(value))} UTC`;
}

function formatCoordinates(lat: number, lon: number) {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
}

function siteLabel(name: string) {
  return name.replace(' - ', ' — ').replace('North Male Atoll', 'North Malé Atoll');
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// "coral" is its own plural: 1 coral, 4 coral
function coralCount(count: number) {
  return `${count.toLocaleString()} coral`;
}

function plural(count: number, word: string) {
  return `${count.toLocaleString()} ${word}${count === 1 ? '' : 's'}`;
}

export default function ReefWatchApp() {
  const page: Page = window.location.pathname.startsWith('/explore') ? 'explore' : 'overview';
  const scrolled = useScrolled();
  useRevealOnScroll();

  return (
    <div className="site-shell">
      <OceanBackdrop />
      <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
        <a className="brand" href="/" aria-label="Reef Watch home">
          <CoralLogo className="brand-logo" />
          Reef Watch
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="/" aria-current={page === 'overview' ? 'page' : undefined}>Overview</a>
          <a href="/explore" aria-current={page === 'explore' ? 'page' : undefined}>Explore data</a>
        </nav>
        <a className="pill pill-dark header-cta" href="/explore">Open explorer <ArrowRight size={14} /></a>
      </header>

      {page === 'overview' ? <OverviewPage /> : <ExplorePage />}

      {!IS_STATIC && <ChatWidget />}

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="brand brand-light"><CoralLogo className="brand-logo" />Reef Watch</span>
            <p>For divers, fishers, boat crews and marine scientists: finding coral that survive the heat, and damage the heat can’t explain.</p>
          </div>
          <div className="footer-cols">
            <div>
              <span className="mono-label">Explore</span>
              <a href="/explore">Data explorer</a>
              <a href="/#reef-map">Reef map</a>
              <a href="/#how-it-works">How it works</a>
              <a href="/explore#raw-data">Raw data &amp; API</a>
            </div>
            <div>
              <span className="mono-label">Data</span>
              <span>NOAA Coral Reef Watch</span>
              <span>Google Gemini</span>
              <span>Tiger Cloud</span>
            </div>
          </div>
        </div>
        <p className="footer-base">Read-only research data. A survivor is a lead for further study, not proof of heat resistance.</p>
      </footer>
    </div>
  );
}

interface Summary {
  total: number;
  healthy: number;
  pale: number;
  bleached: number;
  dead_algae: number;
  not_coral: number;
  candidates: number;
  non_heat_stress: number;
  avg_paleness: number | null;
  peak_dhw: number | null;
}

function OverviewPage() {
  const [counts, setCounts] = useState<PlaceCount[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    readApi<{ places: PlaceCount[] }>('/api/places?radiusKm=10', controller.signal)
      .then((payload) => setCounts(payload.places))
      .catch(() => undefined);
    readApi<{ summary: Summary }>('/api/summary', controller.signal)
      .then((payload) => setSummary(payload.summary))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const sitesWithData = counts ? counts.filter((place) => place.observation_count > 0).length : null;
  const [latestHidden, setLatestHidden] = useState(() => {
    try {
      return window.sessionStorage.getItem('reef-watch-hide-latest') === '1';
    } catch {
      return false;
    }
  });
  function hideLatest() {
    setLatestHidden(true);
    try {
      window.sessionStorage.setItem('reef-watch-hide-latest', '1');
    } catch {
      // storage can be blocked; hiding still works for this page view
    }
  }
  const latest = counts?.filter((place) => place.sample_id && place.sample_taken_at)
    .sort((left, right) => (right.sample_taken_at || '').localeCompare(left.sample_taken_at || ''))[0];

  const steps = [
    { title: 'Capture', copy: 'A low-cost diver device records the reef and keeps only the snapshots that matter.' },
    { title: 'Assess', copy: 'Gemini describes each coral in the photo: its kind, its health and how pale it is (1–6).' },
    { title: 'Add heat', copy: 'NOAA heat-stress data for the same place and date shows how much heat each coral lived through.' },
    { title: 'Compare', copy: 'Each coral is compared with its neighbors to decide: survivor, unexplained damage, or neither.' },
  ];

  const verdicts = [
    { key: 'resistant_candidate', copy: `A healthy, colorful coral in high heat (≥ ${HIGH_HEAT_DHW} DHW) while the coral around it are pale, bleaching or dying. This is what we are searching for: a coral worth studying further.` },
    { key: 'non_heat_stress', copy: 'The coral is bleaching or dying even though the heat data says it should be healthy. Something other than heat, such as pollution, runoff or disease, is the likely cause.' },
    { key: 'regular', copy: 'It fits its neighbors and the heat it has experienced.' },
    { key: 'needs_more_data', copy: 'It has fewer than 2 neighbors, or no NOAA heat value yet.' },
  ];

  return (
    <main>
      <section className="hero" aria-labelledby="hero-title">
        <img className="hero-image" src={heroImage} alt="Coral colonies growing across a tropical reef" />
        <div className="hero-shade" />
        <div className="hero-content">
          <p className="eyebrow eyebrow-light"><span className="live-dot" /> Field science for a warming ocean</p>
          <h1 id="hero-title">Find the coral that <em>outlast</em> the heat.</h1>
          <p className="hero-copy">
            Reef Watch helps divers, fishers, boat crews and marine scientists spot coral that stay healthy in heat that bleaches
            their neighbors, and damage the heat can’t explain. A low-cost device, Gemini and NOAA heat data do the searching.
          </p>
          <div className="hero-actions">
            <a className="pill pill-hot" href="/explore">Explore reef data <ArrowRight size={15} /></a>
            <a className="pill pill-glass" href="#how-it-works">How it works</a>
          </div>
        </div>
        {latest && !latestHidden && (
          <div className="hero-card">
            <a className="hero-card-link" href="/explore">
              <img
                src={snapshotImage(latest.sample_id!, latest.sample_taken_at!)}
                alt=""
              />
              <span className="hero-card-copy">
                <span className="mono-label">Latest analyzed snapshot</span>
                <strong>{siteLabel(latest.name)}</strong>
                <span>{plural(latest.observation_count, 'snapshot')} nearby <ArrowUpRight size={13} /></span>
              </span>
            </a>
            <button className="hero-card-close" type="button" onClick={hideLatest} aria-label="Hide latest analyzed snapshot" title="Hide">
              <X size={14} />
            </button>
          </div>
        )}
      </section>

      <section className="source-strip reveal" aria-label="Data sources">
        <span className="mono-label">Built on</span>
        <span className="source">NOAA Coral Reef Watch</span>
        <span className="source">Google Gemini</span>
        <span className="source">Tiger Cloud · TimescaleDB</span>
        <span className="source">Wikimedia Commons</span>
      </section>

      <section className="section mission reveal" id="mission" aria-labelledby="mission-title">
        <div className="section-head centered">
          <p className="eyebrow eyebrow-blue">What Reef Watch does</p>
          <h2 id="mission-title">Two findings <em>that matter.</em></h2>
          <p>
            Reef Watch is for anyone who cares about coral reefs around the world: divers, hobby fishers, boat crews and
            “sea shepherds”, marine hobbyists, and the scientists working to stop coral bleaching. A low-cost device records
            the reef and keeps only the snapshots that matter: coral whose condition doesn’t match what the water temperature predicts.
          </p>
        </div>
        <ol className="mission-steps">
          <li>
            <span className="mono-label">01 · Finding one</span>
            <h3>Survivors</h3>
            <p>A healthy, colorful coral while the coral around it in the same water are pale, bleaching or dying, and satellite heat stress is high.</p>
          </li>
          <li>
            <span className="mono-label">02 · Finding two</span>
            <h3>Unexplained damage</h3>
            <p>A coral that is bleaching or dying even though the heat data says it should be healthy. Something other than heat, such as pollution, runoff or disease, is probably to blame.</p>
          </li>
          <li>
            <span className="mono-label">03 · How it decides</span>
            <h3>Gemini, NOAA and neighbors</h3>
            <p>Gemini describes each snapshot: the kind of coral, its health and how pale it is. Reef Watch then compares every coral with its neighbors and with NOAA heat stress for the same place and date to decide which finding it is, if either.</p>
          </li>
        </ol>
        <div className="candidate-callout">
          <VerdictTag verdict="resistant_candidate" />
          <p>
            <strong>Why it matters:</strong> we want to learn which kinds of coral stay alive longer in heat that would otherwise
            cause bleaching. Survivors, and the heat-resistant algae living inside them, are worth studying further; they may help
            other coral adapt to warmer seas. The data is fascinating for marine hobbyists and can be critical for scientists
            looking for ways to stop coral bleaching.
          </p>
        </div>
      </section>

      <section className="section map-section reveal" id="reef-map">
        <div className="section-head centered">
          <p className="eyebrow eyebrow-blue">Reef map</p>
          <h2>Region: <em>Earth.</em></h2>
          <p>{REEF_LOCATIONS.length} reef sites across the Atlantic, Pacific and Indian oceans, each checked against NOAA’s 5 km daily heat grid.</p>
        </div>
        <ReefMap counts={counts} />
        <div className="callout-row">
          <div className="callout">
            <MapPin size={17} />
            <strong>{sitesWithData === null ? '—' : sitesWithData} of {REEF_LOCATIONS.length} sites with data</strong>
            <p>Coral-colored sites have analyzed snapshots; teal sites are still waiting for surveys.</p>
          </div>
          <div className="callout">
            <Thermometer size={17} />
            <strong>5 km daily heat grid</strong>
            <p>Degree Heating Weeks from NOAA satellites at each coral’s exact place and date.</p>
          </div>
          <div className="callout">
            <Waves size={17} />
            <strong>50 m neighborhoods</strong>
            <p>Each coral is judged against living neighbors from the same week, not the whole ocean.</p>
          </div>
        </div>
      </section>

      <section className="section reveal" id="how-it-works">
        <div className="section-head">
          <p className="eyebrow eyebrow-blue">How it works</p>
          <h2>From a snapshot to a <em>research lead.</em></h2>
        </div>
        <ol className="timeline">
          {steps.map((step, index) => (
            <li key={step.title}>
              <span className="timeline-dot">{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="dark-band reveal" aria-labelledby="numbers-title">
        <div className="section-head centered">
          <p className="eyebrow eyebrow-light"><span className="live-dot" /> Live from the database</p>
          <h2 id="numbers-title">Real numbers, <em>straight from the reef.</em></h2>
        </div>
        <div className="dark-cards">
          <article className="dark-card">
            <span className="mono-label">Snapshots analyzed</span>
            <strong>{summary ? summary.total.toLocaleString() : '—'}</strong>
            <p>One dot per coral, colored by health.</p>
            <SnapshotDots summary={summary} />
          </article>
          <article className="dark-card">
            <span className="mono-label">Average paleness</span>
            <strong>{summary && isNumber(summary.avg_paleness) ? summary.avg_paleness : '—'}<small> / 6</small></strong>
            <p>1 is dark and healthy, 6 is completely white.</p>
            <div className="scale-bar" aria-hidden="true">
              {[1, 2, 3, 4, 5, 6].map((step) => <span key={step} className={`pale-${step}`} />)}
              {summary && isNumber(summary.avg_paleness) && (
                <i style={{ left: `${((summary.avg_paleness - 1) / 5) * 100}%` }} />
              )}
            </div>
          </article>
          <article className="dark-card">
            <span className="mono-label">Survivors found</span>
            <strong className="hot">{summary ? summary.candidates : '—'}</strong>
            <p>Healthy coral whose neighbors paled under high heat. Peak heat so far: {summary ? formatValue(summary.peak_dhw, ' DHW') : '—'}.</p>
            <HeatGauge value={summary?.peak_dhw ?? null} />
          </article>
        </div>
      </section>

      <section className="section reveal">
        <div className="section-head">
          <p className="eyebrow eyebrow-blue">Reading the results</p>
          <h2>Every coral gets a <em>verdict.</em></h2>
        </div>
        <div className="card-grid two">
          {verdicts.map((verdict) => (
            <article className="card verdict-card" key={verdict.key}>
              <VerdictTag verdict={verdict.key} />
              <p>{verdict.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-band reveal">
        <p className="eyebrow eyebrow-light">Data explorer</p>
        <h2>Start with a reef.</h2>
        <p>Pick a site, then compare up to three reefs side by side.</p>
        <a className="pill pill-light" href="/explore">Open data explorer <ArrowUpRight size={15} /></a>
      </section>
    </main>
  );
}

const MAP_WIDTH = 360;
const MAP_HEIGHT = LAND_ROWS.length * MAP_STEP;

function project(lat: number, lon: number) {
  return { x: lon + 180, y: MAP_TOP_LAT - lat + MAP_STEP / 2 };
}

function ReefMap({ counts }: { counts: PlaceCount[] | null }) {
  return (
    <div className="reef-map">
      <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} role="img" aria-label="World map of Reef Watch sites">
        {LAND_ROWS.flatMap((row, rowIndex) => [...row].map((cell, columnIndex) => cell === '1' ? (
          <circle
            key={`${rowIndex}-${columnIndex}`}
            className="land-dot"
            cx={columnIndex * MAP_STEP + MAP_STEP / 2}
            cy={rowIndex * MAP_STEP + MAP_STEP / 2}
            r={0.62}
          />
        ) : null))}
        {REEF_LOCATIONS.map((location) => {
          const count = counts?.find((place) => place.name === location.name)?.observation_count ?? 0;
          const { x, y } = project(location.lat, location.lon);
          return (
            <g key={location.name} className={count ? 'site site-live' : 'site'}>
              <title>{`${location.name}: ${count ? plural(count, 'snapshot') : 'no data yet'}`}</title>
              {count > 0 && <circle className="site-pulse" cx={x} cy={y} r={4} />}
              <circle className="site-ring" cx={x} cy={y} r={2.6} />
              <circle className="site-core" cx={x} cy={y} r={1.4} />
            </g>
          );
        })}
      </svg>
      <ul className="map-legend">
        <li><span className="legend-dot live" /> Has analyzed snapshots</li>
        <li><span className="legend-dot" /> Awaiting surveys</li>
      </ul>
    </div>
  );
}

function SnapshotDots({ summary }: { summary: Summary | null }) {
  if (!summary) return <div className="dot-matrix" />;
  const dots = HEALTH_ORDER.flatMap((health) => Array.from({ length: summary[health] }, () => health));
  const shown = dots.slice(0, 60);
  return (
    <div className="dot-matrix" role="img" aria-label={HEALTH_ORDER.map((health) => `${HEALTH_LABEL[health]} ${summary[health]}`).join(', ')}>
      {shown.map((health, index) => <span key={index} className={`health-${health}`} title={HEALTH_LABEL[health]} />)}
      {dots.length > shown.length && <em>+{dots.length - shown.length}</em>}
      <p className="dot-caption">
        {HEALTH_ORDER.filter((health) => summary[health] > 0).map((health) => `${summary[health]} ${HEALTH_LABEL[health].toLowerCase()}`).join(' · ')}
      </p>
    </div>
  );
}

function HeatGauge({ value }: { value: number | null }) {
  const max = 12;
  const position = isNumber(value) ? Math.min(value, max) / max : 0;
  return (
    <div className="heat-gauge" aria-hidden="true">
      <div className="heat-track">
        <span className="heat-fill" style={{ width: `${position * 100}%` }} />
        <span className="heat-threshold" style={{ left: `${(HIGH_HEAT_DHW / max) * 100}%` }} />
      </div>
      <div className="heat-labels"><span>0</span><span>High heat · {HIGH_HEAT_DHW}</span><span>{max} DHW</span></div>
    </div>
  );
}

function ExplorePage() {
  const [units, setUnits] = useStoredUnits();
  const [radiusIndex, setRadiusIndex] = useState(2);
  const radius = RADIUS_CHOICES[units][radiusIndex];
  const radiusKm = radius.km;
  const [places, setPlaces] = useState<PlaceSuggestion[]>(REEF_LOCATIONS.map((location) => ({
    ...location,
    observation_count: null,
    sample_id: null,
    sample_taken_at: null,
  })));
  const [placesLoaded, setPlacesLoaded] = useState(false);
  const [placeError, setPlaceError] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [observations, setObservations] = useState<ReefObservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataError, setDataError] = useState('');
  const [compareBase, setCompareBase] = useState<ReefObservation | null>(null);
  const [compareWith, setCompareWith] = useState<ReefObservation | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    readApi<{ radiusKm: number; places: PlaceCount[] }>(`/api/places?radiusKm=${radiusKm}`, controller.signal)
      .then((payload) => {
        setPlaces((current) => current.map((location) => {
          const match = payload.places.find((place) => place.name === location.name);
          return {
            ...location,
            observation_count: match?.observation_count ?? 0,
            sample_id: match?.sample_id ?? null,
            sample_taken_at: match?.sample_taken_at ?? null,
          };
        }));
        setPlacesLoaded(true);
        setPlaceError('');
      })
      .catch((error: Error) => {
        if (error.name !== 'AbortError') setPlaceError(error.message);
      });
    return () => controller.abort();
  }, [radiusKm]);

  useEffect(() => {
    setCompareBase(null);
    setCompareWith(null);
    if (!selected.length) {
      setObservations([]);
      setDataError('');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      locations: JSON.stringify(selected.map((name) => ({ kind: 'place', name }))),
      radiusKm: String(radiusKm),
    });
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
  }, [selected, radiusKm]);

  const reefsWithData = places.filter((place) => (place.observation_count ?? 0) > 0);
  const totalSnapshots = reefsWithData.reduce((total, place) => total + (place.observation_count ?? 0), 0);
  const selectedRecords = observations.filter((observation) => selected.includes(observation.place_name));

  function toggleReef(name: string) {
    setSelected((current) => current.includes(name)
      ? current.filter((item) => item !== name)
      : current.length < MAX_REEFS ? [...current, name] : current);
  }

  function switchUnits(next: Units) {
    // keep roughly the same search distance when the unit system changes
    const target = radiusKm;
    const choices = RADIUS_CHOICES[next];
    const nearest = choices.reduce((best, choice, index) => Math.abs(choice.km - target) < Math.abs(choices[best].km - target) ? index : best, 0);
    setUnits(next);
    setRadiusIndex(nearest);
  }

  const pickingFor = compareBase && !compareWith ? compareBase : null;

  return (
    <main className="explore-page">
      <section className="page-banner centered">
        <img className="hero-image" src={heroImage} alt="" />
        <div className="hero-shade" />
        <div className="banner-copy">
          <p className="eyebrow eyebrow-light"><span className="live-dot" /> Data explorer</p>
          <h1>Explore <em>reef data.</em></h1>
          <p>Survivors and unexplained damage, coral by coral. Pick the reefs you want to see and compare.</p>
        </div>
        <div className="head-chips">
          <span><b>{reefsWithData.length}</b> reefs with data</span>
          <span><b>{totalSnapshots}</b> analyzed coral</span>
        </div>
      </section>

      <HowToGuide step={compareBase ? 3 : selected.length ? 2 : 1} />

      <section className="center-section reveal" aria-labelledby="available-title">
        <p className="eyebrow eyebrow-blue">Step 1 · Choose reefs</p>
        <h2 id="available-title">Reefs surveyed <em>so far.</em></h2>
        <p className="center-lede">
          This collection grows with every dive that’s uploaded, so check back as new reefs appear.
          Choose up to three to explore side by side.
        </p>

        <div className="controls-row">
          <div className="control">
            <span className="mono-label">Search radius</span>
            <div className="segmented" role="group" aria-label="Search radius">
              {RADIUS_CHOICES[units].map((choice, index) => (
                <button key={choice.label} type="button" aria-pressed={index === radiusIndex} className={index === radiusIndex ? 'active' : ''} onClick={() => setRadiusIndex(index)}>
                  {choice.label}
                </button>
              ))}
            </div>
          </div>
          <div className="control">
            <span className="mono-label">Units</span>
            <div className="segmented" role="group" aria-label="Units">
              <button type="button" aria-pressed={units === 'metric'} className={units === 'metric' ? 'active' : ''} onClick={() => switchUnits('metric')}>Metric</button>
              <button type="button" aria-pressed={units === 'us'} className={units === 'us' ? 'active' : ''} onClick={() => switchUnits('us')}>US</button>
            </div>
          </div>
        </div>
        <p className="muted-note">
          {selected.length >= MAX_REEFS ? 'Three reefs selected, the most you can view at once. ' : ''}
          The radius gathers snapshots around each reef; verdicts compare neighbors within {shortDistance(50, units)} and 7 days.
        </p>

        <div className="reef-picker" role="group" aria-label="Reefs with data">
          {!placesLoaded && !placeError && <p className="muted-note"><span className="spinner" /> Loading reefs…</p>}
          {placesLoaded && reefsWithData.length === 0 && <p className="muted-note">No analyzed reefs within this radius yet.</p>}
          {reefsWithData.map((place) => {
            const isSelected = selected.includes(place.name);
            const [region, site] = place.name.includes(' - ') ? siteLabel(place.name).split(' — ') : ['Reef site', siteLabel(place.name)];
            return (
              <button
                key={place.name}
                type="button"
                className={`reef-option${isSelected ? ' is-selected' : ''}`}
                aria-pressed={isSelected}
                disabled={!isSelected && selected.length >= MAX_REEFS}
                onClick={() => toggleReef(place.name)}
              >
                <span className="reef-disc">
                  {place.sample_id && place.sample_taken_at
                    ? <img src={snapshotImage(place.sample_id, place.sample_taken_at)} alt="" loading="lazy" />
                    : <Waves size={20} />}
                  {isSelected && <span className="reef-check"><Check size={13} strokeWidth={3} /></span>}
                </span>
                <strong>{site}</strong>
                <small>{region} · {coralCount(place.observation_count ?? 0)}</small>
              </button>
            );
          })}
        </div>
        {placesLoaded && reefsWithData.length > 0 && selected.length === 0 && (
          <p className="start-hint"><ArrowUp size={15} /> Start by tapping a reef above. Its coral will appear below.</p>
        )}
        {(placeError || dataError) && (
          <div className="alert" role="alert">
            <strong>Live reef data isn’t available.</strong> {dataError || placeError}
          </div>
        )}
      </section>

      {selected.length > 0 && (
        <section className="results" aria-live="polite">
          {loading ? (
            <div className="empty-state"><span className="spinner" /> Loading analyzed observations…</div>
          ) : dataError ? null : selectedRecords.length === 0 ? (
            <div className="empty-state">No analyzed snapshots within {radius.label} of these reefs yet.</div>
          ) : (
            <>
              <div className="center-head reveal">
                <p className="eyebrow eyebrow-blue">Reef summary</p>
                <h2>{coralCount(selectedRecords.length)} across {plural(selected.length, 'reef')}</h2>
              </div>

              <div className="summary-grid reveal">
                {selected.map((name) => (
                  <LocationSummary
                    key={name}
                    place={name}
                    observations={selectedRecords.filter((observation) => observation.place_name === name)}
                  />
                ))}
              </div>


              {compareBase && compareWith && (
                <ComparePanel
                  a={compareBase}
                  b={compareWith}
                  units={units}
                  onSwap={() => { setCompareBase(compareWith); setCompareWith(compareBase); }}
                  onClear={() => { setCompareBase(null); setCompareWith(null); }}
                  onRepick={() => setCompareWith(null)}
                />
              )}

              {!compareBase && (
                <p className="step-hint reveal">
                  <span className="step-num">2</span>
                  <span><b>Tap any coral</b> to open its data diagram. From there, press <b>Compare with another coral</b> to put it side by side with a coral from any reef.</span>
                </p>
              )}

              <CoralBar
                reefs={selected}
                radiusLabel={radius.label}
                units={units}
                records={selectedRecords}
                pickingFor={pickingFor}
                onCompare={(observation) => { setCompareBase(observation); setCompareWith(null); }}
                onPick={(observation) => setCompareWith(observation)}
              />

              {pickingFor && (
                <CompareTray
                  base={pickingFor}
                  reefs={reefsWithData}
                  radiusKm={radiusKm}
                  pageRecords={selectedRecords}
                  onPick={(observation) => setCompareWith(observation)}
                  onCancel={() => setCompareBase(null)}
                />
              )}
            </>
          )}
        </section>
      )}

      <RawDataSection />
    </main>
  );
}

const FIELD_GUIDE: [string, string][] = [
  ['taken_at', 'Snapshot time, UTC'],
  ['lat, lon', 'GPS position (decimal degrees)'],
  ['coral_type', 'Common name from the AI scorer'],
  ['health', 'healthy · pale · bleached · dead_algae · not_coral'],
  ['paleness', '1 (dark, healthy) to 6 (completely white)'],
  ['confidence', 'AI confidence, 0 to 1'],
  ['dhw', 'NOAA Degree Heating Weeks at that place and date'],
  ['neighbor_count', 'Living coral within 50 m and 7 days'],
  ['neighbor_median', 'Median paleness of those neighbors'],
  ['verdict', 'resistant_candidate (survivor) · non_heat_stress (unexplained damage) · regular · needs_more_data · …'],
  ['is_test', 'true for simulated development observations'],
  ['image_url', 'Link to the original snapshot photo'],
];

function RawDataSection() {
  const origin = window.location.origin;
  return (
    <section className="raw-data reveal" id="raw-data" aria-labelledby="raw-data-title">
      <div className="raw-grid">
        <div>
          <p className="eyebrow eyebrow-blue">For researchers</p>
          <h2 id="raw-data-title">Take the <em>raw data.</em></h2>
          <p className="raw-lede">
            Every analyzed snapshot comes with its AI scores, NOAA heat value, neighbor comparison and verdict.
            {IS_STATIC ? 'Download the full dataset below.' : 'Download it or pull it straight from the read-only API.'}
          </p>
          <div className="raw-downloads">
            <a className="pill pill-dark" href={IS_STATIC ? '/data/reef-watch.csv' : '/api/export?format=csv'} download><Download size={15} /> Full dataset · CSV</a>
            <a className="pill pill-outline" href={IS_STATIC ? '/data/reef-watch.json' : '/api/export?format=json'} download><Download size={15} /> JSON</a>
          </div>
          <p className="fine-print">
            Rows marked is_test are simulated observations paired with real NOAA heat history. Test photos come from
            Wikimedia Commons under their Creative Commons licenses.
          </p>
        </div>
        {!IS_STATIC && (
        <div className="api-block">
          <span className="mono-label">API · read-only · no key needed</span>
          <pre>{`# everything, as CSV
curl -o reef-watch.csv "${origin}/api/export?format=csv"

# one or more reefs, as JSON
curl -G "${origin}/api/export" \\
  --data-urlencode 'format=json' \\
  --data-urlencode 'radiusKm=10' \\
  --data-urlencode 'locations=[{"kind":"place","name":"Great Barrier Reef - Moore Reef"}]'

# any point: {"kind":"coordinates","lat":-16.87,"lon":146.23}
# dataset totals: GET /api/summary`}</pre>
        </div>
        )}
      </div>
      <dl className="field-guide">
        {FIELD_GUIDE.map(([field, meaning]) => (
          <div key={field}>
            <dt>{field}</dt>
            <dd>{meaning}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function healthCounts(observations: ReefObservation[]) {
  const counts: Record<string, number> = Object.fromEntries(HEALTH_ORDER.map((health) => [health, 0]));
  observations.forEach((observation) => {
    if (observation.health && observation.health in counts) counts[observation.health] += 1;
  });
  return counts;
}

function average(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
}

function LocationSummary({ place, observations }: { place: string; observations: ReefObservation[] }) {
  const counts = healthCounts(observations);
  const paleness = observations.map((observation) => observation.paleness).filter(isNumber);
  const heat = observations.map((observation) => observation.dhw).filter(isNumber);
  const candidates = observations.filter((observation) => observation.verdict === 'resistant_candidate').length;
  const peakHeat = heat.length ? Math.max(...heat) : null;

  return (
    <article className="card summary-card">
      <div className="summary-head">
        <h3>{siteLabel(place)}</h3>
        <span className="mono-label">{coralCount(observations.length)}</span>
      </div>
      <HealthBar counts={counts} total={observations.length} />
      <dl className="summary-stats">
        <div>
          <dt>Avg paleness</dt>
          <dd>{formatValue(average(paleness))}<small>/6</small></dd>
        </div>
        <div>
          <dt>Peak heat</dt>
          <dd>{formatValue(peakHeat)}<small> DHW</small></dd>
          {isNumber(peakHeat) && peakHeat >= HIGH_HEAT_DHW && <span className="heat-flag">High heat</span>}
        </div>
        <div>
          <dt title="Survivors: coral that stayed healthy through high heat while their neighbors paled">Survivors</dt>
          <dd className={candidates ? 'hot' : ''}>{candidates}</dd>
        </div>
      </dl>
    </article>
  );
}

function HealthBar({ counts, total }: { counts: Record<string, number>; total: number }) {
  const present = HEALTH_ORDER.filter((health) => counts[health] > 0);
  return (
    <div className="health">
      <div className="health-bar" role="img" aria-label={present.map((health) => `${HEALTH_LABEL[health]} ${counts[health]}`).join(', ')}>
        {present.map((health) => (
          <span
            key={health}
            className={`health-seg health-${health}`}
            style={{ flexGrow: counts[health] }}
            title={`${HEALTH_LABEL[health]}: ${counts[health]} of ${total} (${Math.round((counts[health] / total) * 100)}%)`}
          />
        ))}
      </div>
      <ul className="health-legend">
        {present.map((health) => (
          <li key={health}>
            <span className={`swatch health-${health}`} />
            {HEALTH_LABEL[health]} <b>{counts[health]}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HowToGuide({ step }: { step: number }) {
  const steps = [
    { title: 'Choose reefs', copy: 'Tap one or more reefs (up to three) to load their coral.' },
    { title: 'Explore coral', copy: 'Tap a coral to see its health, heat and neighbors in a diagram.' },
    { title: 'Compare', copy: 'Press Compare, then pick a second coral from any reef.' },
  ];
  return (
    <ol className="how-to" aria-label="How to use the explorer">
      {steps.map((item, index) => {
        const number = index + 1;
        const state = number < step ? 'done' : number === step ? 'current' : 'next';
        return (
          <li key={item.title} className={`how-step is-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="how-num">{state === 'done' ? <Check size={14} strokeWidth={3} /> : number}</span>
            <span className="how-copy"><b>{item.title}</b><small>{item.copy}</small></span>
          </li>
        );
      })}
    </ol>
  );
}

function CandidateStatus({ observation }: { observation: ReefObservation }) {
  const isCandidate = observation.verdict === 'resistant_candidate';
  const highHeat = isNumber(observation.dhw) && observation.dhw >= HIGH_HEAT_DHW;
  const why = isCandidate
    ? 'Stayed healthy while its neighbors paled in high heat'
    : !highHeat
      ? `Not tested yet: needs high heat (${HIGH_HEAT_DHW}+ DHW)`
      : 'Paled like its neighbors under high heat';
  return (
    <span className={`candidate-status${isCandidate ? ' is-yes' : ''}`} title={why}>
      <span className="candidate-mark">{isCandidate ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}</span>
      <span><b>Survivor: {isCandidate ? 'Yes' : 'No'}</b><small>{why}</small></span>
    </span>
  );
}

function VerdictTag({ verdict }: { verdict: string | null }) {
  const key = verdict || 'unknown';
  return <span className={`verdict verdict-${key}`}>{verdict ? VERDICT_LABEL[verdict] || verdict.replaceAll('_', ' ') : 'No verdict'}</span>;
}

function PalenessScale({ value }: { value: number | null }) {
  const level = isNumber(value) ? Math.round(value) : null;
  return (
    <div className="paleness" aria-label={level ? `Paleness ${level} of 6` : 'Paleness not recorded'}>
      <span className="paleness-cells" aria-hidden="true">
        {[1, 2, 3, 4, 5, 6].map((step) => (
          <span key={step} className={`pale-cell pale-${step}${step === level ? ' current' : ''}`} />
        ))}
      </span>
      <span className="paleness-value">{level ? `${level}/6` : '—'}</span>
    </div>
  );
}

interface CoralBarProps {
  reefs: string[];
  radiusLabel: string;
  units: Units;
  records: ReefObservation[];
  pickingFor: ReefObservation | null;
  onCompare: (observation: ReefObservation) => void;
  onPick: (observation: ReefObservation) => void;
}

const keyOf = (observation: ReefObservation) => `${observation.id}-${observation.taken_at}`;

// one sideways-scrolling bar with a labeled group of coral per selected reef
function CoralBar({ reefs, radiusLabel, units, records, pickingFor, onCompare, onPick }: CoralBarProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const scrollerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  const updateEdges = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    setEdges({
      start: scroller.scrollLeft <= 2,
      end: scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 2,
    });
  };

  useEffect(() => {
    updateEdges();
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [reefs, records]);

  useEffect(() => {
    if (openKey && !records.some((observation) => keyOf(observation) === openKey)) setOpenKey(null);
  }, [records, openKey]);

  useEffect(() => {
    if (openKey) panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [openKey]);

  function scrollBar(direction: 1 | -1) {
    const scroller = scrollerRef.current;
    if (scroller) scroller.scrollBy({ left: direction * scroller.clientWidth * 0.8, behavior: 'smooth' });
  }

  const open = records.find((observation) => keyOf(observation) === openKey);
  const baseKey = pickingFor ? keyOf(pickingFor) : null;
  const title = reefs.length === 1 ? siteLabel(reefs[0]) : `${coralCount(records.length)} from ${plural(reefs.length, 'reef')}`;

  return (
    <section className={`network-section reveal${pickingFor ? ' is-picking' : ''}`}>
      <div className="center-head">
        <p className="eyebrow eyebrow-blue">Step 2 · Explore coral</p>
        <h3>{title}</h3>
        <span className="mono-label">
          within {radiusLabel} · {reefs.length > 1 ? 'scroll sideways through every reef · ' : ''}{pickingFor ? 'pick a coral to compare' : 'tap a coral to open its data'}
        </span>
      </div>

      <div className={`coral-bar${edges.start ? ' at-start' : ''}${edges.end ? ' at-end' : ''}`}>
        <button className="bar-arrow bar-prev" type="button" onClick={() => scrollBar(-1)} disabled={edges.start} aria-label="Scroll to earlier reefs">
          <ArrowLeft size={18} />
        </button>
        <div className="bar-scroller" ref={scrollerRef} onScroll={updateEdges} tabIndex={0} aria-label="Coral by reef, scroll sideways">
          {reefs.map((name) => {
            const coral = records.filter((observation) => observation.place_name === name);
            return (
              <div className="reef-group" key={name} role="group" aria-label={siteLabel(name)}>
                <div className="reef-group-head">
                  <strong>{siteLabel(name).split(' — ').pop()}</strong>
                  <small>{name.includes(' - ') ? siteLabel(name).split(' — ')[0] : 'Reef site'} · {coralCount(coral.length)}</small>
                </div>
                <div className="reef-group-nodes">
                  {coral.map((observation) => {
                    const key = keyOf(observation);
                    return (
                      <CoralNode
                        key={key}
                        observation={observation}
                        active={key === openKey}
                        state={key === baseKey ? 'base' : pickingFor ? 'pickable' : undefined}
                        onToggle={() => {
                          if (pickingFor) {
                            if (key !== baseKey) onPick(observation);
                            return;
                          }
                          setOpenKey((current) => current === key ? null : key);
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <button className="bar-arrow bar-next" type="button" onClick={() => scrollBar(1)} disabled={edges.end} aria-label="Scroll to more reefs">
          <ArrowRight size={18} />
        </button>
      </div>

      {open && (
        <NetworkPanel
          key={`panel-${openKey}`}
          ref={panelRef}
          observation={open}
          units={units}
          onClose={() => setOpenKey(null)}
          onCompare={() => onCompare(open)}
        />
      )}
    </section>
  );
}

function coralImage(observation: ReefObservation) {
  return snapshotImage(observation.id, observation.taken_at);
}

function CoralDisc({ observation, size }: { observation: ReefObservation; size: 'tiny' | 'tray' | 'small' | 'medium' | 'large' }) {
  return (
    <span className={`coral-disc disc-${size} ring-${observation.verdict || 'unknown'}`}>
      {observation.has_image
        ? <img src={coralImage(observation)} alt={`Coral snapshot: ${observation.coral_type || 'unknown coral'}`} loading="lazy" />
        : <span className="disc-empty"><Waves size={size === 'large' ? 30 : 18} /></span>}
    </span>
  );
}

function CoralNode({ observation, active, state, onToggle }: { observation: ReefObservation; active: boolean; state?: 'base' | 'pickable'; onToggle: () => void }) {
  return (
    <button
      className={`coral-node${active ? ' is-active' : ''}${state ? ` is-${state}` : ''}`}
      type="button"
      onClick={onToggle}
      aria-expanded={state ? undefined : active}
      aria-label={state === 'pickable' ? `Compare with ${observation.coral_type || 'this coral'}` : undefined}
    >
      <CoralDisc observation={observation} size="small" />
      <span className="node-name">{observation.coral_type || 'Unknown coral'}</span>
      {!state && <span className="node-cta">{active ? 'Close data' : 'View data'}</span>}
      {state === 'pickable' && <span className="node-cta">Compare with this</span>}
      {state === 'base' ? <span className="tag tag-hot">Comparing</span> : <VerdictTag verdict={observation.verdict} />}
    </button>
  );
}

interface NetworkPanelProps {
  observation: ReefObservation;
  units: Units;
  onClose: () => void;
  onCompare: () => void;
  ref?: React.Ref<HTMLElement>;
}

function NetworkPanel({ observation, units, onClose, onCompare, ref }: NetworkPanelProps) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const highHeat = isNumber(observation.dhw) && observation.dhw >= HIGH_HEAT_DHW;
  const nodes: { label: string; body: React.ReactNode; wide?: boolean; tone?: 'hot' | 'blue' }[] = [
    { label: 'Paleness', body: <PalenessScale value={observation.paleness} /> },
    {
      label: 'Heat stress',
      tone: highHeat ? 'hot' : 'blue',
      body: <><b>{formatValue(observation.dhw)} DHW</b><small>{highHeat ? 'High heat' : 'Below high heat'} · {isNumber(observation.temp_c) ? `water ${temperature(observation.temp_c, units)}` : 'water temperature not recorded'}</small></>,
    },
    { label: 'Neighbors', body: <><b>{formatValue(observation.neighbor_count)}</b><small>living coral within {shortDistance(50, units)} / 7 days</small></> },
    { label: 'Neighbor median', body: <><b>{formatValue(observation.neighbor_median)}<i>/6</i></b><small>paleness of nearby coral</small></> },
    { label: 'Why this verdict', wide: true, body: <p>{observation.verdict_reason || 'No explanation recorded.'}</p> },
    { label: 'Captured', body: <><b>{formatDate(observation.taken_at)}</b><small>{observation.lat.toFixed(4)}, {observation.lon.toFixed(4)}</small></> },
    { label: 'AI confidence', tone: 'blue', body: <><b>{formatPercent(observation.confidence)}</b><small title={observation.reason || undefined}>{observation.reason || 'Gemini photo assessment'}</small></> },
    { label: 'Health', body: <><b>{observation.health ? HEALTH_LABEL[observation.health] || observation.health : 'Unknown'}</b><small>from the photo</small></> },
  ];

  return (
    <article ref={ref} className={`network-panel${shown ? ' is-open' : ''}`} aria-label={`${observation.coral_type || 'Coral'} details`}>
      <button className="icon-button network-close" type="button" onClick={onClose} aria-label="Close coral details">
        <X size={16} />
      </button>
      <div className="network-stage">
      <svg className="network-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {nodes.map((_, index) => {
          const angle = (-90 + index * (360 / nodes.length)) * (Math.PI / 180);
          return <line key={index} x1="50" y1="50" x2={50 + Math.cos(angle) * 34} y2={50 + Math.sin(angle) * 37} style={{ transitionDelay: `${index * 40}ms` }} />;
        })}
      </svg>
      <div className="network-center">
        <CoralDisc observation={observation} size="large" />
        <strong>{observation.coral_type || 'Unknown coral'}</strong>
        <CandidateStatus observation={observation} />
      </div>
      {nodes.map((node, index) => {
        const angle = (-90 + index * (360 / nodes.length)) * (Math.PI / 180);
        return (
          <div
            key={node.label}
            className={`data-node${node.wide ? ' wide' : ''}${node.tone ? ` tone-${node.tone}` : ''}`}
            style={{
              '--x': `${Math.cos(angle) * 34}%`,
              '--y': `${Math.sin(angle) * 37}%`,
              transitionDelay: `${80 + index * 40}ms`,
            } as React.CSSProperties}
          >
            <span className="mono-label">{node.label}</span>
            {node.body}
          </div>
        );
      })}
      </div>
      <div className="network-actions">
        <button className="pill pill-dark" type="button" onClick={onCompare}>
          <GitCompare size={15} /> Compare with another coral
        </button>
        {!IS_STATIC && <button className="pill pill-outline" type="button" onClick={() => askAssistant(coralQuestion(observation), `Explain this ${observation.coral_type || 'coral'} from ${siteLabel(observation.place_name)}`)}>
          <Sparkles size={15} /> Ask AI about this coral
        </button>}
      </div>
    </article>
  );
}

interface CompareTrayProps {
  base: ReefObservation;
  reefs: PlaceSuggestion[];
  radiusKm: number;
  pageRecords: ReefObservation[];
  onPick: (observation: ReefObservation) => void;
  onCancel: () => void;
}

// lets the second coral come from any reef with data, not only the reefs selected on the page
function CompareTray({ base, reefs, radiusKm, pageRecords, onPick, onCancel }: CompareTrayProps) {
  const [reef, setReef] = useState(() => reefs.find((place) => place.name !== base.place_name)?.name ?? base.place_name);
  const [cache, setCache] = useState<Record<string, ReefObservation[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (cache[reef]) return;
    const onPage = pageRecords.filter((observation) => observation.place_name === reef);
    if (onPage.length) {
      setCache((current) => ({ ...current, [reef]: onPage }));
      return;
    }
    const controller = new AbortController();
    const params = new URLSearchParams({ locations: JSON.stringify([{ kind: 'place', name: reef }]), radiusKm: String(radiusKm) });
    setLoading(true);
    setError('');
    readApi<{ observations: ReefObservation[] }>(`/api/observations?${params}`, controller.signal)
      .then((payload) => setCache((current) => ({ ...current, [reef]: payload.observations })))
      .catch((caught: Error) => {
        if (caught.name !== 'AbortError') setError(caught.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
    // cache is only read to skip refetching
  }, [reef, radiusKm]);

  const baseKey = keyOf(base);
  const corals = (cache[reef] || []).filter((observation) => keyOf(observation) !== baseKey);

  return (
    <div className="compare-tray" role="dialog" aria-label="Pick a coral to compare">
      <div className="tray-head">
        <CoralDisc observation={base} size="tiny" />
        <span>
          Compare <b>{base.coral_type || 'this coral'}</b> <small>from {siteLabel(base.place_name)}</small> with a coral from any reef
        </span>
        <button className="pill pill-small pill-outline" type="button" onClick={onCancel}>Cancel</button>
      </div>
      <div className="tray-reefs" role="tablist" aria-label="Reefs">
        {reefs.map((place) => (
          <button
            key={place.name}
            type="button"
            role="tab"
            aria-selected={place.name === reef}
            className={place.name === reef ? 'active' : ''}
            onClick={() => setReef(place.name)}
          >
            {siteLabel(place.name).split(' — ').pop()}
            <small>{place.observation_count}</small>
          </button>
        ))}
      </div>
      <div className="tray-corals">
        {loading ? (
          <p className="muted-note"><span className="spinner" /> Loading coral…</p>
        ) : error ? (
          <p className="muted-note">{error}</p>
        ) : corals.length ? corals.map((observation) => (
          <button key={keyOf(observation)} type="button" className="tray-coral" onClick={() => onPick(observation)}>
            <CoralDisc observation={observation} size="tray" />
            <span>{observation.coral_type || 'Unknown coral'}</span>
            <small>{observation.health ? HEALTH_LABEL[observation.health] || observation.health : 'Unknown'} · {formatValue(observation.paleness, '/6')}</small>
          </button>
        )) : (
          <p className="muted-note">No other analyzed coral at this reef.</p>
        )}
      </div>
    </div>
  );
}

interface ComparePanelProps {
  a: ReefObservation;
  b: ReefObservation;
  units: Units;
  onSwap: () => void;
  onClear: () => void;
  onRepick: () => void;
}

function ComparePanel({ a, b, units, onSwap, onClear, onRepick }: ComparePanelProps) {
  // opens above the page: lock the page behind it and let Escape close it
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClear(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClear]);

  const heatMax = Math.max(8, a.dhw ?? 0, b.dhw ?? 0);
  const neighborMax = Math.max(5, a.neighbor_count ?? 0, b.neighbor_count ?? 0);
  const darkerThanNeighbors = (observation: ReefObservation) =>
    isNumber(observation.neighbor_median) && isNumber(observation.paleness) ? observation.neighbor_median - observation.paleness : null;

  const rows: { label: string; hint: string; a: number | null; b: number | null; max: number; format: (value: number | null) => string; better?: 'lower' | 'higher' }[] = [
    { label: 'Paleness', hint: '1 dark · 6 white', a: a.paleness, b: b.paleness, max: 6, format: (value) => formatValue(value, '/6'), better: 'lower' },
    { label: 'Heat stress', hint: `DHW · high at ${HIGH_HEAT_DHW}`, a: a.dhw, b: b.dhw, max: heatMax, format: (value) => formatValue(value, ' DHW') },
    { label: 'Neighbor paleness', hint: 'median nearby', a: a.neighbor_median, b: b.neighbor_median, max: 6, format: (value) => formatValue(value, '/6') },
    { label: 'Darker than neighbors', hint: 'paleness points', a: darkerThanNeighbors(a), b: darkerThanNeighbors(b), max: 6, format: (value) => isNumber(value) ? `${value > 0 ? '+' : ''}${formatValue(value)}` : '—', better: 'higher' },
    { label: 'Living neighbors', hint: `within ${shortDistance(50, units)}`, a: a.neighbor_count, b: b.neighbor_count, max: neighborMax, format: (value) => formatValue(value) },
    { label: 'AI confidence', hint: 'photo score', a: a.confidence, b: b.confidence, max: 1, format: formatPercent },
  ];

  const healthier = isNumber(a.paleness) && isNumber(b.paleness) && a.paleness !== b.paleness
    ? (a.paleness < b.paleness ? 'a' : 'b')
    : null;
  const nameA = a.coral_type || 'Coral A';
  const nameB = b.coral_type || 'Coral B';
  const gap = isNumber(a.paleness) && isNumber(b.paleness) ? Math.abs(a.paleness - b.paleness) : null;
  const summary = !isNumber(a.paleness) || !isNumber(b.paleness)
    ? 'Paleness is missing for one of these coral.'
    : gap === 0
      ? `Both coral score ${a.paleness}/6 on paleness.`
      : `${capitalize(healthier === 'a' ? nameA : nameB)} is ${gap} paleness ${gap === 1 ? 'point' : 'points'} darker, so it looks healthier.`;
  const heatNote = isNumber(a.dhw) && isNumber(b.dhw)
    ? a.dhw === b.dhw
      ? ` Both experienced ${formatValue(a.dhw)} DHW of heat stress.`
      : ` Heat stress was ${formatValue(a.dhw)} vs ${formatValue(b.dhw)} DHW.`
    : '';

  const side = (observation: ReefObservation, which: 'a' | 'b') => (
    <div className={`compare-side side-${which}`}>
      <div className="compare-disc">
        <CoralDisc observation={observation} size="medium" />
        {healthier === which && <span className="healthier-badge">Healthier</span>}
      </div>
      <strong><span className={`dot dot-${which}`} />{observation.coral_type || 'Unknown coral'}</strong>
      <dl className="compare-meta">
        <div>
          <dt>Found at</dt>
          <dd>{siteLabel(observation.place_name)}<small>{formatCoordinates(observation.lat, observation.lon)}</small></dd>
        </div>
        <div>
          <dt>Photo taken</dt>
          <dd>{formatDateTime(observation.taken_at)}</dd>
        </div>
      </dl>
      <CandidateStatus observation={observation} />
    </div>
  );

  return (
    <div className="compare-overlay" onClick={(event) => { if (event.target === event.currentTarget) onClear(); }}>
    <section className="compare" role="dialog" aria-modal="true" aria-labelledby="compare-title">
      <button className="icon-button compare-close" type="button" onClick={onClear} aria-label="Close comparison">
        <X size={17} />
      </button>
      <div className="center-head">
        <p className="eyebrow eyebrow-blue">Step 3 · Compare</p>
        <h2 id="compare-title">Comparing <em>coral health.</em></h2>
        <p className="center-lede">{summary}{heatNote}</p>
      </div>

      <div className="compare-heads">
        {side(a, 'a')}
        <span className="compare-vs">vs</span>
        {side(b, 'b')}
      </div>

      <div className="butterfly" role="table" aria-label="Health comparison">
        {rows.map((row) => {
          const width = (value: number | null) => isNumber(value) ? `${Math.max(3, Math.min(100, (Math.abs(value) / row.max) * 100))}%` : '0%';
          const winner = row.better && isNumber(row.a) && isNumber(row.b) && row.a !== row.b
            ? ((row.better === 'lower') === (row.a < row.b) ? 'a' : 'b')
            : null;
          return (
            <div className="bf-row" role="row" key={row.label}>
              <span className={`bf-value${winner === 'a' ? ' is-better' : ''}`} role="cell">{row.format(row.a)}</span>
              <span className="bf-track bf-left" role="presentation"><span className="bf-bar bar-a" style={{ width: width(row.a) }} /></span>
              <span className="bf-label" role="rowheader">{row.label}<small>{row.hint}</small></span>
              <span className="bf-track bf-right" role="presentation"><span className="bf-bar bar-b" style={{ width: width(row.b) }} /></span>
              <span className={`bf-value${winner === 'b' ? ' is-better' : ''}`} role="cell">{row.format(row.b)}</span>
            </div>
          );
        })}
      </div>

      <div className="compare-actions">
        {!IS_STATIC && <button className="pill pill-hot" type="button" onClick={() => askAssistant(comparisonQuestion(a, b), `Explain this comparison: ${a.coral_type || 'coral A'} vs ${b.coral_type || 'coral B'}`)}><Sparkles size={15} /> Ask AI to explain this comparison</button>}
        <button className="pill pill-outline" type="button" onClick={onRepick}><GitCompare size={15} /> Pick a different coral</button>
        <button className="pill pill-outline" type="button" onClick={onSwap}><ArrowLeftRight size={15} /> Swap sides</button>
        <button className="pill pill-outline" type="button" onClick={onClear}><X size={15} /> Close</button>
      </div>
    </section>
    </div>
  );
}

// label is the short line shown in the chat; text is what is sent to the assistant
type ChatMessage = { role: 'user' | 'model'; text: string; label?: string };
type AskDetail = { text: string; label?: string };

const ASK_EVENT = 'reef-watch:ask';

function askAssistant(question: string, label?: string) {
  window.dispatchEvent(new CustomEvent<AskDetail>(ASK_EVENT, { detail: { text: question.slice(0, 1150), label } }));
}

function describeCoral(observation: ReefObservation) {
  return [
    `${observation.coral_type || 'unknown coral'} at ${siteLabel(observation.place_name)}, photographed ${formatDate(observation.taken_at)}`,
    `health ${observation.health ? HEALTH_LABEL[observation.health] || observation.health : 'unknown'}`,
    `paleness ${formatValue(observation.paleness)}/6`,
    `heat stress ${formatValue(observation.dhw)} DHW`,
    `${formatValue(observation.neighbor_count)} living neighbors with median paleness ${formatValue(observation.neighbor_median)}/6`,
    `verdict ${observation.verdict ? VERDICT_LABEL[observation.verdict] || observation.verdict : 'none'}`,
  ].join('; ');
}

function coralQuestion(observation: ReefObservation) {
  return `Explain this coral in plain language: ${describeCoral(observation)}. The analyzer said: "${observation.verdict_reason || 'no explanation'}". What does this mean, and is it worth studying further?`;
}

function comparisonQuestion(a: ReefObservation, b: ReefObservation) {
  return `Explain this comparison in plain language. Coral A: ${describeCoral(a)}. Coral B: ${describeCoral(b)}. Which looks healthier, is either a survivor or unexplained damage, and what might explain the difference?`;
}

const CHAT_SUGGESTIONS = [
  'Which reef looks healthiest?',
  'What counts as unexplained damage?',
  'Compare the Great Barrier Reef sites',
  'What is a Degree Heating Week?',
];

function ChatWidget() {
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState<AskDetail | null>(null);

  useEffect(() => {
    const onAsk = (event: Event) => {
      setExpanded(true);
      setPending((event as CustomEvent<AskDetail>).detail);
    };
    window.addEventListener(ASK_EVENT, onAsk);
    return () => window.removeEventListener(ASK_EVENT, onAsk);
  }, []);

  return (
    <div className="chat">
      <ChatPanel
        expanded={expanded}
        pending={pending}
        onPendingSent={() => setPending(null)}
        onExpand={() => setExpanded(true)}
        onCollapse={() => setExpanded(false)}
      />
      {!expanded && (
        <button className="chat-orb" type="button" onClick={() => setExpanded(true)} aria-label="Ask Reef Watch AI" title="Ask Reef Watch AI">
          <CoralLogo className="chat-orb-logo" />
          <Sparkles className="chat-orb-spark" size={14} />
        </button>
      )}
    </div>
  );
}

interface ChatPanelProps {
  expanded: boolean;
  pending: AskDetail | null;
  onPendingSent: () => void;
  onExpand: () => void;
  onCollapse: () => void;
}

function ChatPanel({ expanded, pending, onPendingSent, onExpand, onCollapse }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  useEffect(() => {
    if (!pending || sending) return;
    onPendingSent();
    ask(pending.text, pending.label);
    // ask is recreated each render; pending is what should trigger this
  }, [pending, sending]);

  async function ask(question: string, label?: string) {
    const text = question.trim();
    if (!text || sending) return;
    onExpand();
    const next: ChatMessage[] = [...messages, { role: 'user', text, label }];
    setMessages(next);
    setDraft('');
    setError('');
    setSending(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.map(({ role, text: body }) => ({ role, text: body })) }),
      });
      const payload = await response.json() as ApiPayload<{ reply: string }>;
      if (!response.ok) throw new Error(payload.error || 'The assistant is unavailable right now.');
      setMessages((current) => [...current, { role: 'model', text: payload.reply }]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The assistant is unavailable right now.');
    } finally {
      setSending(false);
    }
  }

  return (
        <section className={`chat-panel${expanded ? ' is-expanded' : ''}`} aria-label="Ask Reef Watch" hidden={!expanded}>
          <header className="chat-head" onClick={expanded ? undefined : onExpand}>
            <span className="chat-avatar"><Sparkles size={15} /></span>
            <div>
              <strong>Ask Reef Watch</strong>
              <span>Answers from the reef data · Gemini</span>
            </div>
            {expanded ? (
              <button className="icon-button chat-close" type="button" onClick={onCollapse} aria-label="Minimize chat">
                <ChevronDown size={17} />
              </button>
            ) : (
              <button className="icon-button chat-close" type="button" onClick={onExpand} aria-label="Expand chat">
                <ArrowUpRight size={16} />
              </button>
            )}
          </header>

          {expanded && (
          <div className="chat-log" ref={logRef} aria-live="polite">
            {messages.length === 0 && (
              <div className="chat-intro">
                <p>Ask about any reef site, verdict or measurement. Try one of these:</p>
                <div className="chat-suggestions">
                  {CHAT_SUGGESTIONS.map((suggestion) => (
                    <button key={suggestion} type="button" onClick={() => ask(suggestion)}>{suggestion}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message, index) => (
              <p key={index} className={`bubble bubble-${message.role}`}>{message.label || message.text}</p>
            ))}
            {sending && <p className="bubble bubble-model bubble-typing"><span /><span /><span /></p>}
            {error && <p className="chat-error" role="alert">{error}</p>}
          </div>
          )}

          <form className="chat-input" onSubmit={(event) => { event.preventDefault(); ask(draft); }}>
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              maxLength={1200}
              placeholder="Ask about the reefs…"
              aria-label="Your question"
              onFocus={onExpand}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  ask(draft);
                }
              }}
            />
            <button className="chat-send" type="submit" disabled={!draft.trim() || sending} aria-label="Send">
              <Send size={16} />
            </button>
          </form>
          {expanded && <p className="chat-note">AI answers can be wrong. Check them against the records.</p>}
        </section>
  );
}
