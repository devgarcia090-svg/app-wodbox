import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface BoxConfig {
  name: string;
  tagline: string | null;
  primary_color: string;
  logo_url: string | null;
  fiscal_name: string | null;
  fiscal_nif: string | null;
  fiscal_address: string | null;
  fiscal_city: string | null;
}

const DEFAULT_CONFIG: BoxConfig = {
  name: 'WodBox',
  tagline: null,
  primary_color: '#F97316',
  logo_url: null,
  fiscal_name: null,
  fiscal_nif: null,
  fiscal_address: null,
  fiscal_city: null,
};

const BoxConfigContext = createContext<BoxConfig>(DEFAULT_CONFIG);

export function BoxConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<BoxConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    supabase.from('box_config').select('*').single().then(({ data }) => {
      if (data) setConfig(data as BoxConfig);
    });
  }, []);

  return (
    <BoxConfigContext.Provider value={config}>
      {children}
    </BoxConfigContext.Provider>
  );
}

export const useBoxConfig = () => useContext(BoxConfigContext);
