import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hireal - Hunter Research Agent',
  description: 'Autonomous AI agent powered by Zephyr Engine for comprehensive person research',
  icons: {
    icon: '/Hireal.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

