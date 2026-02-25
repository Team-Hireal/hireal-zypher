'use client'

import { useEffect } from 'react'

export function useScrollReveal() {
  useEffect(() => {
    const elements = document.querySelectorAll('.reveal')

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              entry.target.classList.add('reveal--visible')
            }, i * 80)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}
