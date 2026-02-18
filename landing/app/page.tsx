import Nav from './components/Nav'
import Hero from './components/Hero'
import SocialProof from './components/SocialProof'
import Features from './components/Features'
import HowItWorks from './components/HowItWorks'
import Stats from './components/Stats'
import CTA from './components/CTA'
import Footer from './components/Footer'
import AmbientBackground from './components/AmbientBackground'
import DotGrid from './components/DotGrid'

export default function Home() {
  return (
    <>
      <AmbientBackground />
      <DotGrid />
      <Nav />
      <main>
        <Hero />
        <SocialProof />
        <Features />
        <HowItWorks />
        <Stats />
        <CTA />
      </main>
      <Footer />
    </>
  )
}
