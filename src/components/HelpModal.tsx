import { useEffect } from 'react'

// ---------------------------------------------------------------------------
// Small reusable layout pieces
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2.5">
        {title}
      </p>
      {children}
    </div>
  )
}

function Para({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-300 leading-relaxed mb-2 last:mb-0">{children}</p>
}

function TierBadge({ tier, label, description }: { tier: 1 | 2 | 3 | 4; label: string; description: string }) {
  const colours: Record<1 | 2 | 3 | 4, string> = {
    1: 'bg-green-950 text-green-300 ring-1 ring-green-700/60',
    2: 'bg-teal-950 text-teal-300 ring-1 ring-teal-700/60',
    3: 'bg-amber-950 text-amber-300 ring-1 ring-amber-700/60',
    4: 'bg-red-950 text-red-300 ring-1 ring-red-700/60',
  }
  return (
    <div className="flex items-start gap-3 mb-2 last:mb-0">
      <span className={`shrink-0 mt-0.5 text-xs font-mono px-1.5 py-0.5 rounded ${colours[tier]}`}>
        T{tier}
      </span>
      <div>
        <span className="text-sm text-slate-200 font-medium">{label}</span>
        <span className="text-sm text-slate-500"> — {description}</span>
      </div>
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 mb-2 last:mb-0">
      <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-surface-3 border border-border text-xs text-slate-400 flex items-center justify-center font-mono leading-none">
        {n}
      </span>
      <p className="text-sm text-slate-300 leading-relaxed">{children}</p>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded bg-surface-3 border border-border text-xs text-slate-300 font-mono">
      {children}
    </kbd>
  )
}

// ---------------------------------------------------------------------------
// HelpModal
// ---------------------------------------------------------------------------

export function HelpModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface-2 border border-border rounded-xl shadow-2xl flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header — fixed */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0 border-b border-border">
          <h2 className="text-base font-semibold text-white">How it works</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-6 py-5 flex-1">

          {/* Overview */}
          <Section title="Overview">
            <Para>
              DJ Set Planner helps you build harmonically coherent DJ sets from your Spotify
              library. Connect your playlists, set your mixing constraints, then build a set
              track by track — the app filters and ranks candidates based on key compatibility,
              BPM proximity, and energy level.
            </Para>
          </Section>

          {/* Workflow */}
          <Section title="Basic workflow">
            <Step n={1}>Enable one or more playlists in the left panel to populate your track pool.</Step>
            <Step n={2}>Click any track in the centre panel to add it as the first track in your set.</Step>
            <Step n={3}>The centre panel switches to showing ranked candidates — tracks that mix well with your last selection.</Step>
            <Step n={4}>Keep picking tracks to build up the set timeline on the right.</Step>
            <Step n={5}>Save your set using the set header, or export it as JSON for later use.</Step>
          </Section>

          {/* Camelot wheel */}
          <Section title="Camelot wheel &amp; compatibility tiers">
            <Para>
              The Camelot wheel is a shorthand for musical key compatibility. Each key is assigned
              a number (1–12) and a letter (A = minor, B = major). Keys that are close on the wheel
              blend smoothly; keys far apart can clash.
            </Para>
            <Para>Candidates are colour-coded by compatibility tier:</Para>
            <div className="mt-3 space-y-1">
              <TierBadge tier={1} label="Perfect" description="same key — seamless blend" />
              <TierBadge tier={2} label="Strong" description="adjacent key or parallel minor/major — standard harmonic move" />
              <TierBadge tier={3} label="Works" description="two steps away — noticeable shift, still musical" />
              <TierBadge tier={4} label="Clash" description="everything else — risky, requires skill" />
            </div>
          </Section>

          {/* Mix constraints */}
          <Section title="Mix constraints">
            <Para>
              Global constraints filter which candidates are shown. Open them via <Kbd>⚙</Kbd> in
              the top bar.
            </Para>
            <Para>
              <span className="text-slate-200 font-medium">BPM Range</span> — only show tracks
              within ±N BPM of the current track. Tighter values keep the energy level steady;
              wider values give more options.
            </Para>
            <Para>
              <span className="text-slate-200 font-medium">Max Camelot Tier</span> — hide candidates
              above this tier. Set to T2 for strict harmonic mixing, T4 to see everything.
            </Para>
            <Para>
              <span className="text-slate-200 font-medium">Energy Filter</span> — restrict candidates
              to specific energy levels (Low / Mid / High). You can also override this per-step
              directly in the candidate panel.
            </Para>
          </Section>

          {/* Track overrides */}
          <Section title="Track overrides">
            <Para>
              Spotify doesn't provide BPM, key, or energy data for tracks. You can enter these
              manually by clicking the edit icon on any track row. Overrides are saved locally
              and persist across sessions.
            </Para>
            <Para>
              Tracks with missing BPM or key are marked as incomplete and won't appear as
              ranked candidates — add overrides to include them in the mix.
            </Para>
            <Para>
              Back up your overrides regularly via <Kbd>⚙</Kbd> → Settings → Library Data →
              Export. Import restores from a previously exported file, merging with any existing
              overrides.
            </Para>
          </Section>

          {/* Performance mode */}
          <Section title="Performance mode">
            <Para>
              Press <Kbd>▶</Kbd> in the top bar (available once your set has tracks) to enter
              performance mode — a full-screen, high-contrast view showing the current and next
              track with large text, designed for use at a gig.
            </Para>
            <Para>
              Use <Kbd>←</Kbd> / <Kbd>→</Kbd> arrow keys or the on-screen buttons to step through
              the set. Press <Kbd>Esc</Kbd> to return to the editor.
            </Para>
          </Section>

          {/* Saved sets */}
          <Section title="Saved sets">
            <Para>
              Use the <Kbd>☰</Kbd> button in the top bar to open the saved sets drawer. From
              there you can load, rename, or delete sets. Sets can also be exported as JSON and
              imported on another device.
            </Para>
          </Section>

        </div>

        {/* Footer — fixed */}
        <div className="shrink-0 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="w-full py-2 bg-accent hover:bg-accent-hover rounded-lg text-sm font-medium transition-colors text-white"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
