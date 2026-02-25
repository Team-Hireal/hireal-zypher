'use client'

import { useScrollReveal } from '../hooks/useScrollReveal'

const companies = [
  {
    name: 'Meridian Capital',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    name: 'Apex Ventures',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 3l9 18H3l9-18z" strokeLinejoin="round" />
        <path d="M12 9v6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: 'Stratos HR',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 4-7 8-7s8 3 8 7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: 'Vanguard Search',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: 'Pinnacle Group',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 21h18" strokeLinecap="round" />
        <path d="M5 21V7l7-4 7 4v14" strokeLinejoin="round" />
        <path d="M9 21v-6h6v6" />
      </svg>
    ),
  },
]

export default function SocialProof() {
  useScrollReveal()

  return (
    <section className="social-proof">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <p className="social-proof__label reveal">Trusted by forward-thinking teams</p>
        <div className="social-proof__logos reveal">
          {companies.map((c) => (
            <div key={c.name} className="social-proof__logo">
              {c.icon}
              {c.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
