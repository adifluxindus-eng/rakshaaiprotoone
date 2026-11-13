import React, { useMemo } from 'react';
import {
  Clock,
  Crosshair,
  ExternalLink,
  Hospital as HospitalIcon,
  MapPin,
  Navigation,
  Phone,
  ShieldAlert,
  Truck,
} from 'lucide-react';
import type { Hospital, Incident } from '../types';

interface BlinkitRouteMapProps {
  incident: Incident;
  hospitals: Hospital[];
  compact?: boolean;
  isAdminView?: boolean;
  onUpdateStatus?: (incidentId: string, status: 'ARRIVED' | 'RESOLVED') => void;
}

interface Point {
  x: number;
  y: number;
}

function interpolatePolyline(points: Point[], t: number): { x: number; y: number; angle: number } {
  if (points.length < 2) return { x: points[0]?.x ?? 300, y: points[0]?.y ?? 200, angle: 0 };
  const clamped = Math.max(0, Math.min(1, t));

  const segments: { p1: Point; p2: Point; len: number }[] = [];
  let totalLen = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    segments.push({ p1, p2, len });
    totalLen += len;
  }

  if (totalLen === 0) return { x: points[0].x, y: points[0].y, angle: 0 };
  let target = clamped * totalLen;

  for (const seg of segments) {
    if (target <= seg.len || seg === segments[segments.length - 1]) {
      const ratio = seg.len === 0 ? 0 : Math.min(1, target / seg.len);
      const x = seg.p1.x + (seg.p2.x - seg.p1.x) * ratio;
      const y = seg.p1.y + (seg.p2.y - seg.p1.y) * ratio;
      const angle = (Math.atan2(seg.p2.y - seg.p1.y, seg.p2.x - seg.p1.x) * 180) / Math.PI;
      return { x, y, angle };
    }
    target -= seg.len;
  }

  const last = points[points.length - 1];
  return { x: last.x, y: last.y, angle: 0 };
}

