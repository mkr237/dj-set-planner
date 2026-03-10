# DJ Set Planner — Build Plan & Technical Spec

## 1. Project Overview

A web-based tool for DJs to build coherent sets by selecting tracks from a personal library. The app filters and ranks candidate tracks based on harmonic compatibility (Camelot key), BPM proximity, and energy level — helping DJs plan transitions that work musically.

**Core workflow:** Connect Spotify → select playlists → set mixing constraints → select a starting track → see filtered & ranked candidates → pick the next track → repeat → save the set.

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | React 18+ | Widely used, strong ecosystem, good for learning |
| Language | TypeScript | Type safety, better tooling, industry standard |
| Build tool | Vite | Fast dev server, minimal config, great DX |
| Styling | Tailwind CSS | Utility-first, rapid prototyping, easy theming |
| State management | React Context + useReducer | Sufficient for this scale, no extra dependencies |
| Persistence (v1) | localStorage via abstracted storage service | Simple, no backend needed |
| Persistence (v2) | Swap storage service for REST API calls | Architecture supports this without app changes |
| Spotify API | Spotify Web API via OAuth 2.0 PKCE | Track metadata source, playlist access |
| Testing | Vitest | Native Vite integration, fast |

---

## 3. Data Model

### SpotifyTrack (from Spotify API)

```typescript
interface SpotifyTrack {
  spotifyId: string;          // Spotify track ID (unique identifier)
  title: string;              // Track name
  artist: string;             // Artist name(s)
  bpm: number | null;         // Always null — Spotify audio features API restricted for new apps (Nov 2024)
  key: CamelotKey | null;     // Always null — same reason; set manually via override editor
  energy: EnergyLevel;        // Always 'Unknown' — same reason; set manually via override editor
  albumArt?: string;          // URL to album artwork
  spotifyUri: string;         // For linking back to Spotify
  previewUrl?: string;        // 30s preview clip URL (if available)
}
```

> **Note:** Spotify deprecated the audio features endpoint (`GET /v1/audio-features`) for apps created after November 2024. BPM, key, and energy are not available from the API. Users enter these values manually using the track override editor.

### TrackOverrides (user-entered values, stored locally)

```typescript
interface TrackOverrides {
  spotifyId: string;          // References SpotifyTrack.spotifyId
  bpm?: number;               // User-entered BPM
  key?: CamelotKey;           // User-entered Camelot key
  energy?: EnergyLevel;       // User-entered energy level
  notes?: string;             // DJ notes
}
```

### ResolvedTrack (what the app works with — Spotify data + overrides merged)

```typescript
interface ResolvedTrack {
  spotifyId: string;          // Primary key
  title: string;              // From Spotify (not overridable)
  artist: string;             // From Spotify (not overridable)
  bpm: number | null;         // From override if set, otherwise null
  key: CamelotKey | null;     // From override if set, otherwise null
  energy: EnergyLevel;        // From override if set, otherwise 'Unknown'
  albumArt?: string;          // From Spotify
  spotifyUri: string;         // From Spotify
  previewUrl?: string;        // From Spotify
  notes?: string;             // From override
  hasOverrides: {             // Flags indicating which fields have been manually set
    bpm: boolean;
    key: boolean;
    energy: boolean;
  };
}
```

### ConnectedPlaylist

```typescript
interface ConnectedPlaylist {
  spotifyId: string;          // Spotify playlist ID
  name: string;               // Playlist name
  trackCount: number;         // Number of tracks
  enabled: boolean;           // Whether tracks from this playlist are included
  lastSynced: string;         // ISO timestamp of last fetch
}
```

type EnergyLevel = "Low" | "Mid" | "High";

// Camelot keys: 1A-12A and 1B-12B
type CamelotKey = `${1|2|3|4|5|6|7|8|9|10|11|12}${"A"|"B"}`;

### DJSet

```typescript
interface DJSet {
  id: string;                // Generated UUID
  name: string;              // e.g. "DnB tech roller set"
  tracks: SetTrack[];        // Ordered list of tracks in the set
  createdAt: string;         // ISO timestamp
  updatedAt: string;         // ISO timestamp
}

interface SetTrack {
  trackId: string;           // References SpotifyTrack.spotifyId
  position: number;          // Order in set (0-based)
  transitionNote?: string;   // Optional note about the transition
}
```

### MixConstraints (global defaults)

