import './globals.css';
import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import { Providers } from './providers';

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  preload: false,
  adjustFontFallback: true,
  fallback: [
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif'
  ],
});

export const metadata: Metadata = {
  title: 'CRUD App - Next.js',
  description: 'A CRUD application built with Next.js and shadcn/ui',
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={outfit.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}