import { useCallback, useEffect, useRef, useState } from 'react';
import type { Hospital, Incident, JudgeSuggestion, WsEvent } from '../types';

interface UseRakshaRealtimeResult {
  hospitals: Hospital[];
  incidents: Incident[];
  suggestions: JudgeSuggestion[];
  wsConnected: boolean;
  latestIncomingAlert: Incident | null;
  clearIncomingAlert: () => void;
  refreshState: () => Promise<void>;
}

export function useRakshaRealtime(onNewIncident?: (inc: Incident) => void): UseRakshaRealtimeResult {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [suggestions, setSuggestions] = useState<JudgeSuggestion[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [latestIncomingAlert, setLatestIncomingAlert] = useState<Incident | null>(null);
  const onNewIncidentRef = useRef(onNewIncident);
  onNewIncidentRef.current = onNewIncident;

  const refreshState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        setHospitals(data.hospitals || []);
        setIncidents(data.incidents || []);
        setSuggestions(data.suggestions || []);
      }
    } catch {
      // Handled by WebSocket reconnection
    }
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let closedByCleanup = false;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/ws`;
      ws = new WebSocket(url);

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WsEvent;
          if (msg.event === 'state:sync') {
            setHospitals(msg.payload.hospitals);
            setIncidents(msg.payload.incidents);
            setSuggestions(msg.payload.suggestions);
          } else if (msg.event === 'incident:created') {
            setIncidents((prev) => {
              if (prev.some((i) => i.id === msg.payload.id)) return prev;
              return [msg.payload, ...prev];
            });
            setLatestIncomingAlert(msg.payload);
            onNewIncidentRef.current?.(msg.payload);
          } else if (msg.event === 'incident:updated') {
            setIncidents((prev) => {
              const exists = prev.some((i) => i.id === msg.payload.id);
              if (!exists) return [msg.payload, ...prev];
              return prev.map((i) => (i.id === msg.payload.id ? msg.payload : i));
            });
            setLatestIncomingAlert((curr) =>
              curr && curr.id === msg.payload.id ? msg.payload : curr,
            );
          } else if (msg.event === 'hospital:created') {
            setHospitals((prev) => {
              if (prev.some((h) => h.id === msg.payload.id)) return prev;
              return [msg.payload, ...prev];
            });
          } else if (msg.event === 'suggestion:created') {
            setSuggestions((prev) => {
              if (prev.some((s) => s.id === msg.payload.id)) return prev;
              return [msg.payload, ...prev];
            });
          }
        } catch {
          // Ignore malformed frame
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (!closedByCleanup) {
          reconnectTimer = window.setTimeout(connect, 1500);
        }
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    refreshState();
    connect();

    return () => {
      closedByCleanup = true;
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [refreshState]);

  const clearIncomingAlert = useCallback(() => {
    setLatestIncomingAlert(null);
  }, []);

  return {
    hospitals,
    incidents,
    suggestions,
    wsConnected,
    latestIncomingAlert,
    clearIncomingAlert,
    refreshState,
  };
}
