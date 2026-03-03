import { Metadata } from 'next';
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {routing} from '@/i18n/routing';
import '../globals.css';

import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: {
    default: 'SabiMarket — Africa\'s Native Prediction Market',
    template: '%s | SabiMarket',
  },
  description: 'SabiMarket is Africa\'s first decentralised prediction market. Bet on real-world events across politics, sports, economy, and more — powered by Polymarket and built for Africa.',
  keywords: ['prediction market', 'africa', 'polymarket', 'crypto', 'betting', 'nigeria', 'kenya', 'ghana', 'defi', 'web3', 'sabimarket'],
  authors: [{ name: 'SabiMarket', url: 'https://sabimarket.xyz' }],
  creator: 'SabiMarket',
  metadataBase: new URL('https://sabimarket.xyz'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://sabimarket.xyz',
    siteName: 'SabiMarket',
    title: 'SabiMarket — Africa\'s Native Prediction Market',
    description: 'Africa\'s first decentralised prediction market. Bet on real-world events — powered by Polymarket.',
    images: [
      {
        url: '/sabimarket-logo.png',
        width: 500,
        height: 500,
        alt: 'SabiMarket Logo',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SabiMarket — Africa\'s Native Prediction Market',
    description: 'Africa\'s first decentralised prediction market. Bet on real-world events.',
    images: ['/sabimarket-logo.png'],
    creator: '@sabimarket',
  },
  manifest: '/site.webmanifest',
};

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();
  return (
    <html lang={locale}>
      <body className="bg-[#080706] text-[#F0EBE1] min-h-screen antialiased">
        <NextIntlClientProvider messages={messages}>
          <Providers>
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
