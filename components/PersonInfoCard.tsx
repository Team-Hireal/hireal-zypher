'use client'

interface PersonInfo {
  name?: string
  age?: string
  gender?: string
  location?: string
  professionalHistory?: string
  educationalHistory?: string
  funFacts?: string
  verificationStatus?: Record<string, 'verified' | 'unverified' | 'not_found'>
  sources?: string[]
}

interface PersonInfoCardProps {
  info: PersonInfo
}

export default function PersonInfoCard({ info }: PersonInfoCardProps) {
  const sections = [
    { key: 'name', label: 'Name', value: info.name },
    { key: 'age', label: 'Age', value: info.age },
    { key: 'gender', label: 'Gender', value: info.gender },
    { key: 'location', label: 'Location', value: info.location },
    { key: 'professionalHistory', label: 'Professional History', value: info.professionalHistory },
    { key: 'educationalHistory', label: 'Educational History', value: info.educationalHistory },
    { key: 'funFacts', label: 'Fun Facts & Personality', value: info.funFacts },
  ]

  const getVerificationBadge = (key: string) => {
    const status = info.verificationStatus?.[key]
    if (!status) return null
    
    const colors = {
      verified: 'rgba(34, 197, 94, 0.2)',
      unverified: 'rgba(234, 179, 8, 0.2)',
      not_found: 'rgba(107, 114, 128, 0.2)',
    }
    
    const labels = {
      verified: 'Verified',
      unverified: 'Unverified',
      not_found: 'Not Found',
    }

    return (
      <span
        className="text-xs px-2 py-1 rounded-full"
        style={{
          background: colors[status],
          color: status === 'verified' ? '#22c55e' : status === 'unverified' ? '#eab308' : '#6b7280',
        }}
      >
        {labels[status]}
      </span>
    )
  }

  return (
    <div className="glass metallic rounded-2xl p-6 shadow-lg space-y-4">
      <h3 className="text-xl font-semibold gradient-text mb-4">Research Results</h3>
      
      {sections.map((section) => {
        if (!section.value) return null
        
        return (
          <div key={section.key} className="fade-in">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-secondary uppercase tracking-wide">
                {section.label}
              </h4>
              {getVerificationBadge(section.key)}
            </div>
            <div className="text-primary whitespace-pre-wrap pl-2 border-l-2" style={{ borderColor: 'var(--border-color)' }}>
              {section.value}
            </div>
          </div>
        )
      })}

      {info.sources && info.sources.length > 0 && (
        <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <h4 className="text-sm font-medium text-secondary uppercase tracking-wide mb-2">
            Sources
          </h4>
          <div className="flex flex-wrap gap-2">
            {info.sources.map((source, idx) => (
              <a
                key={idx}
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-3 py-1 rounded-lg glass-hover"
                style={{ color: 'var(--text-secondary)' }}
              >
                {new URL(source).hostname}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

