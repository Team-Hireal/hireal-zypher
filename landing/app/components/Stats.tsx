'use client'

import { useEffect, useRef } from 'react'
import { useScrollReveal } from '../hooks/useScrollReveal'

const stats = [
  { target: 50, suffix: '+', label: 'Sources analyzed per query' },
  { target: 95, suffix: '%', label: 'Verification accuracy rate' },
  { target: 30, suffix: 's', label: 'Average time to first results' },
  { target: 20, suffix: 'yr', label: 'Historical data depth via Wayback' },
]

function CountUp({ target, suffix }: { target: number; suffix: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const counted = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted.current) {
          counted.current = true
          let current = 0
          const step = Math.ceil(target / 40)
          const interval = setInterval(() => {
            current += step
            if (current >= target) {
              current = target
              clearInterval(interval)
            }
            el.textContent = `${current}${suffix}`
          }, 30)
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, suffix])

  return <div ref={ref} className="stat__value">0{suffix}</div>
}

export default function Stats() {
  useScrollReveal()

  return (
    <section className="stats" id="stats">
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div className="stats__grid">
          {stats.map((s) => (
            <div key={s.label} className="stat reveal">
              <CountUp target={s.target} suffix={s.suffix} />
              <div className="stat__label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
