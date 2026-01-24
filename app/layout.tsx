import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hireal - Person Research Agent',
  description: 'Autonomous AI agent for comprehensive person research',
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

