export const TIER_COLORS = {
  1: {
    border:     'border-l-green-500',
    badge:      'bg-green-950 text-green-300 ring-1 ring-green-700/60',
    row:        'hover:bg-tier1-bg',
    rowActive:  'bg-tier1-bg',
    text:       'text-green-400',
    label:      'T1',
  },
  2: {
    border:     'border-l-teal-500',
    badge:      'bg-teal-950 text-teal-300 ring-1 ring-teal-700/60',
    row:        'hover:bg-tier2-bg',
    rowActive:  'bg-tier2-bg',
    text:       'text-teal-400',
    label:      'T2',
  },
  3: {
    border:     'border-l-amber-500',
    badge:      'bg-amber-950 text-amber-300 ring-1 ring-amber-700/60',
    row:        'hover:bg-tier3-bg',
    rowActive:  'bg-tier3-bg',
    text:       'text-amber-400',
    label:      'T3',
  },
  4: {
    border:     'border-l-red-500',
    badge:      'bg-red-950 text-red-300 ring-1 ring-red-700/60',
    row:        'hover:bg-tier4-bg',
    rowActive:  'bg-tier4-bg',
    text:       'text-red-400',
    label:      'T4',
  },
} as const satisfies Record<1 | 2 | 3 | 4, {
  border: string; badge: string; row: string; rowActive: string; text: string; label: string
}>
