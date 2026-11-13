import React, { useEffect, useState } from 'react';
import {
  AlertOctagon,
  Bell,
  Building2,
  Check,
  Clock,
  Hospital as HospitalIcon,
  Lock,
  MapPin,
  Plus,
  Shield,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { DEMO_LOCATIONS, type Hospital, type Incident } from '../types';
import { emergencyAlarm } from '../utils/alarm';
import { BlinkitRouteMap } from './BlinkitRouteMap';

interface AdminDashboardViewProps {
  hospitals: Hospital[];
  incidents: Incident[];
  wsConnected: boolean;
  latestIncomingAlert: Incident | null;
  clearIncomingAlert: () => void;
  isEmbeddedSplit?: boolean;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  hospitals,
  incidents,
  wsConnected,
  latestIncomingAlert,
  clearIncomingAlert,
  isEmbeddedSplit = false,
}) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState('admin@raksha.ai');
  const [password, setPassword] = useState('raksha2026');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<'dispatch' | 'hospitals'>('dispatch');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'REPORTED' | 'ACTIVE' | 'RESOLVED'>('ALL');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedDispatchHospitalId, setSelectedDispatchHospitalId] = useState<string>('');
  const [alarmMuted, setAlarmMuted] = useState(false);
  const [alarmActive, setAlarmActive] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  // Add Hospital Form State
  const [showAddHospitalForm, setShowAddHospitalForm] = useState(false);
  const [hospName, setHospName] = useState('');
  const [hospCity, setHospCity] = useState('New Delhi');
  const [hospArea, setHospArea] = useState('');
  const [hospAddress, setHospAddress] = useState('');
  const [hospLat, setHospLat] = useState('28.6289');
  const [hospLng, setHospLng] = useState('77.2065');
  const [hospBeds, setHospBeds] = useState('12');
  const [hospAmbs, setHospAmbs] = useState('4');
  const [hospPhone, setHospPhone] = useState('+91 11 4050 2200');
  const [addingHospital, setAddingHospital] = useState(false);
  const [hospitalMsg, setHospitalMsg] = useState<string | null>(null);

  const pendingIncidents = incidents.filter((i) => i.status === 'REPORTED');
  const popupIncident =
    (latestIncomingAlert &&
    incidents.find((i) => i.id === latestIncomingAlert.id && i.status === 'REPORTED')) ||
    pendingIncidents[0] ||
    null;

  // Trigger emergency siren when Admin is logged in and there is a pending SOS
  useEffect(() => {
    if (!authenticated) {
      emergencyAlarm.stop();
      setAlarmActive(false);
      return;
    }

    if (pendingIncidents.length > 0 && !alarmMuted) {
      emergencyAlarm.start();
      setAlarmActive(true);
    } else {
      emergencyAlarm.stop();
      setAlarmActive(false);
    }

    return () => {
      emergencyAlarm.stop();
    };
  }, [authenticated, pendingIncidents.length, alarmMuted]);

  // Keep selectedDispatchHospitalId synced with popupIncident's suggested hospital
  useEffect(() => {
    if (popupIncident?.assignedHospitalId) {
      setSelectedDispatchHospitalId(popupIncident.assignedHospitalId);
    } else if (hospitals[0]) {
      setSelectedDispatchHospitalId(hospitals[0].id);
    }
  }, [popupIncident?.id, popupIncident?.assignedHospitalId, hospitals]);

  // Auto-select latest active or reported incident if none selected
  const selectedIncident =
    incidents.find((i) => i.id === selectedIncidentId) || incidents[0] || null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    emergencyAlarm.unlock();
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Authentication failed');
      }
      setAuthenticated(true);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleAcceptIncident = async (incidentId: string, hospitalId?: string) => {
    setAcceptingId(incidentId);
    emergencyAlarm.stop();
    setAlarmActive(false);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospitalId: hospitalId || selectedDispatchHospitalId }),
      });
      if (res.ok) {
        const updated: Incident = await res.json();
        setSelectedIncidentId(updated.id);
        clearIncomingAlert();
        setActiveTab('dispatch');
      }
    } finally {
      setAcceptingId(null);
    }
  };

  const handleUpdateStatus = async (incidentId: string, status: 'ARRIVED' | 'RESOLVED') => {
    await fetch(`/api/incidents/${incidentId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  };

  const handleAddHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospName.trim() || !hospCity.trim()) return;
    setAddingHospital(true);
    setHospitalMsg(null);
    try {
      const res = await fetch('/api/hospitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: hospName,
          city: hospCity,
          area: hospArea || 'Central Zone',
          address: hospAddress || `${hospArea || 'Central Zone'}, ${hospCity}`,
          latitude: Number(hospLat) || 28.6289,
          longitude: Number(hospLng) || 77.2065,
          icuBedsAvailable: Number(hospBeds) || 10,
          ambulancesReady: Number(hospAmbs) || 3,
          phone: hospPhone,
        }),
      });
      if (res.ok) {
        const created: Hospital = await res.json();
        setHospitalMsg(`Added ${created.name} (${created.id}) to active dispatch network.`);
        setHospName('');
        setHospArea('');
        setHospAddress('');
        setShowAddHospitalForm(false);
      }
    } finally {
      setAddingHospital(false);
    }
  };

  const filteredIncidents = incidents.filter((inc) => {
    if (statusFilter === 'REPORTED') return inc.status === 'REPORTED';
    if (statusFilter === 'ACTIVE') return inc.status === 'ACCEPTED' || inc.status === 'EN_ROUTE' || inc.status === 'ARRIVED';
    if (statusFilter === 'RESOLVED') return inc.status === 'RESOLVED';
    return true;
  });

  if (!authenticated) {
    return (
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-display">
              Admin &amp; Hospital Command Login
            </h2>
            <p className="text-xs text-slate-500">
              Monitor live SOS WebSockets, add hospitals, and dispatch ambulances
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="mt-5 space-y-3.5">
          <div>
            <label htmlFor="admin-email" className="block text-xs font-medium text-slate-700">
              Command Email
            </label>
            <input
              id="admin-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-xs font-medium text-slate-700">
              Access Passkey
            </label>
            <input
              id="admin-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 font-mono focus:border-slate-900 focus:outline-none"
            />
          </div>

          {loginError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {loginError}
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 flex items-center justify-between">
            <span>Demo Judge Credentials</span>
            <span className="font-mono text-slate-800">admin@raksha.ai / raksha2026</span>
          </div>

          {pendingIncidents.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {pendingIncidents.length} live SOS alert waiting — sign in to hear siren &amp; accept dispatch.
            </div>
          )}

          <button
            type="submit"
            disabled={loggingIn}
            className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-60"
          >
            <Lock className="h-4 w-4" />
            <span>{loggingIn ? 'Verifying...' : 'Sign In to Command Center'}</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Command Bar Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-4 min-w-0">
          <div>
            <div className="text-sm font-bold text-slate-900 font-display">
              Raksha AI Control Room
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Officer Priya Sharma</span>
              <span aria-hidden="true">·</span>
              <span className={wsConnected ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                {wsConnected ? 'WebSocket Connected' : 'Reconnecting...'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{hospitals.length} Hospitals</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Workspace Tabs */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('dispatch')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'dispatch'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Emergency Dispatch ({incidents.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('hospitals')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'hospitals'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hospitals &amp; Add ({hospitals.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              emergencyAlarm.unlock();
              setAlarmMuted((m) => !m);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              alarmActive && !alarmMuted
                ? 'border-red-300 bg-red-50 text-red-700'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {alarmMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            <span>{alarmMuted ? 'Alarm Muted' : alarmActive ? 'Siren Active' : 'Alarm Ready'}</span>
          </button>

          <button
            type="button"
            onClick={() => setAuthenticated(false)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Prominent Real-Time Incoming SOS Emergency Pop-Up Notification */}
      {popupIncident && (
        <div
          role="alertdialog"
          aria-live="assertive"
          className="rounded-xl border-2 border-red-600 bg-red-50 p-4 shadow-lg"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white">
                <AlertOctagon className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-red-700">
                  <span className="inline-flex items-center gap-1">
                    <Bell className="h-3.5 w-3.5" />
                    INCOMING {popupIncident.type === 'DISTRESS_SOS' ? 'SOS DISTRESS' : 'SECURE ALERT'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{popupIncident.id}</span>
                  <span aria-hidden="true">·</span>
                  <span>{popupIncident.category}</span>
                </div>
                <h3 className="mt-0.5 text-base font-bold text-slate-900 font-display">
                  {popupIncident.locationLabel}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700">
                  <span>Reporter: {popupIncident.reporterName}</span>
                  <span className="font-mono">
                    {popupIncident.latitude.toFixed(4)}° N, {popupIncident.longitude.toFixed(4)}° E
                  </span>
                  <span className="font-mono">Accuracy ±{popupIncident.accuracyMeters.toFixed(1)} m</span>
                  <span className="font-mono">Est. {popupIncident.distanceKm.toFixed(2)} km</span>
                </div>
                {popupIncident.notes && (
                  <p className="mt-1.5 text-xs text-slate-800">Note: {popupIncident.notes}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
              <select
                aria-label="Select hospital for dispatch"
                value={selectedDispatchHospitalId}
                onChange={(e) => setSelectedDispatchHospitalId(e.target.value)}
                className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-red-600 focus:outline-none"
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.icuBedsAvailable} ICU beds)
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={acceptingId === popupIncident.id}
                onClick={() => handleAcceptIncident(popupIncident.id, selectedDispatchHospitalId)}
                className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors whitespace-nowrap disabled:opacity-60"
              >
                <Check className="h-4 w-4" />
                <span>
                  {acceptingId === popupIncident.id
                    ? 'Dispatching...'
                    : 'Accept & Open Live Route'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: Live Emergency Dispatch & Blinkit-style Route View */}
      {activeTab === 'dispatch' ? (
        <div className={`grid gap-4 ${isEmbeddedSplit ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'}`}>
          {/* Left Column: Live Incident Queue */}
          <div className={`${isEmbeddedSplit ? '' : 'lg:col-span-5'} rounded-xl border border-slate-200 bg-white overflow-hidden`}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
              <h3 className="text-sm font-bold text-slate-900 font-display">
                Live Incident Feed
              </h3>
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 text-[11px]">
                {(['ALL', 'REPORTED', 'ACTIVE', 'RESOLVED'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setStatusFilter(tab)}
                    className={`rounded-md px-2 py-1 font-medium transition-colors ${
                      statusFilter === tab
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab === 'ALL' ? 'All' : tab === 'REPORTED' ? 'Pending' : tab === 'ACTIVE' ? 'En Route' : 'Done'}
                  </button>
                ))}
              </div>
            </div>

            {filteredIncidents.length === 0 ? (
              <div className="p-8 text-center">
                <MapPin className="mx-auto h-7 w-7 text-slate-300" />
                <div className="mt-2 text-sm font-semibold text-slate-800">
                  No emergency signals received yet
                </div>
                <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
                  Trigger an SOS Distress Signal or Secure Alert from the Citizen Mobile App to see the live WebSocket pop-up, siren, and Blinkit-style navigation map.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[440px] overflow-y-auto">
                {filteredIncidents.map((inc) => {
                  const isSelected = selectedIncident?.id === inc.id;
                  return (
                    <div
                      key={inc.id}
                      onClick={() => setSelectedIncidentId(inc.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') setSelectedIncidentId(inc.id);
                      }}
                      className={`w-full text-left px-4 py-3 cursor-pointer transition-colors ${
                        isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-mono font-semibold text-slate-900">{inc.id}</span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={
                                inc.status === 'REPORTED'
                                  ? 'font-semibold text-red-600'
                                  : inc.status === 'RESOLVED'
                                    ? 'font-medium text-slate-500'
                                    : 'font-semibold text-emerald-700'
                              }
                            >
                              {inc.status === 'REPORTED'
                                ? 'Needs Acceptance'
                                : inc.status === 'EN_ROUTE'
                                  ? `En Route (${inc.etaMinutes}m)`
                                  : inc.status}
                            </span>
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-900 truncate">
                            {inc.locationLabel}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span>{inc.reporterName}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono">
                              {inc.latitude.toFixed(4)}, {inc.longitude.toFixed(4)}
                            </span>
                          </div>
                        </div>

                        {inc.status === 'REPORTED' ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptIncident(inc.id);
                            }}
                            className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                          >
                            Accept
                          </button>
                        ) : (
                          <span className="shrink-0 text-xs font-mono text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(inc.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Blinkit-Style Route & Navigation Map */}
          <div className={`${isEmbeddedSplit ? '' : 'lg:col-span-7'}`}>
            {selectedIncident ? (
              <BlinkitRouteMap
                incident={selectedIncident}
                hospitals={hospitals}
                isAdminView
                onUpdateStatus={handleUpdateStatus}
              />
            ) : (
              <div className="flex h-full min-h-[340px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center">
                <HospitalIcon className="h-8 w-8 text-slate-300" />
                <div className="mt-3 text-sm font-semibold text-slate-900">
                  Live Blinkit-Style Dispatch Map Standby
                </div>
                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  Once a citizen submits SOS and you click Accept, this map displays the real-time ambulance route, ETA countdown, hospital pin, and turn-by-turn directions.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* TAB 2: Hospital Network & Add Hospital Form */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display">
                Registered Emergency Hospitals
              </h3>
              <p className="text-xs text-slate-500">
                Add a new partner hospital below — it immediately joins nearest-hospital SOS routing and appears on the dispatch map.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddHospitalForm((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{showAddHospitalForm ? 'Close Form' : 'Add Hospital'}</span>
            </button>
          </div>

          {hospitalMsg && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-900">
              {hospitalMsg}
            </div>
          )}

          {showAddHospitalForm && (
            <form
              onSubmit={handleAddHospital}
              className="rounded-xl border border-slate-200 bg-white p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-slate-900 font-display">
                  Register New Hospital Facility
                </h4>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-500">Quick Coordinates:</span>
                  {DEMO_LOCATIONS.slice(0, 3).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setHospCity(preset.city);
                        setHospArea(preset.area);
                        setHospLat((preset.latitude + 0.008).toFixed(4));
                        setHospLng((preset.longitude - 0.009).toFixed(4));
                      }}
                      className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Near {preset.city}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Hospital Name *</label>
                  <input
                    type="text"
                    required
                    value={hospName}
                    onChange={(e) => setHospName(e.target.value)}
                    placeholder="e.g., Apollo Trauma Center"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">City *</label>
                  <input
                    type="text"
                    required
                    value={hospCity}
                    onChange={(e) => setHospCity(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Area / Zone</label>
                  <input
                    type="text"
                    value={hospArea}
                    onChange={(e) => setHospArea(e.target.value)}
                    placeholder="e.g., Sarita Vihar"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Latitude *</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={hospLat}
                    onChange={(e) => setHospLat(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Longitude *</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={hospLng}
                    onChange={(e) => setHospLng(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Emergency Phone</label>
                  <input
                    type="text"
                    value={hospPhone}
                    onChange={(e) => setHospPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">ICU Beds Available</label>
                  <input
                    type="number"
                    min="1"
                    value={hospBeds}
                    onChange={(e) => setHospBeds(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Ambulances Ready</label>
                  <input
                    type="number"
                    min="1"
                    value={hospAmbs}
                    onChange={(e) => setHospAmbs(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Street Address</label>
                  <input
                    type="text"
                    value={hospAddress}
                    onChange={(e) => setHospAddress(e.target.value)}
                    placeholder="Optional full street address"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddHospitalForm(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingHospital}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {addingHospital ? 'Saving Hospital...' : 'Save & Activate Hospital'}
                </button>
              </div>
            </form>
          )}

          {/* Hospitals Table */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Hospital</th>
                  <th className="px-4 py-3 font-semibold">City &amp; Area</th>
                  <th className="px-4 py-3 font-semibold">GPS Coordinates</th>
                  <th className="px-4 py-3 font-semibold text-right">ICU Beds</th>
                  <th className="px-4 py-3 font-semibold text-right">Ambulances</th>
                  <th className="px-4 py-3 font-semibold">Hotline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hospitals.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                        <div>
                          <div className="font-semibold text-slate-900">{h.name}</div>
                          <div className="font-mono text-[11px] text-slate-500">
                            {h.id} {h.addedByAdmin ? '· Added by Admin' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {h.area}, {h.city}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {h.latitude.toFixed(4)}° N, {h.longitude.toFixed(4)}° E
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700">
                      {h.icuBedsAvailable}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                      {h.ambulancesReady}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">{h.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