```typescript
interface MixConstraints {
  bpmRange: number;          // Max BPM deviation (e.g. 10 means ±10)
  maxCamelotTier: number;    // Show candidates up to this tier (1-4)
  energyFilter: EnergyLevel[] | "any"; // Which energy levels to include
}
```

---

## 4. Camelot Compatibility Tiers

From any given key (e.g. 4A), each possible target key is assigned a compatibility tier. Lower tier = stronger harmonic match.

### Tier Definitions

| Tier | Colour | Moves (from nA) | Moves (from nB) | Description |
|------|--------|------------------|------------------|-------------|
| 1 — Perfect | Green | Same key (nA) | Same key (nB) | Identical key, seamless blend |
| 2 — Strong | Teal | n±1 A, nB (parallel) | n±1 B, nA (parallel) | Standard harmonic mixing moves |
| 3 — Works | Amber | n±2 A, (n±1)B | n±2 B, (n±1)A | Noticeable shift but still musical |
| 4 — Clash | Red | Everything else | Everything else | Risky, requires skill to pull off |

**Note:** All Camelot number arithmetic wraps around the wheel (12 + 1 = 1, 1 - 1 = 12).

### How filtering + ranking works

1. **Filter:** Remove any candidate whose tier exceeds `maxCamelotTier` in the global constraints (e.g. if set to 3, tier 4 "Clash" tracks are hidden)
2. **Also filter** by BPM range and energy level constraints
3. **Rank:** Sort remaining candidates by tier (best first), then by BPM proximity as a tiebreaker
4. **Colour code:** Each candidate row is colour-coded by its tier

### Per-step overrides

When selecting the next track, the user can temporarily adjust:
- Energy direction: "maintain", "build" (show only higher), "drop" (show only lower)
- BPM range: tighter or looser than global default
- Camelot tier threshold: show more or fewer options

---

## 5. Application Architecture

### Component Tree

```
App
├── Header (app title, settings icon, mode toggle: Edit / Performance)
├── SpotifyConnectScreen (shown when not authenticated — full-screen Spotify login)
├── EditMode (three-panel layout, shown when authenticated)
│   ├── PlaylistPanel (left — narrow, ~250px)
│   │   ├── PlaylistHeader ("Your Library" + sync button)
│   │   └── PlaylistList (scrollable list of user's Spotify playlists)
│   │       └── PlaylistItem (name, track count, checkbox to enable/disable)
│   ├── CandidatePanel (centre — main area, flexible width)
│   │   ├── EmptyState (shown when no playlists enabled — "Enable a playlist to get started")
│   │   ├── FullLibraryView (shown when playlists enabled but set is empty — pick first track)
│   │   │   ├── SearchBar (text search + genre/energy/BPM filters)
│   │   │   └── TrackList (all tracks from enabled playlists, sortable)
│   │   └── CandidateView (shown when set has tracks — pick the next track)
│   │       ├── ConstraintOverrides (energy direction, BPM range, tier threshold)
│   │       └── RankedCandidateList (filtered + ranked, colour-coded by tier)
│   └── SetPanel (right — ~350px)
│       ├── SetHeader (set name, save/load controls)
│       └── SetTimeline (ordered list of tracks in current set)
├── ConstraintModal (global mixing constraints, opened via settings icon in header)
├── TrackOverrideEditor (inline edit BPM, key, energy — triggered from any track row)
├── PerformanceMode
│   ├── CurrentTrack (large display of now-playing)
│   ├── SetProgress (visual progress through the set)
│   └── NextTrack (large display of upcoming track)
└── SavedSetsDrawer (list of saved sets, load/delete/rename)
```

### Application states

The app has distinct states that determine what is shown:

1. **Not authenticated:** Full-screen Spotify connect prompt — branded login button, brief explanation of what the app does. No panels visible.
2. **Authenticated, no playlists enabled:** Three-panel layout is visible. Left panel shows all playlists with checkboxes (all unchecked). Centre panel shows an empty state: "Enable one or more playlists to start building." Right panel shows an empty set.
3. **Playlists enabled, set is empty:** Left panel shows playlists with some checked. Centre panel shows the full track library from all enabled playlists with search and filters — this is where you pick your first track. Right panel shows an empty set with a prompt.
4. **Set has one or more tracks:** Left panel unchanged. Centre panel shows ranked candidates based on the last track in the set. Right panel shows the set being built. Toggling playlists on/off in the left panel immediately updates the candidate list in the centre.

### Playlist panel behaviour

