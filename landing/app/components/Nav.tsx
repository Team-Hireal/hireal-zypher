'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

const PRODUCT_URL = process.env.NEXT_PUBLIC_PRODUCT_URL || '/'

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`nav${scrolled ? ' nav--scrolled' : ''}`} id="nav">
      <div className="nav__inner">
        <a href="#" className="nav__logo">
          <Image src="/Hireal.png" alt="Hireal" width={28} height={28} />
          <span className="nav__logo-text">Hunter</span>
          <span className="nav__logo-badge">by Hireal</span>
        </a>

        <div className={`nav__links${menuOpen ? ' nav__links--open' : ''}`}>
          <a href="#features" className="nav__link" onClick={() => setMenuOpen(false)}>Features</a>
          <a href="#how-it-works" className="nav__link" onClick={() => setMenuOpen(false)}>How It Works</a>
          <a href="#stats" className="nav__link" onClick={() => setMenuOpen(false)}>Results</a>
        </div>

        <div className="nav__actions">
          <a href={PRODUCT_URL} className="btn btn--primary btn--sm">Get Early Access</a>
          <button
            className="nav__hamburger"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>
    </nav>
  )
}
