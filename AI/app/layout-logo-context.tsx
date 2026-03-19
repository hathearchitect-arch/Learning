'use client';

import { createContext, useContext, type ReactNode } from 'react';

type LayoutLogoData = {
  logoUrl: string | null;
  logoAlt: string;
};

const LayoutLogoUrlContext = createContext<LayoutLogoData | null>(null);

export function LayoutLogoUrlProvider({
  children,
  logoData,
}: { children: ReactNode; logoData: LayoutLogoData }) {
  return (
    <LayoutLogoUrlContext.Provider value={logoData}>
      {children}
    </LayoutLogoUrlContext.Provider>
  );
}

export function useLayoutLogoData() {
  const context = useContext(LayoutLogoUrlContext);
  if (context === null) {
    throw new Error(
      'useLayoutData must be used within a LayoutLogoUrlProvider',
    );
  }
  return context;
}
