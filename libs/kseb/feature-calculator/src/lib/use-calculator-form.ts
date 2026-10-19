'use client';

import { useCallback, useEffect, useState } from 'react';

import { defaultForm, type CalculatorForm } from './calculator-form';

const STORAGE_KEY = 'helpme.kseb.calculator.v1';

function load(): CalculatorForm | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultForm(), ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}

function save(form: CalculatorForm) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  } catch {
    // Storage can be unavailable (private mode, blocked site data); the
    // calculator still works, it just won't remember.
  }
}

/**
 * Form state remembered between visits. Saved values are restored after
 * mount, not during render, so server and client markup match.
 */
export function useCalculatorForm() {
  const [form, setForm] = useState<CalculatorForm>(defaultForm);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const saved = load();
    if (saved) setForm(saved);
    setRestored(true);
  }, []);

  useEffect(() => {
    if (restored) save(form);
  }, [form, restored]);

  const update = useCallback(
    <K extends keyof CalculatorForm>(key: K, value: CalculatorForm[K]) =>
      setForm((f) => ({ ...f, [key]: value })),
    [],
  );

  const reset = useCallback(() => setForm(defaultForm()), []);

  return { form, update, reset };
}
