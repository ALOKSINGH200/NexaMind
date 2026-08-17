import React, { useState } from 'react';
import { Search, Trash2, MessageSquare, FileText, Hash, Filter, Grid, List, Calendar } from 'lucide-react';

function TypeBadge({ type }) {
  const map = {
    PDF:  { bg: 'rgba(239,68,68,0.1)',  color: '#f87171', border: 'rgba(239,68,68,0.25)' },
    DOCX: { bg: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
    TXT:  { bg: 'rgba(16,185,129,0.1)', color: '#34d399', border: 'rgba(16,185,129,0.25)' },
  };
  const s = map[type?.toUpperCase()] || { bg: 'rgba(255,255,255,0.05)', color: 'var(--text3)', border: 'var(--border)' };
  return (
    <span style={{
      padding: '3px 9px', borderRadius: 6, fontSize: 9.5, fontWeight: 800,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      letterSpacing: '0.05em',
    }}>
      {type}
    </span>
  );
}

function DocCard({ doc, onDelete, onChat, delay }) {
  const [hovered, setHovered] = useState(false);

  const ext = doc.fileType?.toUpperCase();
  const accentMap = {
    PDF:  '#f87171',
    DOCX: '#60a5fa',
    TXT:  '#34d399',
  };
  const accent = accentMap[ext] || 'var(--violet-l)';

  return (
    <div
      style={{
        background: hovered
          ? 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(124,58,237,0.02))'
          : 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
        border: hovered ? '1px solid rgba(124,58,237,0.3)' : '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16, padding: '20px 22px',
        cursor: 'pointer', transition: 'all 0.25s ease',
        animation: `fadeUp 0.35s ease ${delay}s both`,
        position: 'relative', overflow: 'hidden',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? '0 16px 48px rgba(124,58,237,0.12), 0 0 0 1px rgba(124,58,237,0.08)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${accent}80, transparent)`,
        opacity: hovered ? 1 : 0,
        transition: 'opacity 0.25s',
      }} />

      {/* Background glow */}
      {hovered && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: 100, height: 100,
          background: 'radial-gradient(ellipse at top right, rgba(124,58,237,0.08), transparent 70%)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, position: 'relative' }}>
        <TypeBadge type={doc.fileType} />
        <button
          onClick={e => { e.stopPropagation(); onDelete(doc.docId); }}
          style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
            cursor: 'pointer', color: 'rgba(239,68,68,0.75)',
            padding: '5px', borderRadius: 8,
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#f87171';
            e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'rgba(239,68,68,0.75)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
          }}
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Doc icon + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, position: 'relative' }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: `${accent}14`, border: `1px solid ${accent}28`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent, fontSize: 16,
        }}>
          <FileText size={16} />
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{
            fontWeight: 600, fontSize: 13.5,
            color: hovered ? 'var(--text)' : 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: 180,
          }}>
            {doc.docName}
          </div>
        </div>
      </div>

      {/* Preview text */}
      {doc.textPreview && (
        <div style={{
          fontSize: 12, color: 'var(--text3)', lineHeight: 1.65, marginBottom: 14,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          position: 'relative',
        }}>
          {doc.textPreview}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
            color: 'var(--text4)', fontFamily: 'var(--font-mono)',
          }}>
            <Hash size={10} />{doc.totalChunks} chunks
          </span>
          {doc.uploadedAt && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text4)',
            }}>
              <Calendar size={10} />
              {new Date(doc.uploadedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
        <button
          onClick={() => onChat(doc)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 13px', borderRadius: 9,
            background: hovered ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.1)',
            border: `1px solid ${hovered ? 'rgba(124,58,237,0.4)' : 'rgba(124,58,237,0.2)'}`,
            color: 'var(--violet-l)', cursor: 'pointer', fontSize: 11.5, fontWeight: 700,
            transition: 'all 0.2s ease',
            fontFamily: 'var(--font-body)',
            boxShadow: hovered ? '0 0 16px rgba(124,58,237,0.2)' : 'none',
          }}
        >
          <MessageSquare size={11} /> Ask AI
        </button>
      </div>
    </div>
  );
}

export default function DocumentsView({ documents, onDelete, onChat }) {
  const [query, setQuery] = useState('');
  const [inputFocused, setInputFocused] = useState(false);

  const filtered = documents.filter(d =>
    d.docName.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div style={{ padding: '36px 40px', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28, animation: 'fadeUp 0.3s ease' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 20, marginBottom: 12,
          background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
          fontSize: 11, fontWeight: 600, color: 'var(--violet-l)',
        }}>
          <Filter size={11} />
          Knowledge Library
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800, marginBottom: 6,
          background: 'linear-gradient(135deg, #f1f0f5 30%, #a78bfa)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Documents
        </h1>
        <p style={{ color: 'var(--text3)', fontSize: 13 }}>
          {documents.length} document{documents.length !== 1 ? 's' : ''} indexed and ready for RAG retrieval
        </p>
      </div>

      {/* Search Bar */}
      <div style={{
        position: 'relative', marginBottom: 28, maxWidth: 480,
        animation: 'fadeUp 0.3s ease 0.05s both',
      }}>
        <Search size={14} style={{
          position: 'absolute', left: 14, top: '50%',
          transform: 'translateY(-50%)', color: inputFocused ? 'var(--violet-l)' : 'var(--text3)',
          transition: 'color 0.2s',
          pointerEvents: 'none',
        }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          placeholder="Search documents..."
          style={{
            width: '100%', padding: '11px 16px 11px 40px',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${inputFocused ? 'rgba(124,58,237,0.45)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 12, color: 'var(--text)', fontSize: 13.5,
            fontFamily: 'var(--font-body)', outline: 'none',
            transition: 'all 0.2s ease',
            boxShadow: inputFocused ? '0 0 0 3px rgba(124,58,237,0.08)' : 'none',
          }}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text3)', padding: 2, borderRadius: 4,
              display: 'flex', alignItems: 'center',
            }}
          >
            <Search size={12} />
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '80px 0',
          animation: 'fadeIn 0.4s ease',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.25 }}>🗂️</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>
            {query ? 'No matching documents' : 'No documents yet'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text4)' }}>
            {query ? `Try a different search term` : 'Upload files to build your knowledge base'}
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16,
        }}>
          {filtered.map((doc, i) => (
            <DocCard
              key={doc.docId}
              doc={doc}
              onDelete={onDelete}
              onChat={onChat}
              delay={i * 0.05}
            />
          ))}
        </div>
      )}
    </div>
  );
}
