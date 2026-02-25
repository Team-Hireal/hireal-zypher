'use client'

import { useState, useEffect } from 'react'

export interface ToolStatus {
  id: string;
  name: string;
  displayName: string;
  status: 'running' | 'complete' | 'error';
  message?: string;
  startTime: number;
  endTime?: number;
}

interface SearchStatusProps {
  tools: ToolStatus[];
  isComplete: boolean;
  className?: string;
}

export default function SearchStatus({ tools, isComplete, className = '' }: SearchStatusProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto-collapse shortly after completion
  useEffect(() => {
    if (isComplete && tools.length > 0) {
      const timer = setTimeout(() => setIsCollapsed(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, tools.length]);

  if (tools.length === 0) return null;

  const completeCount = tools.filter(t => t.status === 'complete').length;
  const errorCount = tools.filter(t => t.status === 'error').length;

  return (
    <div className={`search-status ${className}`}>
      {isCollapsed ? (
        <button
          onClick={() => setIsCollapsed(false)}
          className="search-status-collapsed"
        >
          <span>✅</span>
          <span className="flex-1">
            Completed {completeCount} search{completeCount === 1 ? '' : 'es'}
            {errorCount > 0 && (
              <span className="text-warning"> · {errorCount} failed</span>
            )}
          </span>
          <span className="text-xs opacity-60">Expand</span>
        </button>
      ) : (
        <div className="search-status-expanded">
          <div className="search-status-header">
            <span className="search-status-title">
              {isComplete ? '🔍 Search complete' : '🔍 Searching...'}
            </span>
            {isComplete && (
              <button
                onClick={() => setIsCollapsed(true)}
                className="search-status-collapse-btn"
              >
                Collapse
              </button>
            )}
          </div>

          <div className="search-status-list">
            {tools.map((tool) => (
              <div key={tool.id} className={`search-status-item status-${tool.status}`}>
                <span className="status-icon">
                  {tool.status === 'running' && '⏳'}
                  {tool.status === 'complete' && '✅'}
                  {tool.status === 'error' && '⚠️'}
                </span>
                <span className="status-name">{tool.displayName}</span>
                {tool.message && <span className="status-message">{tool.message}</span>}
                {tool.endTime && (
                  <span className="status-duration">
                    {Math.round((tool.endTime - tool.startTime) / 1000)}s
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Hook: tool status state management
export function useToolStatus() {
  const [tools, setTools] = useState<ToolStatus[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const addTool = (id: string, name: string, displayName: string) => {
    setTools(prev => {
      if (prev.some(t => t.id === id)) return prev;
      return [
        ...prev,
        {
          id,
          name,
          displayName,
          status: 'running',
          startTime: Date.now(),
        },
      ];
    });
  };

  const completeTool = (id: string, message?: string) => {
    setTools(prev =>
      prev.map(t =>
        t.id === id
          ? { ...t, status: 'complete', message, endTime: Date.now() }
          : t
      )
    );
  };

  const errorTool = (id: string, message: string) => {
    setTools(prev =>
      prev.map(t =>
        t.id === id
          ? { ...t, status: 'error', message, endTime: Date.now() }
          : t
      )
    );
  };

  const reset = () => {
    setTools([]);
    setIsComplete(false);
  };

  const markComplete = () => {
    setIsComplete(true);
  };

  return {
    tools,
    isComplete,
    addTool,
    completeTool,
    errorTool,
    reset,
    markComplete,
  };
}
