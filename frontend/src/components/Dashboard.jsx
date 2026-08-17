import React from 'react';
import { Database, FileStack, Layers, Cpu, Zap, BookOpen, TrendingUp, Circle } from 'lucide-react';

function StatCard({ icon, label, value, sub, color, gradient, delay = 0 }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16,
      padding: '22px 24px',
      position: 'relative',
      overflow: 'hidden',
      animation: `fadeUp 0.4s ease ${delay}s both`,
      cursor: 'default',
      transition: 'all 0.25s ease',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${color}35`;
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = `0 12px 40px ${color}15`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Corner glow */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 80, height: 80,
        background: `radial-gradient(ellipse at top right, ${color}18, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      {/* Bottom accent line */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
        background: gradient || `linear-gradient(90deg, transparent, ${color}, transparent)`,
        opacity: 0.5,
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{
            fontSize: 10.5, color: 'var(--text3)', textTransform: 'uppercase',
            letterSpacing: '0.1em', marginBottom: 10, fontWeight: 700,
          }}>
            {label}
          </div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800,
            color, lineHeight: 1,
            textShadow: `0 0 30px ${color}60`,
          }}>
            {value ?? '—'}
          </div>
          {sub && (
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 7 }}>
              {sub}
            </div>
          )}
        </div>
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: `${color}14`,
          border: `1px solid ${color}28`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color,
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function ServiceCard({ title, icon, connected, detail, sub, color = '#7c3aed', delay = 0 }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
      border: `1px solid ${connected ? 'rgba(16,185,129,0.18)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 16, padding: '20px 22px',
      animation: `fadeUp 0.4s ease ${delay}s both`,
      position: 'relative', overflow: 'hidden',
    }}>
      {connected && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.6), transparent)',
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: connected ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${connected ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.08)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: connected ? 'var(--emerald)' : 'var(--text3)',
        }}>
          {icon}
        </div>
        <span style={{ fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-display)' }}>{title}</span>
        <div style={{ marginLeft: 'auto' }}>
          <span style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
            background: connected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: connected ? '#34d399' : '#f87171',
            border: `1px solid ${connected ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
          }}>
            <Circle size={5} fill={connected ? '#34d399' : '#f87171'} color="transparent" />
            {connected ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text2)', marginBottom: 3, fontWeight: 500 }}>{detail}</div>
      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{sub}</div>
    </div>
  );
}

function TypeBadge({ type }) {
  const map = {
    PDF:  { bg: 'rgba(239,68,68,0.1)',  color: '#f87171', border: 'rgba(239,68,68,0.25)' },
    DOCX: { bg: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
    TXT:  { bg: 'rgba(16,185,129,0.1)', color: '#34d399', border: 'rgba(16,185,129,0.25)' },
  };
  const s = map[type?.toUpperCase()] || { bg: 'rgba(255,255,255,0.05)', color: 'var(--text3)', border: 'var(--border)' };
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 5, fontSize: 9.5, fontWeight: 800,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      letterSpacing: '0.04em',
    }}>
      {type}
    </span>
  );
}

export default function Dashboard({ health, documents }) {
  const { chroma, ollama } = health || {};

  return (
    <div style={{ padding: '36px 40px', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32, animation: 'fadeUp 0.3s ease' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 20, marginBottom: 12,
          background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
          fontSize: 11, fontWeight: 600, color: 'var(--violet-l)',
        }}>
          <TrendingUp size={11} />
          System Overview
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800,
          marginBottom: 6, lineHeight: 1.2,
          background: 'linear-gradient(135deg, #f1f0f5 30%, #a78bfa)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--text3)', fontSize: 13 }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <StatCard
          icon={<FileStack size={18} />}
          label="Documents"
          value={chroma?.totalDocuments ?? documents.length}
          sub="Indexed in ChromaDB"
          color="#8b5cf6"
          gradient="linear-gradient(90deg, transparent, #7c3aed, transparent)"
          delay={0}
        />
        <StatCard
          icon={<Layers size={18} />}
          label="Vector Chunks"
          value={chroma?.totalChunks ?? '—'}
          sub="Semantic embeddings"
          color="#06b6d4"
          gradient="linear-gradient(90deg, transparent, #06b6d4, transparent)"
          delay={0.07}
        />
        <StatCard
          icon={<Cpu size={18} />}
          label="AI Models"
          value={ollama?.modelsAvailable ?? '—'}
          sub={`Active: ${ollama?.defaultModel || '—'}`}
          color="#10b981"
          gradient="linear-gradient(90deg, transparent, #10b981, transparent)"
          delay={0.14}
        />
      </div>

      {/* Services Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <ServiceCard
          title="Ollama Inference"
          icon={<Zap size={15} />}
          connected={ollama?.connected}
          detail={`Model: ${ollama?.defaultModel || 'Not configured'}`}
          sub={`Embed: ${ollama?.embedModel || 'nomic-embed-text'}`}
          delay={0.18}
        />
        <ServiceCard
          title="ChromaDB Vector Store"
          icon={<Database size={15} />}
          connected={chroma?.connected}
          detail={`${chroma?.totalChunks || 0} vectors stored`}
          sub={`${chroma?.totalDocuments || 0} documents indexed`}
          delay={0.22}
        />
      </div>

      {/* Recent Docs table */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16, overflow: 'hidden',
        animation: 'fadeUp 0.4s ease 0.26s both',
      }}>
        <div style={{
          padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(255,255,255,0.02)',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--violet-l)',
          }}>
            <BookOpen size={14} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>
            Recent Documents
          </span>
          {documents.length > 0 && (
            <span style={{
              marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '2px 8px',
              borderRadius: 20, background: 'rgba(124,58,237,0.12)',
              color: 'var(--violet-l)', border: '1px solid rgba(124,58,237,0.2)',
            }}>
              {documents.length} total
            </span>
          )}
        </div>

        {documents.length === 0 ? (
          <div style={{ padding: '52px', textAlign: 'center', color: 'var(--text3)' }}>
            <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>📄</div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>No documents yet</div>
            <div style={{ fontSize: 12, color: 'var(--text4)' }}>Upload files to start building your knowledge base</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                {['Document Name', 'Type', 'Chunks', 'Uploaded'].map(h => (
                  <th key={h} style={{
                    padding: '10px 22px', textAlign: 'left',
                    color: 'var(--text4)', fontWeight: 700, fontSize: 9.5,
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.slice(0, 10).map((doc, i) => (
                <tr
                  key={doc.docId}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background var(--t)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '13px 22px', fontWeight: 500, maxWidth: 280 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
                      {doc.docName}
                    </div>
                  </td>
                  <td style={{ padding: '13px 22px' }}>
                    <TypeBadge type={doc.fileType} />
                  </td>
                  <td style={{ padding: '13px 22px', color: 'var(--violet-l)', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>
                    {doc.totalChunks}
                  </td>
                  <td style={{ padding: '13px 22px', color: 'var(--text3)', fontSize: 11.5 }}>
                    {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-IN') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
