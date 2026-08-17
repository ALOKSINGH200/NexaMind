import React, { useState } from 'react';
import {
  LayoutDashboard, BookOpen, Upload, MessageSquare,
  FileText, Cpu, Trash2, ChevronRight, Sparkles, Activity
} from 'lucide-react';

const fileTypeConfig = {
  PDF:  { bg: 'rgba(239,68,68,0.12)',   color: '#f87171', border: 'rgba(239,68,68,0.25)',   label: 'PDF' },
  DOCX: { bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa', border: 'rgba(59,130,246,0.25)',  label: 'DOC' },
  TXT:  { bg: 'rgba(16,185,129,0.12)',  color: '#34d399', border: 'rgba(16,185,129,0.25)', label: 'TXT' },
};

function FileTypeBadge({ type }) {
  const cfg = fileTypeConfig[type?.toUpperCase()] || { bg: 'rgba(255,255,255,0.06)', color: 'var(--text3)', border: 'var(--border)', label: type || '?' };
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, letterSpacing: '0.05em',
      padding: '2px 6px', borderRadius: 4,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      flexShrink: 0,
    }}>
      {cfg.label}
    </span>
  );
}

const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'upload',    icon: Upload,          label: 'Upload Files' },
  { id: 'documents', icon: BookOpen,        label: 'Documents' },
  { id: 'chat',      icon: MessageSquare,   label: 'AI Chat' },
];

