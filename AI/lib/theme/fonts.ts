import {
  JetBrains_Mono,
  Open_Sans,
  Montserrat,
  Inter,
  Roboto,
  Work_Sans,
  Geist,
  Geist_Mono,
} from 'next/font/google';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});
const openSans = Open_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-open-sans',
});
const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
});
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});
const roboto = Roboto({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
});
const workSans = Work_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-work-sans',
});

const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-mono',
});

export const fontSelector: any = {
  Inter: inter,
  Roboto: roboto,
  'Open Sans': openSans,
  'Work Sans': workSans,
  Montserrat: montserrat,
  'JetBrains Mono': jetbrainsMono,
  Geist: geist,
  Geist_Mono: geistMono,
};

export function getFontClassName(fontName: string | null) {
  let fontClassName = inter.className;

  if (fontName && Object.keys(fontSelector).includes(fontName)) {
    fontClassName = fontSelector[fontName].className;
  }

  return fontClassName;
}