export const BlinkitRouteMap: React.FC<BlinkitRouteMapProps> = ({
  incident,
  hospitals,
  compact = false,
  isAdminView = false,
  onUpdateStatus,
}) => {
  const width = 720;
  const height = compact ? 310 : 420;

  const hospLat = incident.assignedHospitalLat ?? incident.latitude - 0.018;
  const hospLng = incident.assignedHospitalLng ?? incident.longitude - 0.022;

  // Map lat/lng to SVG viewport coordinates with clean padding
  const projection = useMemo(() => {
    const lats = [incident.latitude, hospLat];
    const lngs = [incident.longitude, hospLng];

    // Include nearby hospitals within ~0.12 deg so newly added local hospitals appear on map
    const nearbyHospitals = hospitals.filter(
      (h) =>
        Math.abs(h.latitude - incident.latitude) < 0.14 &&
        Math.abs(h.longitude - incident.longitude) < 0.14,
    );
    nearbyHospitals.forEach((h) => {
      lats.push(h.latitude);
      lngs.push(h.longitude);
    });

    const minLat = Math.min(...lats) - 0.008;
    const maxLat = Math.max(...lats) + 0.008;
    const minLng = Math.min(...lngs) - 0.012;
    const maxLng = Math.max(...lngs) + 0.012;

    const padX = 76;
    const padY = 66;
    const usableW = width - padX * 2;
    const usableH = height - padY * 2;

    const toPoint = (lat: number, lng: number): Point => {
      const nx = maxLng === minLng ? 0.5 : (lng - minLng) / (maxLng - minLng);
      const ny = maxLat === minLat ? 0.5 : (maxLat - lat) / (maxLat - minLat);
      return {
        x: padX + nx * usableW,
        y: padY + ny * usableH,
      };
    };

    const victimPt = toPoint(incident.latitude, incident.longitude);
    const hospitalPt = toPoint(hospLat, hospLng);

    // Realistic street-grid route waypoints between hospital & victim
    const midX1 = hospitalPt.x + (victimPt.x - hospitalPt.x) * 0.32;
    const midY1 = hospitalPt.y;
    const midX2 = hospitalPt.x + (victimPt.x - hospitalPt.x) * 0.32;
    const midY2 = hospitalPt.y + (victimPt.y - hospitalPt.y) * 0.58;
    const midX3 = hospitalPt.x + (victimPt.x - hospitalPt.x) * 0.76;
    const midY3 = hospitalPt.y + (victimPt.y - hospitalPt.y) * 0.58;
    const midX4 = victimPt.x;
    const midY4 = hospitalPt.y + (victimPt.y - hospitalPt.y) * 0.72;

    const routePoints: Point[] = [
      hospitalPt,
      { x: midX1, y: midY1 },
      { x: midX2, y: midY2 },
      { x: midX3, y: midY3 },
      { x: midX4, y: midY4 },
      victimPt,
    ];

    return { toPoint, victimPt, hospitalPt, routePoints, nearbyHospitals };
  }, [incident.latitude, incident.longitude, hospLat, hospLng, hospitals, height]);

  const progress =
    incident.status === 'REPORTED'
      ? 0
      : incident.status === 'ARRIVED' || incident.status === 'RESOLVED'
        ? 1
        : incident.routeProgress;

  const ambulancePos = useMemo(
    () => interpolatePolyline(projection.routePoints, progress),
    [projection.routePoints, progress],
  );

  const polylineStr = projection.routePoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Completed portion polyline up to ambulance
  const currentInstruction = useMemo(() => {
    if (incident.status === 'REPORTED') {
      return 'Awaiting admin acceptance to lock dispatch route';
    }
    if (incident.status === 'ARRIVED') {
      return `Arrived at ${incident.locationLabel}`;
    }
    if (incident.status === 'RESOLVED') {
      return 'Patient handover completed at hospital';
    }
    if (progress < 0.25) return 'Exit hospital gate onto Arterial Ring Road · 450 m';
    if (progress < 0.55) return 'Continue straight past Central Chowk Signal · 720 m';
    if (progress < 0.8) return 'Turn right toward Sector Approach Lane · 340 m';
    return `Approaching ${incident.locationLabel} · 120 m`;
  }, [incident.status, incident.locationLabel, progress]);

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${hospLat},${hospLng}&destination=${incident.latitude},${incident.longitude}&travelmode=driving`;

  const isDispatched = incident.status !== 'REPORTED';

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Blinkit-style Live ETA Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-slate-900 px-4 py-3 text-white">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              incident.status === 'ARRIVED' || incident.status === 'RESOLVED'
                ? 'bg-emerald-600'
                : isDispatched
                  ? 'bg-emerald-500'
                  : 'bg-red-600'
            }`}
          >
            {isDispatched ? <Truck className="h-5 w-5 text-white" /> : <ShieldAlert className="h-5 w-5 text-white" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <span className="truncate">
                {incident.status === 'REPORTED'
                  ? 'Incident Pending Dispatch Acceptance'
                  : incident.status === 'ARRIVED'
                    ? 'Ambulance Arrived at Scene'
                    : incident.status === 'RESOLVED'
                      ? 'Incident Resolved'
                      : `Ambulance arriving in ${incident.etaMinutes} min`}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 mt-0.5">
              <span className="font-mono">{incident.id}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{incident.distanceKm.toFixed(2)} km away</span>
              {incident.assignedAmbulanceCode && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-emerald-300">{incident.assignedAmbulanceCode}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/20 transition-colors whitespace-nowrap"
          >
            <Navigation className="h-3.5 w-3.5" />
            <span>Open Directions</span>
            <ExternalLink className="h-3 w-3 opacity-75" />
          </a>
        </div>
      </div>

      {/* Turn-by-turn instruction bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-950">
        <div className="flex items-center gap-2 font-medium">
          <Navigation className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
          <span>{currentInstruction}</span>
        </div>
        <div className="font-mono text-[11px] text-emerald-800">
          {incident.latitude.toFixed(4)}° N, {incident.longitude.toFixed(4)}° E (±{incident.accuracyMeters.toFixed(1)}m)
        </div>
      </div>

      {/* Stylized Blinkit-style City Street Grid Map */}
      <div className="relative bg-slate-100">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto block select-none"
          role="img"
          aria-label={`Live dispatch route map for ${incident.id}`}
        >
          {/* Base city ground */}
          <rect width={width} height={height} fill="#EEF2F6" />

          {/* Urban green parks & water channel */}
          <rect x="42" y="34" width="110" height="72" rx="10" fill="#DCFCE7" />
          <rect x="520" y={height - 108} width="142" height="76" rx="12" fill="#DCFCE7" />
          <rect x="280" y="24" width="138" height="58" rx="8" fill="#E2E8F0" />
          <path d={`M 0 ${height * 0.85} Q ${width * 0.45} ${height * 0.78} ${width} ${height * 0.9}`} fill="none" stroke="#BAE6FD" strokeWidth="14" opacity="0.65" />

          {/* Secondary street grid */}
          {[0.18, 0.36, 0.58, 0.78].map((row, idx) => (
            <line
              key={`h-${idx}`}
              x1="0"
              y1={height * row}
              x2={width}
              y2={height * row}
              stroke="#FFFFFF"
              strokeWidth="6"
            />
          ))}
          {[0.16, 0.32, 0.52, 0.76, 0.9].map((col, idx) => (
            <line
              key={`v-${idx}`}
              x1={width * col}
              y1="0"
              x2={width * col}
              y2={height}
              stroke="#FFFFFF"
              strokeWidth="6"
            />
          ))}

          {/* Major arterial roads */}
          <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.42} stroke="#CBD5E1" strokeWidth="10" />
          <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.42} stroke="#FFFFFF" strokeWidth="7" />
          <line x1={width * 0.44} y1="0" x2={width * 0.48} y2={height} stroke="#CBD5E1" strokeWidth="10" />
          <line x1={width * 0.44} y1="0" x2={width * 0.48} y2={height} stroke="#FFFFFF" strokeWidth="7" />

          {/* Roundabout landmark */}
          <circle cx={width * 0.46} cy={height * 0.46} r="18" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="3" />
          <circle cx={width * 0.46} cy={height * 0.46} r="8" fill="#BBF7D0" />

          {/* Street labels */}
          <text x="80" y={height * 0.36 - 8} fontSize="10" fill="#64748B" fontFamily="DM Sans, sans-serif">
            Sansad Marg Arterial
          </text>
          <text x={width * 0.54} y={height * 0.58 - 8} fontSize="10" fill="#64748B" fontFamily="DM Sans, sans-serif">
            Janpath Sector Corridor
          </text>

          {/* Nearby registered hospitals */}
          {projection.nearbyHospitals.map((h) => {
            const pt = projection.toPoint(h.latitude, h.longitude);
            const isAssigned = h.id === incident.assignedHospitalId;
            if (isAssigned) return null;
            return (
              <g key={h.id} transform={`translate(${pt.x}, ${pt.y})`}>
                <circle r="11" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.5" />
                <path d="M-4 0 H4 M0 -4 V4" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
                <text
                  x="0"
                  y="21"
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="600"
                  fill="#475569"
                  fontFamily="DM Sans, sans-serif"
                >
                  {h.name.slice(0, 22)}
                </text>
              </g>
            );
          })}

          {/* Route casing & active animated route polyline */}
          <polyline
            points={polylineStr}
            fill="none"
            stroke="#0F172A"
            strokeOpacity="0.16"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={polylineStr}
            fill="none"
            stroke={isDispatched ? '#16A34A' : '#DC2626'}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={isDispatched ? '10 8' : '6 8'}
            className={isDispatched && incident.status !== 'ARRIVED' ? 'animate-route-dash' : ''}
          />

          {/* Assigned Hospital Marker */}
          <g transform={`translate(${projection.hospitalPt.x}, ${projection.hospitalPt.y})`}>
            <circle r="18" fill="#0F172A" />
            <circle r="15" fill="#FFFFFF" />
            <path d="M-6 0 H6 M0 -6 V6" stroke="#16A34A" strokeWidth="3.2" strokeLinecap="round" />
            <g transform="translate(0, -28)">
              <rect x="-86" y="-13" width="172" height="22" rx="6" fill="#0F172A" />
              <text
                x="0"
                y="2"
                textAnchor="middle"
                fontSize="10.5"
                fontWeight="600"
                fill="#FFFFFF"
                fontFamily="Plus Jakarta Sans, sans-serif"
              >
                {(incident.assignedHospitalName || 'Assigned Hospital').slice(0, 26)}
              </text>
            </g>
          </g>

          {/* Victim / SOS Pin + GPS Accuracy Radius */}
          <g transform={`translate(${projection.victimPt.x}, ${projection.victimPt.y})`}>
            <circle r="34" fill="#DC2626" fillOpacity="0.12" stroke="#DC2626" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 3" />
            <circle r="16" fill="#DC2626" fillOpacity="0.2" />
            <circle r="10" fill="#DC2626" stroke="#FFFFFF" strokeWidth="2.5" />
            <g transform="translate(0, 26)">
              <rect x="-78" y="-9" width="156" height="21" rx="6" fill="#DC2626" />
              <text
                x="0"
                y="5"
                textAnchor="middle"
                fontSize="10.5"
                fontWeight="700"
                fill="#FFFFFF"
                fontFamily="Plus Jakarta Sans, sans-serif"
              >
                SOS · {incident.locationLabel.slice(0, 20)}
              </text>
            </g>
          </g>

          {/* Moving Blinkit-style Ambulance Unit */}
          {isDispatched && (
            <g transform={`translate(${ambulancePos.x}, ${ambulancePos.y})`}>
              <circle r="20" fill="#16A34A" fillOpacity="0.18" />
              <rect x="-15" y="-11" width="30" height="22" rx="6" fill="#16A34A" stroke="#FFFFFF" strokeWidth="2.5" />
              <path d="M-5 0 H5 M0 -5 V5" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
              <g transform="translate(0, -22)">
                <rect x="-42" y="-10" width="84" height="17" rx="4" fill="#0F172A" />
                <text
                  x="0"
                  y="2"
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="600"
                  fill="#4ADE80"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {incident.assignedAmbulanceCode || 'AMB-104'}
                </text>
              </g>
            </g>
          )}
        </svg>

        {/* Floating Map Legend Bottom-Left */}
        <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm backdrop-blur-sm">
          <span className="inline-flex items-center gap-1.5">
            <Crosshair className="h-3.5 w-3.5 text-red-600" />
            SOS Target
          </span>
          <span className="inline-flex items-center gap-1.5">
            <HospitalIcon className="h-3.5 w-3.5 text-emerald-700" />
            Hospital Base
          </span>
          {isDispatched && (
            <span className="inline-flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-emerald-600" />
              Live Ambulance ({Math.round(progress * 100)}%)
            </span>
          )}
        </div>
      </div>

      {/* Bottom Blinkit-style Responder / Dispatch Progress & Action Bar */}
      <div className="border-t border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <div className="text-xs text-slate-500">Assigned Hospital</div>
              <div className="text-sm font-semibold text-slate-900">
                {incident.assignedHospitalName || 'Pending Hospital Match'}
              </div>
            </div>
            {incident.driverName && (
              <div>
                <div className="text-xs text-slate-500">Ambulance Paramedic</div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <span>{incident.driverName}</span>
                  <span className="text-xs font-normal font-mono text-slate-500">{incident.driverPhone}</span>
                </div>
              </div>
            )}
            <div>
              <div className="text-xs text-slate-500">Dispatch Progress</div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span className="font-mono">
                  {incident.status === 'REPORTED'
                    ? 'Waiting for Acceptance'
                    : incident.status === 'ARRIVED'
                      ? 'On Scene (100%)'
                      : incident.status === 'RESOLVED'
                        ? 'Completed'
                        : `${Math.round(progress * 100)}% · ETA ${incident.etaMinutes} min`}
                </span>
              </div>
            </div>
          </div>

          {isAdminView && onUpdateStatus && isDispatched && incident.status !== 'RESOLVED' && (
            <div className="flex items-center gap-2 shrink-0">
              {incident.status !== 'ARRIVED' && (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(incident.id, 'ARRIVED')}
                  className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  Mark Arrived
                </button>
              )}
              <button
                type="button"
                onClick={() => onUpdateStatus(incident.id, 'RESOLVED')}
                className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                Complete Handover
              </button>
            </div>
          )}

          {!isAdminView && incident.driverPhone && (
            <a
              href={`tel:${incident.driverPhone.replace(/\s+/g, '')}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <Phone className="h-3.5 w-3.5 text-emerald-600" />
              <span>Call Paramedic</span>
            </a>
          )}
        </div>

        {/* Clean linear progress track */}
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full transition-all duration-500 ${
              incident.status === 'REPORTED' ? 'bg-red-500 w-[8%]' : 'bg-emerald-600'
            }`}
            style={{ width: incident.status === 'REPORTED' ? '8%' : `${Math.max(10, Math.round(progress * 100))}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-slate-500">
          <span className={incident.status !== 'REPORTED' ? 'text-emerald-700 font-semibold' : 'text-red-600 font-semibold'}>
            SOS Received
          </span>
          <span className={isDispatched ? 'text-emerald-700 font-semibold' : ''}>
            Admin Accepted &amp; Dispatched
          </span>
          <span className={incident.status === 'ARRIVED' || incident.status === 'RESOLVED' ? 'text-emerald-700 font-semibold' : ''}>
            Ambulance Arrived
          </span>
          <span className={incident.status === 'RESOLVED' ? 'text-emerald-700 font-semibold' : ''}>
            Hospital Handover
          </span>
        </div>
      </div>

      {/* Coordinates Verification Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-red-600" />
          <span>{incident.locationLabel}</span>
          {incident.isDemoLocation && (
            <span className="text-slate-400">· Demo GPS Coordinate</span>
          )}
        </span>
        <span className="font-mono text-[11px] text-slate-500">
          Reporter: {incident.reporterName} · {incident.category}
        </span>
      </div>
    </div>
  );
};
