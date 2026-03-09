# DJ Set Planner — Build Plan & Technical Spec

## 1. Project Overview

A web-based tool for DJs to build coherent sets by selecting tracks from a personal library. The app filters and ranks candidate tracks based on harmonic compatibility (Camelot key), BPM proximity, and energy level — helping DJs plan transitions that work musically.

**Core workflow:** Import tracks → set mixing constraints → select a starting track → see filtered & ranked candidates → pick the next track → repeat → save the set.

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
| CSV parsing | Papaparse | Robust, handles edge cases, TypeScript support |
| Testing | Vitest | Native Vite integration, fast |

---

## 3. Data Model

### Track

```typescript
interface Track {
  id: string;                // Generated UUID on import
  title: string;             // Track name
  artist: string;            // Artist name
  bpm: number;               // Beats per minute (e.g. 174)
  key: CamelotKey;           // Camelot notation (e.g. "4A")
  energy: EnergyLevel;       // "Low" | "Mid" | "High"
  genre?: string;            // Optional genre tag
  label?: string;            // Optional record label
  notes?: string;            // Optional DJ notes
}

type EnergyLevel = "Low" | "Mid" | "High";

// Camelot keys: 1A-12A and 1B-12B
type CamelotKey = `${1|2|3|4|5|6|7|8|9|10|11|12}${"A"|"B"}`;
```

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
  trackId: string;           // References Track.id
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

### CSV Import Format

```
title,artist,bpm,key,energy,genre,label,notes
"Pharaoh","Calyx & TeeBee",174,"4A","High","DnB","RAM",""
"Titan","Mefjus",172,"5A","High","DnB","Vision",""
"Landlord","S.P.Y",174,"4B","Mid","DnB","Hospital","Liquid roller"
```

Required columns: `title`, `artist`, `bpm`, `key`, `energy`
Optional columns: `genre`, `label`, `notes`

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
├── Header (app title, mode toggle: Edit / Performance)
├── EditMode
│   ├── Sidebar (left)
│   │   ├── CSVImport (file upload + parse)
│   │   ├── ConstraintPanel (global mixing constraints)
│   │   └── TrackLibrary (searchable/filterable global track list)
│   └── MainPanel (right)
│       ├── SetHeader (set name, save/load controls)
│       ├── SetTimeline (ordered list of tracks in current set)
│       └── CandidatePanel (filtered + ranked next-track suggestions)
├── PerformanceMode
│   ├── CurrentTrack (large display of now-playing)
│   ├── SetProgress (visual progress through the set)
│   └── NextTrack (large display of upcoming track)
└── SavedSetsDrawer (list of saved sets, load/delete/rename)
```

### Storage Service (abstraction layer)

```typescript
// storage/types.ts
interface StorageService {
  // Tracks
  getTracks(): Promise<Track[]>;
  saveTracks(tracks: Track[]): Promise<void>;

  // Sets
  getSets(): Promise<DJSet[]>;
  getSet(id: string): Promise<DJSet | null>;
  saveSet(set: DJSet): Promise<void>;
  deleteSet(id: string): Promise<void>;

  // Constraints
  getConstraints(): Promise<MixConstraints>;
  saveConstraints(constraints: MixConstraints): Promise<void>;
}
```

```typescript
// storage/localStorage.ts — v1 implementation
class LocalStorageService implements StorageService {
  // All methods read/write JSON to localStorage keys
}
```

```typescript
// storage/api.ts — v2 swap-in (future)
class ApiStorageService implements StorageService {
  // All methods make HTTP calls to a backend
}
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
**Goal:** Scaffolded project with types, storage, and CSV import working.

| Step | What to build | Claude Code prompt summary |
|------|---------------|---------------------------|
| 1.1 | Vite + React + TS + Tailwind scaffold | "Scaffold a new Vite React TypeScript project with Tailwind CSS configured" |
| 1.2 | Type definitions | "Create TypeScript interfaces for Track, DJSet, SetTrack, MixConstraints, CamelotKey, EnergyLevel" |
| 1.3 | Storage service interface + localStorage implementation | "Create a StorageService interface and a localStorage implementation" |
| 1.4 | CSV import utility using Papaparse | "Create a CSV parser that validates and maps rows to Track objects with UUID generation" |
| 1.5 | Unit tests for storage and CSV parsing | "Write Vitest tests for the storage service and CSV import" |

### Phase 2: Camelot Engine & Candidate Ranking
**Goal:** The core algorithm works and is tested.

