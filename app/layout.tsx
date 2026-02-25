import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Hunter by Hireal — AI-Powered Due Diligence',
  description:
    'Autonomous AI agent that researches and verifies individuals and companies through comprehensive internet analysis and historical data verification.',
  icons: { icon: '/Hireal.png' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-body antialiased">
        {children}
      </body>
    </html>
  )
}
