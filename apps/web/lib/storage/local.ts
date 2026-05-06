'use client';

// Tiny localStorage helpers for prototype state (purchases, trips, bookmarks).
// All read/write code is guarded so it works under SSR.

const PURCHASES_KEY = 'locore.purchases.v1';
const BOOKMARKS_KEY = 'locore.bookmarks.v1';
const TRIP_ADDS_KEY = 'locore.tripadds.v1';

function safeRead(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWrite(key: string, value: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

export const Purchases = {
  list: () => safeRead(PURCHASES_KEY),
  has: (id: string) => safeRead(PURCHASES_KEY).includes(id),
  add: (id: string) => {
    const cur = safeRead(PURCHASES_KEY);
    if (!cur.includes(id)) safeWrite(PURCHASES_KEY, [...cur, id]);
  },
};

export const Bookmarks = {
  list: () => safeRead(BOOKMARKS_KEY),
  has: (id: string) => safeRead(BOOKMARKS_KEY).includes(id),
  toggle: (id: string) => {
    const cur = safeRead(BOOKMARKS_KEY);
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    safeWrite(BOOKMARKS_KEY, next);
    return next.includes(id);
  },
};

export const TripAdds = {
  list: () => safeRead(TRIP_ADDS_KEY),
  add: (articleId: string) => {
    const cur = safeRead(TRIP_ADDS_KEY);
    if (!cur.includes(articleId)) safeWrite(TRIP_ADDS_KEY, [...cur, articleId]);
  },
};
