import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from './api';
import type { PublicSettings } from '@shared/types';

const FALLBACK: PublicSettings = {
  businessName: 'Silima Shop',
  logoUrl: null,
  whatsappNumber: '2250788880307',
  phone: '',
  email: '',
  location: '',
  serviceAreas: '',
  openingHours: '',
  social: { facebook: '', instagram: '', tiktok: '' },
  heroTitle: 'De beaux draps pour votre maison.',
  heroSubtitle:
    'Découvrez les parures Jimmy disponibles chez Silima Shop. Parcourez les modèles, puis écrivez-nous sur WhatsApp : nous vous confirmons le prix et la disponibilité.',
  currency: 'XOF',
  deliveryInfo: '',
  lowStockThreshold: 3,
  seoDefaultDescription: '',
  siteUrl: '',
  demoMode: false,
};

interface SettingsContextValue {
  settings: PublicSettings;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: FALLBACK,
  loading: true,
  error: null,
  refresh: async () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PublicSettings>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api<PublicSettings>('/api/public/settings');
      setSettings(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo(() => ({ settings, loading, error, refresh: load }), [settings, loading, error, load]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}
