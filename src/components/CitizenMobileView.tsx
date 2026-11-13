import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  EyeOff,
  Loader2,
  MapPin,
  PhoneCall,
  Radio,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import {
  DEMO_LOCATIONS,
  type DemoLocationPreset,
  type Hospital,
  type Incident,
  type IncidentCategory,
} from '../types';
import { BlinkitRouteMap } from './BlinkitRouteMap';

interface CitizenMobileViewProps {
  hospitals: Hospital[];
  incidents: Incident[];
  isEmbeddedSplit?: boolean;
}

const CATEGORIES: IncidentCategory[] = [
  'Medical Emergency',
  'Road Accident',
  'Cardiac / Trauma',
  'Public Safety',
  'Fire Hazard',
];

export const CitizenMobileView: React.FC<CitizenMobileViewProps> = ({
  hospitals,
  incidents,
  isEmbeddedSplit = false,
}) => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [citizenName, setCitizenName] = useState('Aarav Verma');
  const [citizenPhone, setCitizenPhone] = useState('+91 98114 55290');
  const [mode, setMode] = useState<'SOS' | 'SECURE_ALERT'>('SOS');
  const [category, setCategory] = useState<IncidentCategory>('Medical Emergency');
  const [notes, setNotes] = useState('');

  const [selectedPreset, setSelectedPreset] = useState<DemoLocationPreset>(DEMO_LOCATIONS[0]);
  const [customCoords, setCustomCoords] = useState<{
    label: string;
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    isDemo: boolean;
  }>({
    label: DEMO_LOCATIONS[0].label,
    latitude: DEMO_LOCATIONS[0].latitude,
    longitude: DEMO_LOCATIONS[0].longitude,
    accuracyMeters: DEMO_LOCATIONS[0].accuracyMeters,
    isDemo: true,
  });

  const [locatingGps, setLocatingGps] = useState(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);

  const activeIncident = incidents.find((i) => i.id === activeIncidentId) || null;

  const handleSelectPreset = (preset: DemoLocationPreset) => {
    setSelectedPreset(preset);
    setCustomCoords({
      label: `${preset.label}, ${preset.city}`,
      latitude: preset.latitude,
      longitude: preset.longitude,
      accuracyMeters: preset.accuracyMeters,
      isDemo: true,
    });
    setGpsNotice(null);
  };

  const handleFetchRealGps = () => {
    if (!navigator.geolocation) {
      setGpsNotice('Browser geolocation unavailable. Using selected demo coordinates.');
      return;
    }
    setLocatingGps(true);
    setGpsNotice(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCustomCoords({
          label: 'Live Device GPS Coordinates',
          latitude: Number(pos.coords.latitude.toFixed(5)),
          longitude: Number(pos.coords.longitude.toFixed(5)),
          accuracyMeters: Number((pos.coords.accuracy || 12).toFixed(1)),
          isDemo: false,
        });
        setLocatingGps(false);
        setGpsNotice('Live device GPS locked.');
      },
      () => {
        setLocatingGps(false);
        setGpsNotice('Location permission denied or unavailable. Using demo GPS preset.');
      },
      { enableHighAccuracy: true, timeout: 6000 },
    );
  };

  const handleSubmitAlert = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: mode === 'SOS' ? 'DISTRESS_SOS' : 'SECURE_ALERT',
          category,
          reporterName: mode === 'SECURE_ALERT' ? 'Anonymous Reporter' : citizenName || 'Citizen User',
          reporterPhone: mode === 'SECURE_ALERT' ? 'Hidden' : citizenPhone || '+91 98XXX XX412',
          locationLabel: customCoords.label,
          latitude: customCoords.latitude,
          longitude: customCoords.longitude,
          accuracyMeters: customCoords.accuracyMeters,
          isDemoLocation: customCoords.isDemo,
          notes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to transmit alert');
      }
      const created: Incident = await res.json();
      setActiveIncidentId(created.id);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Network error sending alert');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={
        isEmbeddedSplit
          ? 'mx-auto w-full max-w-[420px] rounded-[28px] border-[6px] border-slate-900 bg-white shadow-xl overflow-hidden'
          : 'mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden'
      }
    >
      {/* Mobile Top App Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-4 py-3 text-white">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight font-display">Raksha Mobile</div>
            <div className="text-[11px] text-slate-300">
              {loggedIn ? (mode === 'SECURE_ALERT' ? 'Anonymous Mode' : citizenName) : 'Citizen SOS App'}
            </div>
          </div>
        </div>
        {loggedIn && (
          <button
            type="button"
            onClick={() => {
              setLoggedIn(false);
              setActiveIncidentId(null);
            }}
            className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition-colors"
          >
            Switch User
          </button>
        )}
      </div>

      {/* Screen 1: No-ID/Password Instant Login */}
      {!loggedIn ? (
        <div className="p-5 space-y-5">
          <div>
            <div className="text-xs font-medium text-red-600">Zero-Friction Emergency Access</div>
            <h2 className="mt-1 text-xl font-bold text-slate-900 font-display">
              Instant Citizen Login
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
              In an emergency, every second counts. Continue directly without any ID or password to broadcast an SOS signal.
            </p>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <label htmlFor="citizen-name" className="block text-xs font-medium text-slate-700">
                Your Name (Optional)
              </label>
              <input
                id="citizen-name"
                type="text"
                value={citizenName}
                onChange={(e) => setCitizenName(e.target.value)}
                placeholder="Enter name or leave default"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="citizen-phone" className="block text-xs font-medium text-slate-700">
                Callback Number (Optional)
              </label>
              <input
                id="citizen-phone"
                type="tel"
                value={citizenPhone}
                onChange={(e) => setCitizenPhone(e.target.value)}
                placeholder="+91 98XXX XXXXX"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 font-mono focus:border-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => {
                setMode('SOS');
                setLoggedIn(true);
              }}
              className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 active:scale-[0.99] transition-all"
            >
              <UserCheck className="h-4 w-4" />
              <span>Enter Citizen Portal (No ID / Password)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('SECURE_ALERT');
                setLoggedIn(true);
              }}
              className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
            >
              <EyeOff className="h-4 w-4 text-slate-600" />
              <span>Report Anonymously (Secure Alert)</span>
            </button>
          </div>

          <div className="border-t border-slate-100 pt-3 text-xs text-slate-500 flex items-center justify-between">
            <span>Flutter Android Flow Preview</span>
            <span className="font-mono">112 / National Sync</span>
          </div>
        </div>
      ) : activeIncident ? (
        /* Screen 3: Live Incident Tracking (Updates automatically when Admin accepts!) */
        <div className="p-4 space-y-4">
          <div
            className={`rounded-xl border p-3.5 ${
              activeIncident.status === 'REPORTED'
                ? 'border-red-200 bg-red-50 text-red-950'
                : 'border-emerald-200 bg-emerald-50 text-emerald-950'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                {activeIncident.status === 'REPORTED' ? (
                  <Radio className="h-5 w-5 text-red-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                )}
                <div>
                  <div className="text-sm font-bold">
                    {activeIncident.status === 'REPORTED'
                      ? 'SOS Signal Broadcasted to Control Room'
                      : activeIncident.status === 'EN_ROUTE'
                        ? `Help Accepted · ETA ${activeIncident.etaMinutes} min`
                        : activeIncident.status === 'ARRIVED'
                          ? 'Ambulance Has Arrived at Your Location'
                          : 'Incident Resolved'}
                  </div>
                  <div className="text-xs opacity-85 mt-0.5">
                    ID <span className="font-mono font-semibold">{activeIncident.id}</span> ·{' '}
                    {activeIncident.status === 'REPORTED'
                      ? 'Click Accept on Admin screen to dispatch ambulance'
                      : `${activeIncident.assignedAmbulanceCode} dispatched`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Blinkit-style Live Route Map inside Mobile View */}
          <BlinkitRouteMap incident={activeIncident} hospitals={hospitals} compact />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveIncidentId(null)}
              className="flex-1 min-h-[44px] rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
            >
              Send Another Signal
            </button>
            <a
              href="tel:112"
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              <PhoneCall className="h-3.5 w-3.5" />
              <span>Dial 112</span>
            </a>
          </div>
        </div>
      ) : (
        /* Screen 2: Citizen Dashboard — Distress SOS & Secure Alert */
        <div className="p-4 space-y-4">
          {/* Segmented Mode Switcher */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setMode('SOS')}
              className={`min-h-[40px] rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                mode === 'SOS'
                  ? 'bg-white text-red-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Distress SOS
            </button>
            <button
              type="button"
              onClick={() => setMode('SECURE_ALERT')}
              className={`min-h-[40px] rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                mode === 'SECURE_ALERT'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Secure Alert (Anon)
            </button>
          </div>

          {/* Captured GPS Coordinates Card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <MapPin className="h-3.5 w-3.5 text-red-600" />
                <span>Location Coordinates</span>
              </div>
              <button
                type="button"
                onClick={handleFetchRealGps}
                disabled={locatingGps}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-60"
              >
                {locatingGps ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Compass className="h-3 w-3" />
                )}
                <span>Use Device GPS</span>
              </button>
            </div>

            <div className="text-sm font-semibold text-slate-900">{customCoords.label}</div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-slate-600">
              <span>{customCoords.latitude.toFixed(4)}° N</span>
              <span>{customCoords.longitude.toFixed(4)}° E</span>
              <span>±{customCoords.accuracyMeters.toFixed(1)} m</span>
              <span className="text-slate-400">
                {customCoords.isDemo ? 'Demo Preset' : 'Live GPS'}
              </span>
            </div>

            {gpsNotice && <div className="text-xs text-slate-600">{gpsNotice}</div>}

            {/* Demo Location Quick Picker */}
            <div className="pt-1">
              <label htmlFor="demo-loc-select" className="block text-[11px] font-medium text-slate-500 mb-1">
                Quick Demo Location (For Judges)
              </label>
              <select
                id="demo-loc-select"
                value={selectedPreset.id}
                onChange={(e) => {
                  const found = DEMO_LOCATIONS.find((d) => d.id === e.target.value);
                  if (found) handleSelectPreset(found);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-800 focus:border-slate-900 focus:outline-none"
              >
                {DEMO_LOCATIONS.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.label} ({loc.city})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Emergency Category Buttons */}
          <div>
            <div className="text-xs font-medium text-slate-700 mb-1.5">Emergency Category</div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    category === cat
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label htmlFor="sos-notes" className="block text-xs font-medium text-slate-700 mb-1">
              Brief Situation Note (Optional)
            </label>
            <input
              id="sos-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                mode === 'SOS'
                  ? 'e.g., Severe chest pain near metro gate 2'
                  : 'e.g., Two-wheeler collision at intersection'
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          {submitError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {submitError}
            </div>
          )}

          {/* Giant Thumb-Friendly SOS Trigger */}
          <button
            type="button"
            onClick={handleSubmitAlert}
            disabled={submitting}
            className={`w-full min-h-[60px] rounded-2xl px-5 py-4 text-white font-display font-bold text-base flex items-center justify-center gap-2.5 shadow-md active:scale-[0.98] transition-all disabled:opacity-70 ${
              mode === 'SOS'
                ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/15'
            }`}
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
            <span>
              {submitting
                ? 'Transmitting GPS & Alert...'
                : mode === 'SOS'
                  ? 'SEND SOS DISTRESS SIGNAL'
                  : 'SUBMIT ANONYMOUS SECURE ALERT'}
            </span>
          </button>

          <p className="text-center text-[11px] text-slate-500">
            Triggers instant WebSocket alert + siren on the Admin PC Command Center.
          </p>
        </div>
      )}
    </div>
  );
};
