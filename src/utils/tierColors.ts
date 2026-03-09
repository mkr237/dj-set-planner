export const TIER_COLORS = {
  1: {
    border: 'border-l-green-500',
    badge: 'bg-green-900/60 text-green-300',
    label: 'T1',
  },
  2: {
    border: 'border-l-teal-500',
    badge: 'bg-teal-900/60 text-teal-300',
    label: 'T2',
  },
  3: {
    border: 'border-l-amber-500',
    badge: 'bg-amber-900/60 text-amber-300',
    label: 'T3',
  },
  4: {
    border: 'border-l-red-500',
    badge: 'bg-red-900/60 text-red-300',
    label: 'T4',
  },
} as const satisfies Record<1 | 2 | 3 | 4, { border: string; badge: string; label: string }>
