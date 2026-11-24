import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const SITE_URL = 'https://www.hiagent.pro'
const TITLE = 'Hunter by Hireal — AI-Powered Due Diligence'
const DESCRIPTION =
  'Autonomous AI agent that researches and verifies individuals and companies through comprehensive internet analysis and historical data verification.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: 'Hunter by Hireal',
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  icons: { icon: '/Hireal.png' },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'Hunter by Hireal',
    title: TITLE,
    description: DESCRIPTION,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'Hunter by Hireal',
      url: SITE_URL,
      description: DESCRIPTION,
      inLanguage: 'en',
      publisher: { '@id': `${SITE_URL}/#org` },
    },
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#org`,
      name: 'Hireal',
      url: SITE_URL,
      logo: `${SITE_URL}/Hireal.png`,
    },
    {
      '@type': 'WebApplication',
      name: 'Hunter',
      url: SITE_URL,
      description:
        'Hunter is an autonomous AI agent developed by Hireal that researches individuals and companies across the web and Wayback Machine to deliver verified insights and due diligence reports.',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      image: `${SITE_URL}/opengraph-image`,
      publisher: { '@id': `${SITE_URL}/#org` },
    },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-body antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  )
}