export default function Sidebar({ view, setView, documents, activeDoc, setActiveDoc, onDeleteDoc, health }) {
  const [hoveredNav, setHoveredNav] = useState(null);
  const [hoveredDoc, setHoveredDoc] = useState(null);

  return (
    <aside style={{
      width: 264,
      minWidth: 264,
      height: '100vh',
      background: 'linear-gradient(180deg, #0d0d14 0%, #0a0a10 100%)',
      borderRight: '1px solid rgba(255,255,255,0.055)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Ambient glow top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 200,
        background: 'radial-gradient(ellipse at 50% -20%, rgba(124,58,237,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* ── Logo ── */}
      <div style={{
        padding: '22px 18px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{
            width: 38, height: 38, flexShrink: 0,
            background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
            borderRadius: 11,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
            boxShadow: '0 0 20px rgba(124,58,237,0.45), 0 0 40px rgba(124,58,237,0.15)',
            animation: 'glow-pulse 3s ease-in-out infinite',
          }}>
            🧠
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800, fontSize: 15.5, lineHeight: 1.2,
              background: 'linear-gradient(135deg, #f1f0f5, #a78bfa)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              NexaMind
            </div>
            <div style={{
              fontSize: 9.5, letterSpacing: '0.12em', marginTop: 1,
              color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Sparkles size={8} color="var(--violet-l)" />
              AI Knowledge Assistant
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav style={{ padding: '12px 10px 4px', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 9.5, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, padding: '0 8px 8px' }}>
          Navigation
        </div>
        {NAV_ITEMS.map(item => {
          const active = view === item.id;
          const hovered = hoveredNav === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              onMouseEnter={() => setHoveredNav(item.id)}
              onMouseLeave={() => setHoveredNav(null)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                marginBottom: 3, fontSize: 13, fontFamily: 'var(--font-body)', fontWeight: active ? 600 : 400,
                transition: 'all var(--t)',
                background: active
                  ? 'linear-gradient(90deg, rgba(124,58,237,0.22), rgba(124,58,237,0.08))'
                  : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
                color: active ? 'var(--violet-l)' : hovered ? 'var(--text)' : 'var(--text2)',
                outline: active ? '1px solid rgba(124,58,237,0.28)' : '1px solid transparent',
                boxShadow: active ? 'inset 0 0 20px rgba(124,58,237,0.05)' : 'none',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active ? 'rgba(124,58,237,0.18)' : 'transparent',
                transition: 'all var(--t)',
              }}>
                <Icon size={14} />
              </div>
              <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
              {active && (
                <ChevronRight size={12} style={{ opacity: 0.6 }} />
              )}
              {item.id === 'chat' && documents.length > 0 && !active && (
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 10,
                  background: 'rgba(16,185,129,0.15)', color: 'var(--emerald)',
                  border: '1px solid rgba(16,185,129,0.25)',
                }}>
                  {documents.length}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Documents List ── */}
      <div style={{ padding: '16px 10px 4px 14px', position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize: 9.5, color: 'var(--text4)', textTransform: 'uppercase',
          letterSpacing: '0.1em', fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingRight: 4,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <FileText size={9} />
            Library
          </span>
          <span style={{
            fontSize: 9, padding: '1px 6px', borderRadius: 10,
            background: 'rgba(124,58,237,0.12)', color: 'var(--violet-l)',
            border: '1px solid rgba(124,58,237,0.2)',
          }}>
            {documents.length}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 10px', position: 'relative', zIndex: 1 }}>
        {documents.length === 0 ? (
          <div style={{
            padding: '20px 12px', color: 'var(--text4)', fontSize: 11.5,
            textAlign: 'center', lineHeight: 1.7,
          }}>
            <div style={{ fontSize: 22, marginBottom: 8, opacity: 0.4 }}>📂</div>
            No documents yet.<br />Upload files to get started.
          </div>
        ) : (
          documents.map(doc => {
            const isActive = activeDoc?.docId === doc.docId;
            const isHovered = hoveredDoc === doc.docId;
            return (
              <div
                key={doc.docId}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 9, marginBottom: 2,
                  cursor: 'pointer',
                  background: isActive
                    ? 'linear-gradient(90deg, rgba(124,58,237,0.18), rgba(124,58,237,0.06))'
                    : isHovered ? 'rgba(255,255,255,0.03)' : 'transparent',
                  border: isActive
                    ? '1px solid rgba(124,58,237,0.25)'
                    : isHovered ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
                  transition: 'all var(--t)',
                }}
                onMouseEnter={() => setHoveredDoc(doc.docId)}
                onMouseLeave={() => setHoveredDoc(null)}
                onClick={() => { setActiveDoc(doc); setView('chat'); }}
              >
                <FileTypeBadge type={doc.fileType} />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{
                    fontSize: 11.5, fontWeight: 500,
                    color: isActive ? 'var(--violet-l)' : 'var(--text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {doc.docName}
                  </div>
                  <div style={{ fontSize: 9.5, color: 'var(--text4)', marginTop: 1 }}>
                    {doc.totalChunks} chunks
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onDeleteDoc(doc.docId); }}
                  style={{
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer', color: 'rgba(239,68,68,0.7)',
                    padding: '4px', borderRadius: 6,
                    opacity: 0.8,
                    transition: 'all var(--t)',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = '#f87171';
                    e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = 'rgba(239,68,68,0.7)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* ── Status Footer ── */}
      <div style={{
        padding: '14px 16px 18px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        position: 'relative', zIndex: 1,
        background: 'linear-gradient(0deg, rgba(8,8,14,0.95) 0%, rgba(8,8,14,0.4) 100%)',
      }}>

        {/* Section label */}
        <div style={{
          fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase',
          letterSpacing: '0.12em', fontWeight: 700, marginBottom: 10,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <Activity size={10} color="var(--violet)" />
          System Status
        </div>

        {/* Active model — large & clear */}
        <div style={{
          background: 'rgba(124,58,237,0.08)',
          border: '1px solid rgba(124,58,237,0.22)',
          borderRadius: 10, padding: '9px 13px',
        }}>
          <div style={{
            fontSize: 9.5, color: 'var(--text3)', textTransform: 'uppercase',
            letterSpacing: '0.1em', fontWeight: 700, marginBottom: 5,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Cpu size={9} color="var(--violet-l)" />
            Active Model
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13.5,
            fontWeight: 600,
            color: 'var(--violet-l)',
            letterSpacing: '0.02em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textShadow: '0 0 16px rgba(167,139,250,0.4)',
          }}>
            {health?.ollama?.defaultModel || 'phi3:mini'}
          </div>
        </div>
      </div>
    </aside>
  );
}



