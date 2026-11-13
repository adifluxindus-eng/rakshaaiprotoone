import React, { useState } from 'react';
import {
  ArrowRight,
  Columns2,
  MessageSquarePlus,
  ShieldAlert,
  Smartphone,
  Terminal,
} from 'lucide-react';
import type { JudgeSuggestion } from '../types';

export type AppWorkspaceMode = 'welcome' | 'split' | 'citizen' | 'admin' | 'architecture';

interface WelcomeViewProps {
  onNavigate: (mode: AppWorkspaceMode) => void;
  hospitalCount: number;
  incidentCount: number;
  suggestions: JudgeSuggestion[];
}

const STACK_LAYERS = [
  {
    layer: 'Mobile App (Citizen)',
    tech: 'Flutter · Dart (Android-first)',
    role: 'Distress SOS, Secure Alert, Native GPS capture, FCM updates',
  },
  {
    layer: 'Central Backend API',
    tech: 'Python · FastAPI · SQLAlchemy',
    role: 'JWT & RBAC, Gmail OTP, Location processing, WebSocket broker',
  },
  {
    layer: 'PC Command Dashboard',
    tech: 'React · TypeScript · Vite',
    role: 'Admin & Hospital portals, Siren alarm, Live dispatch workflow',
  },
  {
    layer: 'Database & Maps',
    tech: 'MySQL 8 · Google Maps Platform',
    role: 'Normalized UTC incident & audit tables, turn-by-turn routing',
  },
];

export const WelcomeView: React.FC<WelcomeViewProps> = ({
  onNavigate,
  hospitalCount,
  incidentCount,
  suggestions,
}) => {
  const [judgeName, setJudgeName] = useState('');
  const [judgeRole, setJudgeRole] = useState('Hackathon Judge');
  const [category, setCategory] = useState('Dispatch & UX');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedNotice, setSubmittedNotice] = useState(false);

  const handleSubmitSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    setSubmittedNotice(false);
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          judgeName: judgeName.trim() || 'Hackathon Judge',
          role: judgeRole.trim() || 'Reviewer',
          category,
          message: message.trim(),
        }),
      });
      if (res.ok) {
        setMessage('');
        setSubmittedNotice(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-2">
        <div className="lg:col-span-7 flex flex-col justify-center">
          <div className="text-xs font-medium text-red-600">
            Hackathon Interactive Showcase · India Emergency Coordination
          </div>
          <h1
            className="mt-2.5 text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 font-display leading-[1.1]"
            style={{ textWrap: 'balance' }}
          >
            Golden-hour emergency dispatch from citizen tap to live ambulance route.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-600 leading-relaxed">
            Test the full Raksha AI workflow live in your browser: citizens log in with zero password friction to send GPS-tagged SOS signals, while the Admin Command Center receives an instant WebSocket siren alert, registers hospitals, and accepts dispatch onto a Blinkit-style live route map.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('split')}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors whitespace-nowrap"
            >
              <Columns2 className="h-4 w-4" />
              <span>Launch Live Split-Screen Demo</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('citizen')}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <Smartphone className="h-4 w-4 text-slate-600" />
              <span>Citizen App Only</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <ShieldAlert className="h-4 w-4 text-slate-600" />
              <span>Admin Control Room</span>
            </button>
          </div>
        </div>

        {/* Interactive Walkthrough Card */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-display">
              3-Step Judge Walkthrough
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Takes under 30 seconds using our real-time WebSocket server.
            </p>

            <ol className="mt-5 space-y-4">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-900 font-mono text-xs font-bold text-white">
                  1
                </span>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Citizen Instant Login &amp; SOS Trigger
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                    Enter the Citizen App with no ID or password, pick a demo Indian city coordinate (or live GPS), and press Send SOS Distress Signal.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-red-600 font-mono text-xs font-bold text-white">
                  2
                </span>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Admin Pop-Up Alert &amp; Hospital Registration
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                    Sign in to Admin (`admin@raksha.ai`), add new hospitals if desired, and hear the live siren + SOS pop-up with exact coordinates and GPS accuracy.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-600 font-mono text-xs font-bold text-white">
                  3
                </span>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Accept &amp; Track Blinkit-Style Live Route
                  </div>
                  <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                    Press Accept to assign the nearest hospital &amp; ambulance. Watch the live ETA countdown and moving vehicle route update simultaneously on both screens.
                  </p>
                </div>
              </li>
            </ol>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between text-xs text-slate-600">
            <span>
              Active Network: <strong className="font-mono text-slate-900">{hospitalCount}</strong> Hospitals
            </span>
            <span>
              Logged Incidents: <strong className="font-mono text-slate-900">{incidentCount}</strong>
            </span>
          </div>
        </div>
      </section>

      {/* Architecture Summary Strip */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-display">
              Production Target Architecture
            </h2>
            <p className="text-xs text-slate-500">
              This interactive web demo simulates the Flutter mobile experience connected to the real-time dispatch backend.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <Terminal className="h-3.5 w-3.5" />
            <span>Flutter → FastAPI → MySQL 8 → WebSocket → React</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STACK_LAYERS.map((item) => (
            <div key={item.layer} className="space-y-1.5">
              <div className="text-sm font-bold text-slate-900 font-display">{item.layer}</div>
              <div className="font-mono text-xs text-red-700 font-medium">{item.tech}</div>
              <p className="text-xs text-slate-600 leading-relaxed">{item.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Judge Feedback & Suggestions Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSubmitSuggestion}
          className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 space-y-4"
        >
          <div className="flex items-center gap-2.5">
            <MessageSquarePlus className="h-5 w-5 text-slate-900" />
            <h2 className="text-base font-bold text-slate-900 font-display">
              Share Judge Feedback &amp; Suggestions
            </h2>
          </div>
          <p className="text-xs text-slate-600">
            Help our hackathon team refine Raksha AI before final deployment. Suggestions sync live across connected reviewers.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">Your Name</label>
              <input
                type="text"
                value={judgeName}
                onChange={(e) => setJudgeName(e.target.value)}
                placeholder="e.g., Mentor / Judge"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Focus Area</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
              >
                <option value="Dispatch & UX">Dispatch &amp; UX</option>
                <option value="Hospital Integration">Hospital Integration</option>
                <option value="Security & Privacy">Security &amp; Privacy</option>
                <option value="Scalability">Scalability</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Role / Organization</label>
            <input
              type="text"
              value={judgeRole}
              onChange={(e) => setJudgeRole(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Suggestion *</label>
            <textarea
              rows={3}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What would make this emergency dispatch workflow stronger?"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>

          {submittedNotice && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
              Suggestion recorded live. Thank you for helping shape Raksha AI.
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[42px] rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Submit Suggestion'}
          </button>
        </form>

        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 font-display">
              Reviewer Suggestions ({suggestions.length})
            </h3>
            <span className="text-xs text-slate-500">Live Feedback Feed</span>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {suggestions.map((s) => (
              <div key={s.id} className="py-3.5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="font-semibold text-slate-900">
                    {s.judgeName}{' '}
                    <span className="font-normal text-slate-500">· {s.role}</span>
                  </div>
                  <div className="text-slate-500">
                    {s.category} ·{' '}
                    <span className="font-mono">
                      {new Date(s.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
                <p className="mt-1.5 text-sm text-slate-700 leading-relaxed">{s.message}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
