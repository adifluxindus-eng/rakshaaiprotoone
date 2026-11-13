export type IncidentType = 'DISTRESS_SOS' | 'SECURE_ALERT';

export type IncidentStatus =
  | 'REPORTED'
  | 'ACCEPTED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'RESOLVED';

export type IncidentCategory =
  | 'Medical Emergency'
  | 'Road Accident'
  | 'Cardiac / Trauma'
  | 'Public Safety'
  | 'Fire Hazard';

export interface Hospital {
  id: string;
  name: string;
  city: string;
  area: string;
  address: string;
  latitude: number;
  longitude: number;
  icuBedsAvailable: number;
  ambulancesReady: number;
  phone: string;
  addedByAdmin: boolean;
  createdAt: string;
}

export interface Incident {
  id: string;
  type: IncidentType;
  category: IncidentCategory;
  reporterName: string;
  reporterPhone: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  isDemoLocation: boolean;
  notes: string;
  status: IncidentStatus;
  assignedHospitalId: string | null;
  assignedHospitalName: string | null;
  assignedHospitalLat: number | null;
  assignedHospitalLng: number | null;
  assignedAmbulanceCode: string | null;
  driverName: string | null;
  driverPhone: string | null;
  routeProgress: number;
  etaMinutes: number;
  distanceKm: number;
  createdAt: string;
  acceptedAt: string | null;
}

export interface JudgeSuggestion {
  id: string;
  judgeName: string;
  role: string;
  category: string;
  message: string;
  createdAt: string;
}

export interface DemoLocationPreset {
  id: string;
  label: string;
  area: string;
  city: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
}

export const DEMO_LOCATIONS: DemoLocationPreset[] = [
  {
    id: 'cp-delhi',
    label: 'Connaught Place, Inner Circle',
    area: 'Central Delhi',
    city: 'New Delhi',
    latitude: 28.6315,
    longitude: 77.2167,
    accuracyMeters: 6.2,
  },
  {
    id: 'india-gate',
    label: 'Kartavya Path, India Gate',
    area: 'Lutyens Delhi',
    city: 'New Delhi',
    latitude: 28.6129,
    longitude: 77.2295,
    accuracyMeters: 4.8,
  },
  {
    id: 'hauz-khas',
    label: 'Hauz Khas Metro Junction',
    area: 'South Delhi',
    city: 'New Delhi',
    latitude: 28.5431,
    longitude: 77.2066,
    accuracyMeters: 7.5,
  },
  {
    id: 'cyber-hub',
    label: 'DLF CyberHub Promenade',
    area: 'Phase 2',
    city: 'Gurugram',
    latitude: 28.495,
    longitude: 77.0895,
    accuracyMeters: 5.4,
  },
  {
    id: 'indiranagar',
    label: '100 Feet Road, Indiranagar',
    area: 'East Bengaluru',
    city: 'Bengaluru',
    latitude: 12.9784,
    longitude: 77.6408,
    accuracyMeters: 6.0,
  },
];

export type WsEvent =
  | {
      event: 'state:sync';
      payload: {
        hospitals: Hospital[];
        incidents: Incident[];
        suggestions: JudgeSuggestion[];
      };
    }
  | { event: 'incident:created'; payload: Incident }
  | { event: 'incident:updated'; payload: Incident }
  | { event: 'hospital:created'; payload: Hospital }
  | { event: 'suggestion:created'; payload: JudgeSuggestion };
