import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

export type FontScaleKey = 'normal' | 'large' | 'xl';

export const FONT_SCALE_LABELS: Record<FontScaleKey, string> = {
  normal: 'Normal',
  large:  'Large',
  xl:     'Extra Large',
};

export const FONT_MULTIPLIERS: Record<FontScaleKey, number> = {
  normal: 1.0,
  large:  1.2,
  xl:     1.4,
};

const STORE_KEY = 'font_scale_v1';

interface FontScaleContextValue {
  scaleKey:   FontScaleKey;
  multiplier: number;
  setScale:   (key: FontScaleKey) => void;
}

const FontScaleContext = createContext<FontScaleContextValue>({
  scaleKey:   'normal',
  multiplier: 1.0,
  setScale:   () => {},
});

export function FontScaleProvider({ children }: { children: React.ReactNode }) {
  const [scaleKey, setScaleKey] = useState<FontScaleKey>('normal');

  useEffect(() => {
    SecureStore.getItemAsync(STORE_KEY).then((stored) => {
      if (stored && stored in FONT_MULTIPLIERS) {
        setScaleKey(stored as FontScaleKey);
      }
    });
  }, []);

  const setScale = useCallback((key: FontScaleKey) => {
    setScaleKey(key);
    SecureStore.setItemAsync(STORE_KEY, key);
  }, []);

  return (
    <FontScaleContext.Provider value={{ scaleKey, multiplier: FONT_MULTIPLIERS[scaleKey], setScale }}>
      {children}
    </FontScaleContext.Provider>
  );
}

export function useFontScale() {
  return useContext(FontScaleContext);
}