The left playlist panel acts as a live filter on the centre panel's track pool:
- Checking a playlist adds its tracks to the available pool
- Unchecking removes them (tracks already in the current set remain, but won't appear as candidates)
- This allows quick context switching — e.g. enable only your "minimal tech" playlist when building that section of a set
- A "select all" / "deselect all" option at the top for convenience

### Storage Service (abstraction layer)

```typescript
// storage/types.ts
interface StorageService {
  // Overrides (user corrections to Spotify data)
  getOverrides(): Promise<TrackOverrides[]>;
  getOverride(spotifyId: string): Promise<TrackOverrides | null>;
  saveOverride(override: TrackOverrides): Promise<void>;
  deleteOverride(spotifyId: string): Promise<void>;

  // Connected playlists
  getPlaylists(): Promise<ConnectedPlaylist[]>;
  savePlaylists(playlists: ConnectedPlaylist[]): Promise<void>;

  // Sets
  getSets(): Promise<DJSet[]>;
  getSet(id: string): Promise<DJSet | null>;
  saveSet(set: DJSet): Promise<void>;
  deleteSet(id: string): Promise<void>;

  // Constraints
  getConstraints(): Promise<MixConstraints>;
  saveConstraints(constraints: MixConstraints): Promise<void>;

  // Spotify auth tokens
  getSpotifyAuth(): Promise<SpotifyAuth | null>;
  saveSpotifyAuth(auth: SpotifyAuth): Promise<void>;
  clearSpotifyAuth(): Promise<void>;
}
```

### Spotify Service (API interaction layer)

```typescript
// spotify/types.ts
interface SpotifyService {
  authenticate(): Promise<void>;           // OAuth 2.0 PKCE flow
  isAuthenticated(): boolean;
  getUserPlaylists(): Promise<SpotifyPlaylist[]>;
  getPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]>;
  refreshToken(): Promise<void>;
}
```

### Track Resolution (merging Spotify data with overrides)

```typescript
// utils/trackResolver.ts
function resolveTrack(
  spotifyTrack: SpotifyTrack,
  override: TrackOverrides | null
): ResolvedTrack;

function resolveTracks(
  spotifyTracks: SpotifyTrack[],
  overrides: TrackOverrides[]
): ResolvedTrack[];
```

### Key Utility: Camelot Engine

```typescript
// utils/camelot.ts
function getCamelotTier(from: CamelotKey, to: CamelotKey): 1 | 2 | 3 | 4;
function getCompatibleKeys(key: CamelotKey, maxTier: number): CamelotKey[];
function camelotDistance(a: number, b: number): number; // wrapping 1-12
```

### Key Utility: Candidate Ranker

```typescript
// utils/ranker.ts
interface RankedCandidate {
  track: Track;
  camelotTier: 1 | 2 | 3 | 4;
  bpmDelta: number;
  overallScore: number; // composite for sorting
}

function rankCandidates(
  currentTrack: Track,
  library: Track[],
  constraints: MixConstraints,
  overrides?: Partial<MixConstraints>
): RankedCandidate[];
```

---

## 6. Build Phases

Each phase is a self-contained milestone. Complete one before starting the next. Each step within a phase is sized for a single Claude Code session.

### Phase 1: Project Setup & Data Layer
**Goal:** Scaffolded project with types and storage working.

| Step | What to build | Claude Code prompt summary |
|------|---------------|---------------------------|
| 1.1 | Vite + React + TS + Tailwind scaffold | "Scaffold a new Vite React TypeScript project with Tailwind CSS configured" |
| 1.2 | Type definitions | "Create TypeScript interfaces for SpotifyTrack, TrackOverrides, ResolvedTrack, DJSet, SetTrack, MixConstraints, ConnectedPlaylist, CamelotKey, EnergyLevel" |
| 1.3 | Storage service interface + localStorage implementation | "Create a StorageService interface and a localStorage implementation for overrides, playlists, sets, constraints, and Spotify auth" |
| 1.4 | Track resolution utility | "Create a resolveTrack utility that merges SpotifyTrack data with TrackOverrides, including the hasOverrides flags" |
| 1.5 | Unit tests for storage and track resolution | "Write Vitest tests for the storage service and track resolution logic" |

### Phase 2: Camelot Engine & Candidate Ranking
**Goal:** The core algorithm works and is tested.

| Step | What to build | Claude Code prompt summary |
|------|---------------|---------------------------|
| 2.1 | Camelot utility functions | "Implement getCamelotTier, getCompatibleKeys, and camelotDistance with wrapping arithmetic" |
| 2.2 | Candidate ranking function | "Implement rankCandidates that filters by constraints then sorts by tier and BPM delta" |
| 2.3 | Comprehensive tests for Camelot logic | "Write tests covering all tier transitions, edge cases at 12→1 wrap, and ranking order" |

### Phase 3: Core UI — Set Building (three-panel design)
**Goal:** Functional (unstyled) UI for importing tracks and building a set. The design uses three vertical panels: playlist source (left), candidate selection (centre), and set builder (right).

| Step | What to build | Claude Code prompt summary |
|------|---------------|---------------------------|
| 3.1 | App shell with React Context for state | "Create App component with context provider managing resolved tracks, current set, and constraints" |
| 3.2 | Three-panel layout shell | "Create the EditMode layout with three vertical panels: PlaylistPanel (~250px left), CandidatePanel (flexible centre), SetPanel (~350px right)" |
| 3.3 | CSV import empty state (temporary — replaced by Spotify in Phase 7) | "In the CandidatePanel, when no tracks are loaded, show a drag-and-drop zone with 'Drop a CSV to get started' prompt. The PlaylistPanel shows a placeholder 'Playlists (coming soon)' for now." |
| 3.4 | Full library view (first track selection) | "When tracks are loaded but the set is empty, show the full track library in the CandidatePanel with search and column sorting. Clicking a track adds it as the first track in the set." |
| 3.5 | Set timeline panel | "Build the SetPanel (right) showing the ordered list of tracks in the current set, with track metadata displayed for each entry" |
| 3.6 | Candidate view with filtering + colour coding | "When the set has tracks, show ranked candidates in the CandidatePanel based on the last track, filtered by global constraints, colour-coded by Camelot tier" |
| 3.7 | Per-step constraint overrides | "Add inline controls at the top of the candidate view to override energy direction, BPM range, and tier threshold" |
| 3.8 | Global constraints modal | "Add a settings icon in the header that opens a modal for editing global mixing constraints (BPM range, max Camelot tier, energy filter)" |

**Note:** The PlaylistPanel (left) will show a placeholder during Phases 3–6 since playlist functionality requires Spotify integration in Phase 7. For now, use a simple panel showing "Playlists (coming soon)" to hold the layout space.

### Phase 4: Set Management (Save/Load/Edit)
**Goal:** Full CRUD for sets, persisted to localStorage.

| Step | What to build | Claude Code prompt summary |
|------|---------------|---------------------------|
| 4.1 | Save set with name | "Add a save button that prompts for a set name and persists to localStorage" |
| 4.2 | Saved sets drawer | "Build a slide-out drawer listing all saved sets with load, rename, and delete" |
| 4.3 | Edit existing set (remove/reorder tracks) | "Allow drag-to-reorder and remove-track in the set timeline, with re-validation of transitions" |
| 4.4 | JSON export/import for sets | "Add export-to-JSON and import-from-JSON buttons for set portability" |

### Phase 5: Styling & Polish
**Goal:** Slick, modern, dark-themed UI appropriate for a DJ tool.

| Step | What to build | Claude Code prompt summary |
|------|---------------|---------------------------|
| 5.1 | Dark theme + colour system | "Apply a dark theme with tier colours (green/teal/amber/red) using Tailwind" |
| 5.2 | Layout polish (three-panel responsive) | "Refine the three-panel layout — playlists left (~250px), candidates centre (flexible), set right (~350px) — with proper spacing, proportions, and collapsible side panels" |
| 5.3 | Micro-interactions | "Add hover states, transitions on track selection, smooth scroll in the set timeline" |
| 5.4 | Empty state polish | "Style the Spotify connect screen with branding, clear messaging, and a polished playlist picker" |

### Phase 6: Performance Mode
**Goal:** A simplified, high-contrast view for use at a gig.

| Step | What to build | Claude Code prompt summary |
|------|---------------|---------------------------|
| 6.1 | Performance mode layout | "Create a full-screen performance view showing current track (large), next track, and set progress" |
| 6.2 | Navigation controls | "Add large previous/next buttons and keyboard shortcuts for advancing through the set" |
| 6.3 | High contrast styling | "Style performance mode with large text, high contrast, minimal chrome, dark background" |

### Phase 7: Spotify Integration (replaces CSV import)
**Goal:** Spotify becomes the track data source. CSV import is removed. User can override any field from Spotify.

| Step | What to build | Claude Code prompt summary |
|------|---------------|---------------------------|
| 7.1 | Spotify app registration + OAuth 2.0 PKCE flow | "Set up Spotify OAuth 2.0 with PKCE for a client-side app. Create a SpotifyService class that handles authentication, token storage, and token refresh. Use the Spotify Web API." |
| 7.2 | Spotify connect screen | "When the user is not authenticated, show a full-screen Spotify connect prompt (replacing the three-panel layout). After successful auth, transition to the three-panel layout." |
| 7.3 | Playlist panel (left) | "Replace the placeholder in the PlaylistPanel with the user's actual Spotify playlists. Each playlist shows its name, track count, and a checkbox to enable/disable. Include 'select all' / 'deselect all' at the top and a sync button in the header." |
| 7.4 | Track fetching | "For each enabled playlist, fetch all tracks from the Spotify API. BPM, key, and energy default to null/'Unknown' — the Spotify audio features endpoint is restricted for new apps (deprecated November 2024). Users enter these values manually via the track override editor. Toggling a playlist checkbox immediately updates the candidate pool in the centre panel." |
| 7.5 | Updated data model + type definitions | "Replace the Track interface with SpotifyTrack, TrackOverrides, and ResolvedTrack. Update all components to use ResolvedTrack. Create a resolveTrack utility that merges Spotify data with any stored overrides." |
| 7.6 | Track override editor | "Add the ability to click on any track's BPM, key, or energy value and edit it inline. Store the override in localStorage via the StorageService. Show a visual indicator on fields that have been overridden. Allow clearing overrides to revert to Spotify values." |
| 7.7 | Remove CSV import | "Remove the CSV import component, Papaparse dependency, and CSV parsing utility. The CandidatePanel empty state should now say 'Enable one or more playlists to start building' when no playlists are checked." |
| 7.8 | Update storage service | "Update the StorageService interface and localStorage implementation to handle overrides, connected playlists, and Spotify auth tokens instead of raw tracks." |

**Note on Spotify app setup:** Before starting Phase 7, you'll need to register an app on the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard). This gives you a Client ID needed for the OAuth flow. Set the redirect URI to your local dev URL (e.g. `http://localhost:5173/callback`). No client secret is needed since PKCE is a public client flow.

---

## 7. Testing During Development

**Spotify Developer Setup (required before Phase 7):**
1. Go to https://developer.spotify.com/dashboard
2. Create a new app — name it "DJ Set Planner (Dev)"
3. Set the redirect URI to `http://localhost:5173/callback`
4. Copy the Client ID into your app's config
5. No client secret needed (PKCE flow)

Create a small test playlist in Spotify with 10–15 tracks across different BPMs, keys, and energy levels for manual testing.

For automated testing, mock the Spotify API responses using Vitest mocks to avoid hitting rate limits.

**Testing the override system:**
Once tracks are loaded from Spotify, test the override flow by editing the BPM or key of a track. Verify that the override persists across page reloads, that the candidate ranking uses the overridden value, and that clearing the override reverts to the Spotify-sourced value.

**Note on Phases 1–6:** These phases were originally built with CSV import. Phase 7 replaces CSV with Spotify as the sole data source. During the refactor, ensure all existing functionality (set building, candidate ranking, performance mode) works identically with Spotify-sourced data.

---

## 8. How to Use This Plan with Claude Code

1. **Work through phases in order.** Each phase builds on the last.
2. **One step per Claude Code session.** Give it the step description as context plus any relevant type definitions.
3. **Test before moving on.** Run the app or tests after each step to catch issues early.
4. **Share this file as context.** You can paste relevant sections into Claude Code so it understands the bigger picture.
5. **Come back to Claude Desktop** whenever you need to discuss design decisions, debug tricky issues, or adjust the plan.

---

## 9. Future Enhancements

- **Auto-set generation:** Use the scoring system to find an optimal path through the track library (graph traversal / greedy algorithm)
- **Backend persistence:** Swap localStorage for a REST API (the storage service abstraction makes this straightforward)
- **Additional sources:** Add Rekordbox XML import, SoundCloud, or other platforms as additional data sources alongside Spotify, with source priority for conflict resolution
- **Transition notes:** Rich annotations on each transition (mix point, EQ notes, effects)
- **Collaborative sets:** Share sets with other DJs via link
- **Waveform preview:** Integrate with Spotify's preview URLs to show waveforms or play 30s clips
- **Half-time BPM detection:** Auto-detect tracks where Spotify reports half the actual BPM (common in DnB) and offer a "double BPM" correction
- **Deployment:** Host on Vercel/Netlify for access from any device
