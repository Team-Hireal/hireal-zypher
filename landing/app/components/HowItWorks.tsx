'use client'

import { useScrollReveal } from '../hooks/useScrollReveal'

export default function HowItWorks() {
  useScrollReveal()

  return (
    <section className="how-it-works" id="how-it-works">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="section-header reveal">
          <span className="section-label">Process</span>
          <h2 className="section-title">
            Three steps to<br />
            verified intelligence
          </h2>
        </div>
        <div className="steps">
          <div className="step reveal">
            <div className="step__number">01</div>
            <div className="step__content">
              <div className="step__icon">
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none" stroke="#000" strokeWidth="1.5">
                  <circle cx="16" cy="16" r="10" />
                  <path d="M16 12v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="step__title">Ask your question</h3>
              <p className="step__desc">
                Type a natural language query about any person or company. Hunter understands context and intent automatically.
              </p>
            </div>
          </div>

          <div className="step__connector reveal">
            <svg width="40" height="2" viewBox="0 0 40 2">
              <line x1="0" y1="1" x2="40" y2="1" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.3" />
            </svg>
          </div>

          <div className="step reveal">
            <div className="step__number">02</div>
            <div className="step__content">
              <div className="step__icon">
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M6 16h4m12 0h4M16 6v4m0 12v4" />
                  <circle cx="16" cy="16" r="6" />
                  <circle cx="16" cy="16" r="2" fill="#000" stroke="none" />
                </svg>
              </div>
              <h3 className="step__title">Hunter investigates</h3>
              <p className="step__desc">
                The AI agent autonomously crawls the web, checks historical records, and cross-references multiple data sources.
              </p>
            </div>
          </div>

          <div className="step__connector reveal">
            <svg width="40" height="2" viewBox="0 0 40 2">
              <line x1="0" y1="1" x2="40" y2="1" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.3" />
            </svg>
          </div>

          <div className="step reveal">
            <div className="step__number">03</div>
            <div className="step__content">
              <div className="step__icon">
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 16l4 4 8-8" strokeWidth="2" />
                  <rect x="6" y="6" width="20" height="20" rx="4" />
                </svg>
              </div>
              <h3 className="step__title">Get verified results</h3>
              <p className="step__desc">
                Receive a comprehensive, source-cited report with confidence scores and flagged inconsistencies — ready for decisions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}