'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'

const ChatInterface = dynamic(() => import('@/components/ChatInterface'), { ssr: false })

interface Conversation {
  id: string;
  title: string;
  timestamp: Date;
  preview?: string;
}

type Theme = 'light' | 'dark';

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<Theme>('dark');
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  // Update theme
  const toggleTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleNewConversation = () => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: 'New conversation',
      timestamp: new Date(),
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
  };

  const handleConversationUpdate = (id: string, title: string) => {
    setConversations(prev => prev.map(conv => 
      conv.id === id ? { ...conv, title } : conv
    ));
  };

  const handleDeleteConversation = (id: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
  };

  const groupConversations = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const filtered = conversations.filter(conv => 
      conv.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return {
      today: filtered.filter(c => new Date(c.timestamp) >= today),
      previous30Days: filtered.filter(c => {
        const date = new Date(c.timestamp);
        return date < today && date >= thirtyDaysAgo;
      }),
      older: filtered.filter(c => new Date(c.timestamp) < thirtyDaysAgo),
    };
  };

  const grouped = groupConversations();

  return (
    <main className="app-container" data-theme={theme}>
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="sidebar-content">
          {/* Logo & Brand */}
          <div className="sidebar-header">
            <div className="sidebar-brand">
              <a href="https://hireal.info" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <div className="relative w-7 h-7">
                  <Image 
                    src="/Hireal.png" 
                    alt="Hireal Logo" 
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="brand-text">
                  <span className="brand-name">Hunter</span>
                  <span className="brand-subtitle">Research Agent</span>
                </div>
              </a>
            </div>
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="sidebar-toggle"
              aria-label="Toggle sidebar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          </div>

          {/* New Conversation Button */}
          <button onClick={handleNewConversation} className="new-conversation-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M12 8v8M8 12h8" />
            </svg>
            <span>New conversation</span>
          </button>

          {/* Search */}
          <div className="sidebar-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sidebar-search-input"
            />
          </div>

          {/* Conversations List */}
          <div className="conversations-list">
            {grouped.today.length > 0 && (
              <div className="conversation-group">
                <div className="conversation-group-title">TODAY</div>
                {grouped.today.map(conv => (
                  <ConversationItem 
                    key={conv.id}
                    conversation={conv}
                    isActive={activeConversationId === conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    onDelete={() => handleDeleteConversation(conv.id)}
                  />
                ))}
              </div>
            )}

            {grouped.previous30Days.length > 0 && (
              <div className="conversation-group">
                <div className="conversation-group-title">PREVIOUS 30 DAYS</div>
                {grouped.previous30Days.map(conv => (
                  <ConversationItem 
                    key={conv.id}
                    conversation={conv}
                    isActive={activeConversationId === conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    onDelete={() => handleDeleteConversation(conv.id)}
                  />
                ))}
              </div>
            )}

            {grouped.older.length > 0 && (
              <div className="conversation-group">
                <div className="conversation-group-title">OLDER</div>
                {grouped.older.map(conv => (
                  <ConversationItem 
                    key={conv.id}
                    conversation={conv}
                    isActive={activeConversationId === conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    onDelete={() => handleDeleteConversation(conv.id)}
                  />
                ))}
              </div>
            )}

            {conversations.length === 0 && (
              <div className="empty-conversations">
                <p className="text-muted text-sm">No conversations yet</p>
                <p className="text-muted text-xs mt-1">Start a new conversation to begin</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sidebar-bottom">
            <div className="sidebar-footer">
              <div className="footer-row-single">
                <a href="https://hireal.info" target="_blank" rel="noopener noreferrer" className="footer-brand">
                  <div className="relative w-5 h-5">
                    <Image 
                      src="/Hireal.png" 
                      alt="Hireal" 
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span className="footer-text">Hireal</span>
                </a>
                <span className="footer-separator">•</span>
                <span className="footer-label">Powered by Zypher Engine</span>
                <span className="footer-separator">•</span>
                <span className="footer-label">{conversations.length} chats</span>
                <button 
                  onClick={() => setSettingsOpen(true)} 
                  className="footer-settings-btn"
                  title="Settings"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Toggle */}
      {!sidebarOpen && (
        <button 
          onClick={() => setSidebarOpen(true)}
          className="mobile-sidebar-toggle"
          aria-label="Open sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}

      {/* Main Content */}
      <div className="main-content">
        <ChatInterface 
          conversationId={activeConversationId}
          onConversationUpdate={handleConversationUpdate}
          onNewConversation={handleNewConversation}
        />
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="modal-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Settings</h2>
              <button 
                onClick={() => setSettingsOpen(false)}
                className="modal-close"
                aria-label="Close settings"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="modal-content">
              {/* Theme Setting */}
              <div className="settings-section">
                <h3 className="settings-section-title">Appearance</h3>
                <div className="settings-option">
                  <div className="settings-option-info">
                    <span className="settings-option-label">Theme</span>
                    <span className="settings-option-description">Choose your preferred color scheme</span>
                  </div>
                  <div className="theme-toggle-group">
                    <button 
                      className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`}
                      onClick={() => toggleTheme('light')}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="5" />
                        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                      </svg>
                      Light
                    </button>
                    <button 
                      className={`theme-toggle-btn ${theme === 'dark' ? 'active' : ''}`}
                      onClick={() => toggleTheme('dark')}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                      </svg>
                      Dark
                    </button>
                  </div>
                </div>
              </div>

              {/* About Section */}
              <div className="settings-section">
                <h3 className="settings-section-title">About</h3>
                <div className="settings-about">
                  <div className="about-logo">
                    <Image 
                      src="/Hireal.png" 
                      alt="Hireal" 
                      width={48}
                      height={48}
                      className="object-contain"
                    />
                  </div>
                  <div className="about-info">
                    <h4 className="about-title">Hireal Hunter Agent</h4>
                    <p className="about-version">Version 1.0.0 • Powered by Zypher Engine</p>
                    <p className="about-description">
                      Autonomous AI agent for comprehensive person research
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function ConversationItem({ 
  conversation, 
  isActive, 
  onClick, 
  onDelete 
}: { 
  conversation: Conversation; 
  isActive: boolean; 
  onClick: () => void; 
  onDelete: () => void;
}) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div 
      className={`conversation-item ${isActive ? 'active' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <span className="conversation-title">{conversation.title}</span>
      {showDelete && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="conversation-delete"
          aria-label="Delete conversation"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      )}
    </div>
  );
}
