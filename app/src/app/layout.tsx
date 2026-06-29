import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'PunchIn — Smart Attendance Tracking',
  description: 'Real-time employee attendance tracking with hardware terminal integration. Clock in/out via web or RFID card.',
  keywords: ['attendance', 'time tracking', 'RFID', 'HR', 'workforce management'],
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8F5F1' },
    { media: '(prefers-color-scheme: dark)',  color: '#0F1923' },
  ],
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${plusJakarta.variable} page-root`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
