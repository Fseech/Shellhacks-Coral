import React, { useState } from 'react';
import {
  Camera,
  Thermometer,
  ArrowDown,
  Navigation,
  HardDrive,
  Cpu,
  Layers,
  CheckCircle,
  Database,
  Globe,
  Radio,
  Sparkles,
  ArrowRight,
  Shield,
  Wifi,
  Waves,
  Upload,
  BarChart2,
  Award
} from 'lucide-react';
import { CoralObservation } from '../types/coral';
import { LiveCameraUploadConsole } from './LiveCameraUploadConsole';

interface HardwareSchematicViewProps {
  onObservationIngested?: (obs: CoralObservation) => void;
}

export const HardwareSchematicView: React.FC<HardwareSchematicViewProps> = ({
  onObservationIngested,
}) => {
  const [activeComponent, setActiveComponent] = useState<string>('camera');

  const components: Record<string, {
    title: string;
    category: string;
    spec: string;
    role: string;
    technicalDetails: string[];
    diverBenefit: string;
  }> = {
    camera: {
      title: 'ReefCam Pro Optical Module',
      category: '4K Marine Optical Sensor',
      spec: 'Sony IMX708 12.0 Megapixel Sensor with Custom 110° Wet-Dome Lens',
      role: 'Captures crisp underwater RAW + JPEG frames with auto white balance dynamically calibrated for tropical blue and green water light attenuation.',
      technicalDetails: [
        'F/1.8 large aperture for exceptional low-light clarity down to 60 meters',
        'Anti-reflective sapphire glass port with scratch-resistant hydrophobic coating',
        'High dynamic range (HDR) exposure prevents bleaching blowout under bright surface sun'
      ],
      diverBenefit: 'Crisp, color-accurate coral photos without requiring bulky external strobe arms.',
    },
    temp: {
      title: 'Integrated TSYS01 Oceanographic Temp Probe',
      category: 'In-Situ Microclimate Sensor',
      spec: 'TSYS01 High-Precision Digital Sensor (±0.1°C accuracy, 24-bit resolution)',
      role: 'Records exact localized water temperature surrounding the coral head at the moment of capture, recording thermal buffering or extreme heat spikes.',
      technicalDetails: [
        'Housed in marine-grade 316L stainless steel probe rated to 300m depth',
        'NIST-traceable calibration ensures climate-grade scientific data validity',
        'Fast thermal response (< 1.2s) prevents lag as divers transition through thermoclines'
      ],
      diverBenefit: 'Records micro-habitat temperature directly into the photo EXIF and cloud database.',
    },
    depth: {
      title: 'MS5837 Subsea Depth & Pressure Sensor',
      category: 'Hydrostatic Depth Transducer',
      spec: 'MS5837-30BA High-Resolution Pressure Sensor (0.2 mbar resolution)',
      role: 'Automatically records exact dive depth in meters for every coral photo taken, aiding scientists studying mesophotic thermal depth refugia.',
      technicalDetails: [
        'Gel-protected piezoresistive element impervious to saltwater corrosion',
        'Calculates real-time depth via hydrostatic pressure equation: Depth = (P - Patm) / (ρ * g)',
        'Accurate to ±0.05 meters across 0 to 60 meters depth'
      ],
      diverBenefit: 'Zero manual dive logging needed—depth is automatically stamped onto every specimen.',
    },
    pi: {
      title: 'On-Device Edge AI & Computer Module',
      category: 'Embedded Neural Engine',
      spec: 'Raspberry Pi Embedded Compute Core with PCIe Neural Accelerator',
      role: 'Runs the MobileNetV3 edge AI coral classifier in real time. Analyzes healthy pigmentation, zooxanthellae loss, or algal overgrowth within 42 milliseconds.',
      technicalDetails: [
        'Ultra-low power design gives 6+ hours of continuous dive operation per charge',
        'Instant HUD viewfinder indicator lights up green when a resilient colony is spotted',
        'Automatically packages image + depth + temp + surface GPS ready for website sync'
      ],
      diverBenefit: 'Real-time feedback during your dive showing whether the coral is bleached or resilient.',
    },
    housing: {
      title: '60m Ruggedized Marine Enclosure',
      category: 'Anodized Diver Ergonomics',
      spec: 'Hard-anodized 6061-T6 aluminum chassis with dual O-ring pressure seals',
      role: 'Protects optics and electronics against saltwater intrusion, extreme hydrostatic pressure, and boat deck bumps.',
      technicalDetails: [
        'Ergonomic dual glove-compatible trigger buttons for divers in cold or warm waters',
        'Internal vacuum leak detection indicator provides green light before entry into water',
        'Universal 1-inch ball mount and cold shoe for dive light attachments'
      ],
      diverBenefit: 'Rugged dive-ready build tested to 60 meters (200 ft) for recreational and technical diving.',
    },
    gps: {
      title: 'Surface GNSS Buoy & Pre-Dive Lock',
      category: 'Geospatial Positioning',
      spec: 'u-blox Multi-Constellation GNSS (GPS, Galileo, GLONASS)',
      role: 'Locks coordinates at the surface before descent and after surfacing, geotagging the exact reef transect point (since radio GPS signals cannot penetrate seawater).',
      technicalDetails: [
        'Pre-dive fast fix (< 15 seconds) caches satellite almanac data',
        'Integrates with surface dive float tether or diver boat log coordinates',
        'Sub-2 meter position accuracy with SBAS differential corrections'
      ],
      diverBenefit: 'Pinpoints your surveyed corals on the global map so other divers and scientists can re-visit them.',
    },
  };

  return (
    <div className="space-y-6">
      {/* Product Banner for Divers */}
      <div className="rounded-2xl border border-teal-500/30 bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/40 p-6 sm:p-8 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-teal-500/20 px-3 py-0.5 text-xs font-semibold text-teal-300 ring-1 ring-teal-500/40 uppercase tracking-wider">
                Flagship Hardware Product
              </span>
              <span className="text-xs text-slate-400 font-mono">Model: REEFCAM-PRO-V2</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              ReefCam Pro — The Smart Diver Camera for Coral Conservation
            </h2>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Engineered for scuba divers, dive operators, and marine researchers. Take ReefCam on your dive to capture
              high-resolution coral photos with automatic in-situ temperature, depth, and surface GPS. Back on the boat or shore,
              upload your captures to the website to compare your findings against NOAA satellite heat-stress baselines and discover heat-resilient &quot;Super Corals&quot;.
            </p>
          </div>

          <div className="shrink-0 flex flex-col items-start md:items-end gap-2">
            <div className="rounded-xl border border-teal-500/40 bg-teal-950/60 p-3 text-left md:text-right">
              <span className="text-[11px] text-teal-300 block uppercase font-mono">Diver Citizen Science</span>
              <span className="text-lg font-bold text-white font-display">Capture. Upload. Compare.</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Empowering divers to protect reefs</span>
            </div>
          </div>
        </div>

        {/* 4 Feature Badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-1">
            <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs">
              <Shield className="h-4 w-4" />
              <span>60m Depth Rated</span>
            </div>
            <p className="text-[11px] text-slate-400">Anodized aluminum with vacuum leak detection.</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-1">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
              <Thermometer className="h-4 w-4" />
              <span>±0.1°C Precision Temp</span>
            </div>
            <p className="text-[11px] text-slate-400">Integrated TSYS01 lab probe for microclimate tracking.</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <Cpu className="h-4 w-4" />
              <span>On-Device Edge AI</span>
            </div>
            <p className="text-[11px] text-slate-400">Instant in-water health status and resilience rating.</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-1">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
              <Globe className="h-4 w-4" />
              <span>Website Comparison</span>
            </div>
            <p className="text-[11px] text-slate-400">Compare your dive data against NOAA satellite heat records.</p>
          </div>
        </div>
      </div>

      {/* Diver Upload, Camera Ingestion & Comparison Console */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <Upload className="h-5 w-5 text-teal-400" />
            <span>Diver Upload & Ingestion Gateway</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Connect camera via Wi-Fi, USB, or SD card
          </span>
        </div>

        <LiveCameraUploadConsole onObservationIngested={onObservationIngested || (() => {})} />
      </div>

      {/* How the Diver Workflow Works: Step-by-Step */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4">
        <h3 className="font-semibold text-base text-slate-200 flex items-center gap-2">
          <Layers className="h-4 w-4 text-teal-400" />
          <span>How Divers Use ReefCam to Find Resilient Corals</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          {/* Step 1 */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-teal-400 font-bold">STEP 01</span>
              <Camera className="h-4 w-4 text-slate-400" />
            </div>
            <h4 className="font-semibold text-white text-sm">Photograph Coral</h4>
            <p className="text-slate-300 leading-relaxed">
              Take ReefCam on your dive. Aim the wet-dome port at the coral head and squeeze the trigger. The camera captures 4K optical frames.
            </p>
          </div>

          {/* Step 2 */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-teal-400 font-bold">STEP 02</span>
              <Thermometer className="h-4 w-4 text-cyan-400" />
            </div>
            <h4 className="font-semibold text-white text-sm">Auto-Sensor Telemetry</h4>
            <p className="text-slate-300 leading-relaxed">
              ReefCam simultaneously records the in-situ water temperature (±0.1°C) and dive depth from built-in oceanographic transducers.
            </p>
          </div>

          {/* Step 3 */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-teal-400 font-bold">STEP 03</span>
              <Upload className="h-4 w-4 text-amber-400" />
            </div>
            <h4 className="font-semibold text-white text-sm">Upload to Website</h4>
            <p className="text-slate-300 leading-relaxed">
              Surface and sync with this website via onboard Wi-Fi, USB-C, or SD card. The image and data package uploads in seconds.
            </p>
          </div>

          {/* Step 4 */}
          <div className="rounded-xl border border-teal-500/40 bg-teal-950/30 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-teal-300 font-bold">STEP 04</span>
              <Sparkles className="h-4 w-4 text-amber-400" />
            </div>
            <h4 className="font-semibold text-white text-sm">Compare & Discover</h4>
            <p className="text-slate-300 leading-relaxed">
              The website matches your GPS coordinate with NOAA satellite Degree Heating Weeks. Healthy corals under heat stress get flagged as <strong>Resilience Candidates</strong>!
            </p>
          </div>
        </div>
      </div>

      {/* ReefCam Hardware Specs & Components for Divers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Component Selector Tabs */}
        <div className="lg:col-span-4 space-y-2">
          <h3 className="font-semibold text-sm text-slate-300 px-1">
            ReefCam Pro Subsystems
          </h3>

          <div className="space-y-1.5">
            {Object.entries(components).map(([key, comp]) => (
              <button
                key={key}
                onClick={() => setActiveComponent(key)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  activeComponent === key
                    ? 'border-teal-400 bg-slate-900 shadow-md ring-1 ring-teal-400/50'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-100">{comp.title}</span>
                  <span className="text-[10px] font-mono text-teal-400 uppercase">{comp.category.split(' ')[0]}</span>
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">{comp.spec}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Component Specification Card */}
        <div className="lg:col-span-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
          {components[activeComponent] && (
            <>
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-teal-400 font-semibold">
                  {components[activeComponent].category}
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  {components[activeComponent].title}
                </h3>
                <p className="text-xs font-mono text-slate-400 mt-1">
                  Technical Spec: {components[activeComponent].spec}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                <span className="text-xs font-semibold text-slate-300">Operational Role:</span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {components[activeComponent].role}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300">Engineering Rigor & Subsea Design:</span>
                <ul className="space-y-1.5 text-xs text-slate-400">
                  {components[activeComponent].technicalDetails.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-teal-400 font-bold">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-teal-500/30 bg-teal-950/20 p-3.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-teal-400 shrink-0" />
                  <span className="text-teal-200 font-medium">Why Divers Love It:</span>
                </div>
                <span className="font-medium text-white text-right">{components[activeComponent].diverBenefit}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