| Step | What to build | Claude Code prompt summary |
|------|---------------|---------------------------|
| 2.1 | Camelot utility functions | "Implement getCamelotTier, getCompatibleKeys, and camelotDistance with wrapping arithmetic" |
| 2.2 | Candidate ranking function | "Implement rankCandidates that filters by constraints then sorts by tier and BPM delta" |
| 2.3 | Comprehensive tests for Camelot logic | "Write tests covering all tier transitions, edge cases at 12→1 wrap, and ranking order" |

### Phase 3: Core UI — Track Library & Set Building
**Goal:** Functional (unstyled) UI for importing tracks and building a set.

| Step | What to build | Claude Code prompt summary |
|------|---------------|---------------------------|
| 3.1 | App shell with React Context for state | "Create App component with context provider managing tracks, current set, and constraints" |
| 3.2 | CSV upload component + track library list | "Build a file upload component and a scrollable track list showing all imported tracks" |
| 3.3 | Constraint panel | "Build a panel with inputs for BPM range, max Camelot tier, and energy filter" |
| 3.4 | Set builder panel | "Build the set timeline (right side) showing ordered tracks with an 'add first track' prompt" |
| 3.5 | Candidate panel with filtering + colour coding | "When a track is selected, show ranked candidates with tier-based colour coding" |
| 3.6 | Per-step constraint overrides | "Add inline controls on the candidate panel to override energy direction and BPM range" |

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
| 5.2 | Layout polish (two-panel responsive) | "Refine the two-panel layout — library left, set builder right — with proper spacing" |
| 5.3 | Micro-interactions | "Add hover states, transitions on track selection, smooth scroll in the set timeline" |
| 5.4 | Search and filter in track library | "Add a search bar and genre/energy/BPM filters to the track library" |

### Phase 6: Performance Mode
**Goal:** A simplified, high-contrast view for use at a gig.

| Step | What to build | Claude Code prompt summary |
|------|---------------|---------------------------|
| 6.1 | Performance mode layout | "Create a full-screen performance view showing current track (large), next track, and set progress" |
| 6.2 | Navigation controls | "Add large previous/next buttons and keyboard shortcuts for advancing through the set" |
| 6.3 | High contrast styling | "Style performance mode with large text, high contrast, minimal chrome, dark background" |

---

## 7. Sample Test Data

Use this CSV for development and testing:

```csv
title,artist,bpm,key,energy,genre,label,notes
"Pharaoh","Calyx & TeeBee",174,"4A","High","DnB","RAM","Tech roller"
"Titan","Mefjus",172,"5A","High","DnB","Vision","Heavy hitter"
"Landlord","S.P.Y",174,"4B","Mid","DnB","Hospital","Liquid roller"
"Sleepwalking","Alix Perez",172,"3A","Mid","DnB","1985","Deep and dark"
"Gully","Buunshin",175,"4A","High","DnB","Flexout","Peak time"
"Talisman","Workforce",170,"6A","Mid","DnB","Dispatch","Rolling"
"Crystal Clear","Camo & Krooked",174,"9A","High","DnB","Hospital","Melodic banger"
"Sinkhole","Imanu",168,"2B","Low","DnB","Vision","Halftime vibes"
"Saturate","Halogenix",173,"5B","Mid","DnB","Critical","Deep tech"
"Red Mist","Break",176,"4A","High","DnB","Symmetry","Classic"
"Archangel","Enei",174,"3B","Mid","DnB","Critical","Dark roller"
"Knotweed","Skeptical",172,"4A","High","DnB","Exit","Minimal tech"
```

---

## 8. How to Use This Plan with Claude Code

1. **Work through phases in order.** Each phase builds on the last.
2. **One step per Claude Code session.** Give it the step description as context plus any relevant type definitions.
3. **Test before moving on.** Run the app or tests after each step to catch issues early.
4. **Share this file as context.** You can paste relevant sections into Claude Code so it understands the bigger picture.
5. **Come back to Claude Desktop** whenever you need to discuss design decisions, debug tricky issues, or adjust the plan.

---

## 9. Future Enhancements (Not in v1)

- **Auto-set generation:** Use the scoring system to find an optimal path through the track library (graph traversal / greedy algorithm)
- **Backend persistence:** Swap localStorage for a REST API (the storage service abstraction makes this straightforward)
- **Rekordbox/Traktor import:** Parse XML exports from popular DJ software instead of CSV
- **Transition notes:** Rich annotations on each transition (mix point, EQ notes, effects)
- **Collaborative sets:** Share sets with other DJs via link
- **Waveform preview:** Integrate with an audio API to show track waveforms
