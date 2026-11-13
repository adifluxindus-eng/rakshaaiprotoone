import { useState } from 'react';
import { AdminDashboardView } from './components/AdminDashboardView';
import { CitizenMobileView } from './components/CitizenMobileView';
import { WelcomeView, type AppWorkspaceMode } from './components/WelcomeAndArchitecture';
import { useRakshaRealtime } from './hooks/useRakshaRealtime';

export default function App() {
  const [workspace, setWorkspace] = useState<AppWorkspaceMode>('welcome');
  const {
    hospitals,
    incidents,
    suggestions,
    wsConnected,
    latestIncomingAlert,
    clearIncomingAlert,
  } = useRakshaRealtime();

  const navItems: { id: AppWorkspaceMode; label: string }[] = [
    { id: 'welcome', label: 'Welcome' },
    { id: 'split', label: 'Split Demo' },
    { id: 'citizen', label: 'Citizen App' },
    { id: 'admin', label: 'Admin Portal' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 py-3.5">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => setWorkspace('welcome')}
            className="text-lg font-extrabold tracking-tight text-slate-900 font-display whitespace-nowrap shrink-0 text-left"
          >
            Raksha AI
          </button>

          {/* Zone 2: Clean single-line text navigation links */}
          <nav className="flex items-center gap-4 sm:gap-7 overflow-x-auto">
            {navItems.map((item) => {
              const active = workspace === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setWorkspace(item.id)}
                  className={`py-1 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                    active
                      ? 'border-red-600 text-slate-900 font-semibold'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="hidden sm:flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setWorkspace(workspace === 'split' ? 'welcome' : 'split')}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              {workspace === 'split' ? 'Back to Overview' : 'Live Split Demo'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 py-6 sm:py-8">
        {workspace === 'welcome' && (
          <WelcomeView
            onNavigate={setWorkspace}
            hospitalCount={hospitals.length}
            incidentCount={incidents.length}
            suggestions={suggestions}
          />
        )}

        {workspace === 'split' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h1 className="text-lg font-bold text-slate-900 font-display">
                  Live End-to-End Judge Simulator
                </h1>
                <p className="text-xs text-slate-600">
                  Left: Citizen Flutter-style Mobile App (No ID/Password) · Right: Admin PC Command Center (WebSocket + Siren + Blinkit Route)
                </p>
              </div>
              <div className="text-xs font-mono text-slate-500">
                {wsConnected ? 'Real-Time WebSocket Sync Active' : 'Connecting WebSocket...'}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              <div className="xl:col-span-4">
                <CitizenMobileView
                  hospitals={hospitals}
                  incidents={incidents}
                  isEmbeddedSplit
                />
              </div>
              <div className="xl:col-span-8">
                <AdminDashboardView
                  hospitals={hospitals}
                  incidents={incidents}
                  wsConnected={wsConnected}
                  latestIncomingAlert={latestIncomingAlert}
                  clearIncomingAlert={clearIncomingAlert}
                  isEmbeddedSplit
                />
              </div>
            </div>
          </div>
        )}

        {workspace === 'citizen' && (
          <div className="py-2">
            <CitizenMobileView hospitals={hospitals} incidents={incidents} />
          </div>
        )}

        {workspace === 'admin' && (
          <AdminDashboardView
            hospitals={hospitals}
            incidents={incidents}
            wsConnected={wsConnected}
            latestIncomingAlert={latestIncomingAlert}
            clearIncomingAlert={clearIncomingAlert}
          />
        )}
      </main>

      {/* Clean Minimal Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6 py-4 text-xs text-slate-500">
          <span>Raksha AI · Emergency Response &amp; Healthcare Coordination Platform Demo</span>
          <span>Demo mode uses simulated Indian city coordinates alongside optional device GPS.</span>
        </div>
      </footer>
    </div>
  );
}
