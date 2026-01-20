'use client'

import { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'

const ChatInterface = dynamic(() => import('@/components/ChatInterface'), { ssr: false })

export default function Home() {
  return (
    <main className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 text-center py-6 px-4 fade-in">
        <div className="flex items-center justify-center gap-4 mb-2">
          <div className="relative w-12 h-12">
            <Image 
              src="/Hireal.png" 
              alt="Hireal Logo" 
              fill
              className="object-contain"
            />
          </div>
          <h1 className="title-gradient text-4xl md:text-5xl font-bold tracking-tight">
            Hireal Research Agent
          </h1>
        </div>
        <p className="text-secondary text-lg font-light tracking-wide">
          Autonomous AI agent for comprehensive person research
        </p>
      </header>

      {/* Main Chat Area - fills remaining space */}
      <div className="flex-1 px-4 pb-4 min-h-0">
        <div className="w-full max-w-5xl mx-auto h-full">
          <ChatInterface />
        </div>
      </div>

      {/* Footer */}
      <footer className="flex-shrink-0 w-full border-t py-4 px-6" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-glass)' }}>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {/* Hireal Credit */}
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8">
              <Image 
                src="/Hireal.png" 
                alt="Hireal" 
                fill
                className="object-contain"
              />
            </div>
            <span className="text-secondary text-sm font-medium">Hireal</span>
          </div>

          {/* Center - Zypher Engine */}
          <div className="flex items-center gap-2">
            <span className="text-muted text-xs">Powered by</span>
            <span className="text-secondary text-sm font-semibold tracking-wide">Zypher Engine</span>
          </div>

          {/* Corespeed Credit */}
          <div className="flex items-center gap-2">
            <span className="text-secondary text-sm font-medium">Corespeed</span>
            <div className="relative w-8 h-8 bg-white rounded-sm p-1">
              <Image 
                src="/Corespeed.jpeg" 
                alt="Corespeed" 
                fill
                className="object-contain"
              />
            </div>
          </div>

          {/* Copyright */}
          <div className="flex items-center">
            <span className="text-muted text-xs whitespace-nowrap">
              © {new Date().getFullYear()} Hireal & Corespeed. All rights reserved.
            </span>
          </div>
        </div>
      </footer>
    </main>
  )
}
