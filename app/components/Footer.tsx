import Image from 'next/image'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner" style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <a href="#" className="nav__logo">
          <Image src="/Hireal.png" alt="Hireal" width={24} height={24} />
          <span className="nav__logo-text" style={{ fontSize: '1rem' }}>Hunter</span>
        </a>
        <div className="footer__links">
          <a href="#features" className="footer__link">Features</a>
          <a href="#how-it-works" className="footer__link">How It Works</a>
          <a href="#" className="footer__link">Privacy</a>
          <a href="#" className="footer__link">Terms</a>
        </div>
        <span className="footer__copy">&copy; 2026 Hireal. All rights reserved.</span>
      </div>
    </footer>
  )
}
