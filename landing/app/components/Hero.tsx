'use client'

import { useScrollReveal } from '../hooks/useScrollReveal'

const PRODUCT_URL = process.env.NEXT_PUBLIC_PRODUCT_URL || '/'

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="6" stroke="#3b82f6" strokeWidth="1.5" />
    <path d="M5 7l1.5 1.5L9 5.5" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const PendingIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="6" stroke="#a3a3a3" strokeWidth="1.5" />
    <path d="M7 5v4M7 10.5h.01" stroke="#a3a3a3" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

export default function Hero() {
  useScrollReveal()

  return (
    <section className="hero" id="hero">
      <div className="hero__content">
        <div className="hero__text">
          <div className="hero__badge reveal">
            <span className="hero__badge-dot" />
            Powered by Zypher AI Engine
          </div>
          <h1 className="hero__title reveal">
            Background verification,<br />
            <span className="hero__title-accent">reimagined.</span>
          </h1>
          <p className="hero__subtitle reveal">
            Hunter is an autonomous AI agent that researches and cross-references
            individuals and companies across the internet — including historical
            records — to deliver verified, comprehensive due diligence reports.
          </p>
          <div className="hero__cta reveal">
            <a href={PRODUCT_URL} className="btn btn--primary btn--lg">
              Start Researching
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10m0 0L9 4m4 4L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a href="#how-it-works" className="btn btn--glass btn--lg">
              See How It Works
            </a>
          </div>
        </div>

        <div className="hero__visual reveal">
          <div className="hero__card">
            <div className="hero__card-header">
              <div className="hero__card-dots">
                <span /><span /><span />
              </div>
              <span className="hero__card-title">Research Agent</span>
            </div>
            <div className="hero__card-body">
              <div className="hero__card-line">
                <span className="hero__card-label">Query</span>
                <span className="hero__card-value">
                  &quot;Verify credentials for Sarah Chen, CTO at NovaTech&quot;
                </span>
              </div>
              <div className="hero__card-line">
                <span className="hero__card-label">Status</span>
                <span className="hero__card-status">
                  <span className="hero__card-pulse" />
                  Researching...
                </span>
              </div>
              <div className="hero__card-sources">
                <div className="hero__card-source"><CheckIcon /> LinkedIn verified</div>
                <div className="hero__card-source"><CheckIcon /> Company records matched</div>
                <div className="hero__card-source"><PendingIcon /> Wayback analysis in progress</div>
                <div className="hero__card-source"><CheckIcon /> Education credentials confirmed</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
