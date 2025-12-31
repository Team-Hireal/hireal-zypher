'use client'

import { useState, useRef, useEffect } from 'react'
import ChatInterface from '@/components/ChatInterface'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8 fade-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-2 gradient-text">
            Hireal Research Agent
          </h1>
          <p className="text-secondary text-lg">
            Autonomous AI agent for comprehensive person research
          </p>
        </div>
        <ChatInterface />
      </div>
    </main>
  )
}

