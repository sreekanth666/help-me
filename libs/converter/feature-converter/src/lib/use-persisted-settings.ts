'use client';

import { defaultSettings, parseSettings, type Settings } from '@helpme/converter-domain';
import { useEffect, useState } from 'react';

const KEY = 'helpme:converter:settings';

/**
 * Settings kept in localStorage. They are read after mount (not during render) so the server and
 * first client render match, and storage that is blocked or full is simply ignored.
 */
export function usePersistedSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSettings(parseSettings(JSON.parse(raw)));
    } catch {
      // unreadable or blocked storage: keep the defaults
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      // storage unavailable: settings just won't persist
    }
  }, [settings, hydrated]);

  return [settings, setSettings] as const;
}
