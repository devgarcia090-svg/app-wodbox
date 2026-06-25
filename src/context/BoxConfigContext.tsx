import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface BoxConfig {
  name: string;
  tagline: string | null;
  primary_color: string;
  logo_url: string | null;
  logo_prefix: string | null;
  logo_highlight: string | null;
  logo_subtitle: string | null;
  fiscal_name: string | null;
  fiscal_nif: string | null;
  fiscal_address: string | null;
  fiscal_city: string | null;
}

interface BoxConfigContextValue extends BoxConfig {
  configLoaded: boolean;
}

const DEFAULT_CONFIG: BoxConfig = {
  name: 'WodBox',
  tagline: null,
  primary_color: '#F97316',
  logo_url: null,
  logo_prefix: null,
  logo_highlight: null,
  logo_subtitle: null,
  fiscal_name: null,
  fiscal_nif: null,
  fiscal_address: null,
  fiscal_city: null,
};

const BoxConfigContext = createContext<BoxConfigContextValue>({ ...DEFAULT_CONFIG, configLoaded: false });

export function BoxConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<BoxConfig>(DEFAULT_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    supabase.from('box_config').select('*').single().then(({ data }) => {
      if (data) setConfig(data as BoxConfig);
      setConfigLoaded(true);
    });
  }, []);

  return (
    <BoxConfigContext.Provider value={{ ...config, configLoaded }}>
      {children}
    </BoxConfigContext.Provider>
  );
}

export const useBoxConfig = () => useContext(BoxConfigContext);
