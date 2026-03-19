'use client';

import CaddieLogoLightBackground from '@/public/logos/caddie-logo-light-background.svg';
import CaddieLogoDarkBackground from '@/public/logos/caddie-logo-dark-background.svg';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface AuthHeaderProps {
  showWelcomeMessage?: boolean;
  logoData?: {
    logoUrl: string | null;
    logoAlt: string;
  };
}

export function AuthHeader({
  showWelcomeMessage = false,
  logoData,
}: AuthHeaderProps) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }
  const DefaultCaddieLogo =
    resolvedTheme === 'dark'
      ? CaddieLogoDarkBackground
      : CaddieLogoLightBackground;
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex justify-center ">
        <Image
          src={logoData?.logoUrl || DefaultCaddieLogo}
          width={250}
          height={10}
          priority
          alt={logoData?.logoAlt || `CADDIE.AI Logo`}
          className="object-contain"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = DefaultCaddieLogo.src; // Fallback to default logo if error occurs
          }}
        />
      </div>
    </div>
  );
}
