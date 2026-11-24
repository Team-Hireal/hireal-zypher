import { ImageResponse } from 'next/og'

export const alt = 'Hunter by Hireal — AI-Powered Due Diligence'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px 96px',
          background: '#ffffff',
          color: '#171717',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 28,
            color: '#3b82f6',
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              background: '#3b82f6',
              marginRight: 16,
            }}
          />
          Autonomous AI Research Agent
        </div>
        <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>
          Hunter by Hireal
        </div>
        <div style={{ fontSize: 52, fontWeight: 600, color: '#3b82f6', marginTop: 12 }}>
          Background Verification with Confidence
        </div>
        <div style={{ fontSize: 30, color: '#525252', marginTop: 36, maxWidth: 980, lineHeight: 1.35 }}>
          Researches individuals and companies across the web and Wayback Machine to deliver verified due diligence reports.
        </div>
        <div style={{ fontSize: 26, color: '#a3a3a3', marginTop: 'auto' }}>www.hiagent.pro</div>
      </div>
    ),
    { ...size }
  )
}
