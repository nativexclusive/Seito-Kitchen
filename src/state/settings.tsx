import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { fetchSettings } from '../api/public';
import { isSupabaseConfigured } from '../lib/supabase';
import type { BusinessSettings } from '../lib/types';

export const defaultSettings: BusinessSettings = {
  business_name: "Mama's Kitchen",
  tagline: 'Good Food Brings People Together',
  timezone: 'America/New_York',
  pickup_address: null,
  contact_phone: null,
  contact_email: null,
  zelle_contact: null,
  cashtag: null,
  payment_methods: ['cash', 'zelle', 'cashapp'],
  delivery_enabled: false,
  delivery_fee: 0,
  tax_rate: 0,
  pickup_slots: [],
  public_site_url: null,
};

const SettingsContext = createContext<{ settings: BusinessSettings; reload: () => void }>({ settings: defaultSettings, reload: () => {} });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<BusinessSettings>(defaultSettings);
  const reload = () => {
    if (isSupabaseConfigured) fetchSettings().then(setSettings).catch(() => {});
  };
  useEffect(reload, []);
  return <SettingsContext.Provider value={{ settings, reload }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}
