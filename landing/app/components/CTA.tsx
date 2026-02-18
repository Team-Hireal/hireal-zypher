'use client'

import { useScrollReveal } from '../hooks/useScrollReveal'

const PRODUCT_URL = process.env.NEXT_PUBLIC_PRODUCT_URL || '/'

export default function CTA() {
  useScrollReveal()

  return (
    <section className="cta-section" id="cta">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="cta-card reveal">
          <div className="cta-card__glow" />
          <span className="section-label">Get Started</span>
          <h2 className="cta-card__title">
            Ready to transform your<br />due diligence process?
          </h2>
          <p className="cta-card__desc">
            Join the teams already using Hunter to make faster, more confident hiring and investment decisions.
          </p>
          <div className="cta-card__actions">
            <a href={PRODUCT_URL} className="btn btn--primary btn--lg">
              Request Early Access
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10m0 0L9 4m4 4L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a href={PRODUCT_URL} className="btn btn--glass btn--lg">Talk to Us</a>
          </div>
        </div>
      </div>
    </section>
  )
}
