import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Video,
  Upload,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Download,
  Copy,
  Check,
  RefreshCw,
  Terminal,
  Wifi,
  FileCode,
  Sliders,
  Radio
} from 'lucide-react';
import { CoralObservation } from '../types/coral';

interface LiveCameraUploadConsoleProps {
  onObservationIngested: (obs: CoralObservation) => void;
}

export const LiveCameraUploadConsole: React.FC<LiveCameraUploadConsoleProps> = ({
  onObservationIngested,
}) => {
  const [mode, setMode] = useState<'camera' | 'file' | 'script'>('camera');
  
  // Camera stream state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // File upload state
  const [uploadedFileBase64, setUploadedFileBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Hardware sensor readings
  const [tempC, setTempC] = useState<number>(31.8);
  const [depthM, setDepthM] = useState<number>(6.4);
  const [latitude, setLatitude] = useState<number>(-14.6542);
  const [longitude, setLongitude] = useState<number>(145.6983);
  const [deviceId, setDeviceId] = useState<string>('REEF-RIG-PI-01');
  const [genus, setGenus] = useState<string>('Acropora millepora');

  // Ingestion state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const [copiedCurl, setCopiedCurl] = useState<boolean>(false);

  // Host URL for instructions
  const hostUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  // Start webcam
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        'Unable to access camera. Please allow camera permissions or upload an image file from the SD card.'
      );
      setIsCameraActive(false);
    }
  };

  // Stop webcam
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Snap photo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  // Handle local file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedFileBase64(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Send upload to backend /api/hardware/upload
  const handleUploadToWebsite = async () => {
    const activeImage = mode === 'camera' ? capturedImage : uploadedFileBase64;
    if (!activeImage) {
      alert('Please snap a photo with the camera or choose an image file first.');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const payload = {
        deviceId,
        image: activeImage,
        temperature: tempC,
        depth: depthM,
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
        genus,
        subRegion: 'Active Transect Dive',
        region: 'Global Oceanic Station',
        researchNotes: `Captured via connected hardware camera console. Depth: ${depthM}m, In-situ temp: ${tempC}°C.`,
      };

      const response = await fetch('/api/hardware/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload hardware data');
      }

      setUploadResult(data);
      if (data.observation) {
        onObservationIngested(data.observation);
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      alert(`Error uploading hardware data: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const curlExample = `curl -X POST "${hostUrl}/api/hardware/upload" \\
  -H "Content-Type: application/json" \\
  -d '{
    "deviceId": "REEF-RIG-PI-01",
    "temperature": ${tempC},
    "depth": ${depthM},
    "latitude": ${latitude},
    "longitude": ${longitude},
    "image": "data:image/jpeg;base64,...",
    "genus": "Acropora millepora"
  }'`;

  const copyCurl = () => {
    navigator.clipboard.writeText(curlExample);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-teal-500/40 bg-slate-900/90 p-5 sm:p-6 space-y-6 shadow-2xl">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400 ring-1 ring-teal-500/40">
              <Camera className="h-4 w-4" />
            </div>
            <h3 className="font-display text-lg sm:text-xl font-bold text-white tracking-tight">
              ReefCam Diver Upload &amp; Data Comparison
            </h3>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Upload coral photos from your dive to cross-reference with NOAA satellite heat stress and compare against global reef datasets.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1 text-xs">
          <button
            onClick={() => setMode('camera')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
              mode === 'camera'
                ? 'bg-teal-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Camera Viewfinder</span>
          </button>

          <button
            onClick={() => setMode('file')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
              mode === 'file'
                ? 'bg-teal-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>SD Card Photos</span>
          </button>

          <button
            onClick={() => setMode('script')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
              mode === 'script'
                ? 'bg-teal-600 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wifi className="h-3.5 w-3.5" />
            <span>Wi-Fi &amp; Sync</span>
          </button>
        </div>
      </div>

      {/* Main Mode Views */}
      {mode === 'camera' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Viewfinder Column */}
          <div className="lg:col-span-7 space-y-3">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center">
              {/* Active Stream */}
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className={`h-full w-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
              />

              {/* Frozen snapshot */}
              {!isCameraActive && capturedImage && (
                <img
                  src={capturedImage}
                  alt="Captured coral frame"
                  className="h-full w-full object-cover"
                />
              )}

              {/* Inactive placeholder */}
              {!isCameraActive && !capturedImage && (
                <div className="text-center p-6 space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-slate-400 ring-1 ring-slate-800">
                    <Camera className="h-6 w-6 text-teal-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">Camera Viewfinder Inactive</p>
                    <p className="text-xs text-slate-400 max-w-sm mt-1">
                      Start your camera to capture live coral samples directly from the subsea rig or USB microscope.
                    </p>
                  </div>
                </div>
              )}

              {/* Hidden canvas for snapshot rendering */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Overlay HUD indicators */}
              {isCameraActive && (
                <div className="absolute top-2.5 left-2.5 flex items-center gap-2 bg-slate-950/80 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-mono text-emerald-400 border border-emerald-500/30">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>CAM FEED ACTIVE · SONY IMX708</span>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="rounded-lg bg-rose-950/50 border border-rose-800/60 p-3 text-xs text-rose-300">
                {cameraError}
              </div>
            )}

            {/* Camera Controls */}
            <div className="flex items-center gap-2">
              {!isCameraActive ? (
                <button
                  onClick={startCamera}
                  className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500 transition-colors"
                >
                  <Video className="h-4 w-4" />
                  <span>Start Camera Feed</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={capturePhoto}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-950"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Snap Coral Frame</span>
                  </button>
                  <button
                    onClick={stopCamera}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:text-white"
                  >
                    Stop Feed
                  </button>
                </>
              )}

              {capturedImage && !isCameraActive && (
                <button
                  onClick={() => setCapturedImage(null)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:text-white"
                >
                  Retake
                </button>
              )}
            </div>
          </div>

          {/* Sensor Telemetry & Ingestion Controls */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
              <h4 className="font-semibold text-xs text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-teal-400" />
                <span>Simulated Arduino Telemetry</span>
              </h4>

              {/* In-situ Temperature */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">In-situ Temp (TSYS01 probe):</span>
                  <span className="font-mono text-teal-400 font-bold">{tempC.toFixed(1)}°C</span>
                </div>
                <input
                  type="range"
                  min="27.0"
                  max="34.0"
                  step="0.1"
                  value={tempC}
                  onChange={(e) => setTempC(parseFloat(e.target.value))}
                  className="w-full accent-teal-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Depth */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Depth (MS5837 pressure sensor):</span>
                  <span className="font-mono text-cyan-400 font-bold">{depthM.toFixed(1)}m</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="30.0"
                  step="0.5"
                  value={depthM}
                  onChange={(e) => setDepthM(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Surface GPS Latitude</span>
                  <input
                    type="number"
                    step="0.001"
                    value={latitude}
                    onChange={(e) => setLatitude(parseFloat(e.target.value))}
                    className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1 text-slate-200 font-mono text-xs"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Surface GPS Longitude</span>
                  <input
                    type="number"
                    step="0.001"
                    value={longitude}
                    onChange={(e) => setLongitude(parseFloat(e.target.value))}
                    className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1 text-slate-200 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Device ID */}
              <div className="pt-1">
                <span className="text-slate-400 block text-[11px]">Hardware Unit ID</span>
                <input
                  type="text"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1 text-slate-200 font-mono text-xs"
                />
              </div>
            </div>

            {/* Action Trigger */}
            <button
              onClick={handleUploadToWebsite}
              disabled={isUploading || !capturedImage}
              className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-bold text-white transition-all ${
                capturedImage
                  ? 'bg-teal-600 hover:bg-teal-500 shadow-lg shadow-teal-950 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isUploading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Processing Upload & AI Inference...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Upload Camera Data to Website</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Mode 2: SD Card File Upload */}
      {mode === 'file' && (
        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-teal-500 rounded-xl p-8 text-center cursor-pointer bg-slate-950/40 transition-colors"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-teal-400 mb-3">
              <Upload className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-slate-200">
              {uploadedFileBase64 ? 'Image selected! Click to change' : 'Select underwater image from SD Card or Pi Storage'}
            </p>
            <p className="text-xs text-slate-400 mt-1">JPEG, PNG, or RAW photo frame</p>
          </div>

          {uploadedFileBase64 && (
            <div className="flex gap-4 items-center rounded-xl border border-slate-800 bg-slate-950 p-3">
              <img src={uploadedFileBase64} alt="Preview" className="h-20 w-28 object-cover rounded-lg" />
              <div className="flex-1 text-xs">
                <span className="font-semibold text-white">SD Card Frame Loaded</span>
                <p className="text-slate-400 mt-0.5">Ready for upload to website endpoint `/api/hardware/upload`</p>
                <div className="flex gap-3 text-slate-300 font-mono mt-1 text-[11px]">
                  <span>Temp: {tempC}°C</span>
                  <span>Depth: {depthM}m</span>
                </div>
              </div>
              <button
                onClick={handleUploadToWebsite}
                disabled={isUploading}
                className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500"
              >
                {isUploading ? 'Uploading...' : 'Send Upload'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mode 3: Raspberry Pi Client Script & Remote Webhook */}
      {mode === 'script' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-teal-400" />
                <span className="text-xs font-semibold text-white">Direct Raspberry Pi Webhook Client</span>
              </div>
              <a
                href="/api/hardware/script"
                download="reef_pi_uploader.py"
                className="flex items-center gap-1.5 rounded bg-teal-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-teal-500 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Python Script</span>
              </a>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Run this script directly on your underwater Raspberry Pi. It commands the camera to take a photo, reads the
              Arduino temperature and depth sensors over serial (/dev/ttyACM0), and POSTs directly to the website endpoint:
            </p>

            <div className="rounded-lg bg-slate-900 border border-slate-800 p-3 font-mono text-xs text-teal-300 flex items-center justify-between">
              <span>POST {hostUrl}/api/hardware/upload</span>
              <span className="text-[11px] text-emerald-400">● LIVE ENDPOINT</span>
            </div>

            {/* Curl example */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Test from Pi terminal via cURL:</span>
                <button
                  onClick={copyCurl}
                  className="flex items-center gap-1 text-slate-300 hover:text-white"
                >
                  {copiedCurl ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedCurl ? 'Copied' : 'Copy cURL'}</span>
                </button>
              </div>

              <pre className="overflow-x-auto rounded-lg bg-slate-900 border border-slate-800 p-3 font-mono text-[11px] text-slate-300">
                {curlExample}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Upload Result Feedback */}
      {uploadResult && (
        <div className="rounded-xl border border-teal-500/40 bg-teal-950/20 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-teal-800/40 pb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="font-semibold text-sm text-white">Hardware Ingestion Succeeded!</span>
            </div>
            <span className="font-mono text-xs text-teal-300 font-bold">
              {uploadResult.observation?.sampleCode}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-lg bg-slate-950/80 p-2.5 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">AI Coral Health Diagnosis</span>
              <span className={`font-bold uppercase tracking-wider ${
                uploadResult.observation?.aiClassification?.status === 'healthy'
                  ? 'text-emerald-400'
                  : 'text-amber-400'
              }`}>
                {uploadResult.observation?.aiClassification?.status} ({uploadResult.observation?.aiClassification?.confidence}%)
              </span>
            </div>

            <div className="rounded-lg bg-slate-950/80 p-2.5 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">NOAA Satellite Heat Stress</span>
              <span className="font-mono font-bold text-amber-400">
                {uploadResult.observation?.heatStress?.noaaDhw} DHW ({uploadResult.observation?.heatStress?.heatStressCategory})
              </span>
            </div>

            <div className="rounded-lg bg-slate-950/80 p-2.5 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Candidate Evaluation</span>
              {uploadResult.isResilienceCandidate ? (
                <span className="font-bold text-amber-300 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  ⭐ Resilience Candidate!
                </span>
              ) : (
                <span className="text-slate-400">Standard Reef Survey</span>
              )}
            </div>
          </div>

          {/* Diver Comparison Matrix */}
          <div className="rounded-lg bg-slate-900 border border-slate-800 p-3 space-y-2 text-xs">
            <span className="font-semibold text-slate-200 block border-b border-slate-800 pb-1">
              📊 Diver Data Comparison vs Regional Reef Baseline
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div className="space-y-0.5">
                <span className="text-slate-400 block">Thermal Exposure:</span>
                <p>
                  In-situ temperature <strong className="text-teal-300">{uploadResult.observation?.waterTemperatureCelsius}°C</strong> is{' '}
                  <strong className="text-amber-300">
                    +{uploadResult.observation?.heatStress?.seaSurfaceTempAnomaly}°C above the regional baseline
                  </strong>{' '}
                  ({uploadResult.observation?.heatStress?.baselineMaxMonthlyMean}°C).
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-400 block">Reef Transect Comparison:</span>
                <p>
                  {uploadResult.isResilienceCandidate ? (
                    <span className="text-emerald-300">
                      🏆 Colony maintained vibrant pigmentation while adjacent colonies experienced severe thermal bleaching!
                    </span>
                  ) : (
                    <span>
                      Colony shows expected physiological response consistent with satellite thermal anomalies in this oceanic sector.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-300">
            Observation successfully logged into the database and added to your diver citizen science portfolio.
          </p>
        </div>
      )}
    </div>
  );
};
