'use client'

import { useScrollReveal } from '../hooks/useScrollReveal'

const features = [
  {
    title: 'Autonomous Research',
    desc: 'Hunter independently decides what to search, where to look, and how to verify — no manual prompting required.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.5">
        <path d="M12 2a7 7 0 017 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 017-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    ),
  },
  {
    title: 'Historical Verification',
    desc: 'Wayback Machine integration analyzes historical website changes to verify claims and detect inconsistencies.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.5">
        <path d="M12 8v4l3 3" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  {
    title: 'Multi-Source Analysis',
    desc: 'Cross-references data from dozens of sources simultaneously, flagging discrepancies and building confidence scores.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round">
        <path d="M4 6h16M4 12h16M4 18h10" />
        <circle cx="19" cy="18" r="3" />
      </svg>
    ),
  },
  {
    title: 'Real-Time Streaming',
    desc: 'Watch Hunter work in real time. See every source checked, every verification made, as results stream in live.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    title: 'Smart Classification',
    desc: 'Intelligently distinguishes research queries from casual conversation, optimizing resources and response quality.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round">
        <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0H5a2 2 0 01-2-2v-4m6 6h10a2 2 0 002-2v-4" />
      </svg>
    ),
  },
  {
    title: 'Extensible Architecture',
    desc: 'Built on the MCP protocol, easily add new data sources and verification tools as your needs evolve.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <path d="M17.5 14v7m-3.5-3.5h7" />
      </svg>
    ),
  },
]

export default function Features() {
  useScrollReveal()

  return (
    <section className="features" id="features">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="section-header reveal">
          <span className="section-label">Capabilities</span>
          <h2 className="section-title">
            Everything you need for<br />
            thorough due diligence
          </h2>
          <p className="section-subtitle">
            Hunter combines autonomous AI research with historical data analysis to deliver verification results you can trust.
          </p>
        </div>
        <div className="features__grid">
          {features.map((f) => (
            <div key={f.title} className="feature-card reveal">
              <div className="feature-card__icon">{f.icon}</div>
              <h3 className="feature-card__title">{f.title}</h3>
              <p className="feature-card__desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}