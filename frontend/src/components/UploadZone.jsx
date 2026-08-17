import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  CheckCircle,
  XCircle,
  Loader,
  FileText,
  X,
  CloudUpload,
  Sparkles,
  MessageSquare,
} from 'lucide-react';

const API_URL =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001';

const MAX_SIZE = 50 * 1024 * 1024;

const FILE_TYPES = [
  {
    label: 'PDF',
    color: '#f87171',
    bg: 'rgba(239,68,68,0.1)',
    border: 'rgba(239,68,68,0.25)',
    icon: '📕',
  },
  {
    label: 'DOCX',
    color: '#60a5fa',
    bg: 'rgba(59,130,246,0.1)',
    border: 'rgba(59,130,246,0.25)',
    icon: '📘',
  },
  {
    label: 'TXT',
    color: '#34d399',
    bg: 'rgba(16,185,129,0.1)',
    border: 'rgba(16,185,129,0.25)',
    icon: '📄',
  },
];

export default function UploadZone({ onUploadComplete }) {
  const [queue, setQueue] = useState([]);

  // ───────────────────────────────────────────────────────────────────────────
  // Safely parse backend response
  // ───────────────────────────────────────────────────────────────────────────

  const parseResponse = async (res) => {
    const contentType = res.headers.get('content-type') || '';
    const raw = await res.text();

    // Empty response
    if (!raw.trim()) {
      return {
        data: {},
        raw: '',
      };
    }

    // JSON response
    if (contentType.includes('application/json')) {
      try {
        return {
          data: JSON.parse(raw),
          raw,
        };
      } catch {
        return {
          data: {},
          raw,
        };
      }
    }

    // Sometimes Express/proxy returns text/html/text
    try {
      return {
        data: JSON.parse(raw),
        raw,
      };
    } catch {
      return {
        data: {},
        raw,
      };
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Upload single file
  // ───────────────────────────────────────────────────────────────────────────

  const uploadFile = async (item) => {
    setQueue((prev) =>
      prev.map((q) =>
        q.id === item.id
          ? {
              ...q,
              status: 'uploading',
              error: null,
            }
          : q
      )
    );

    const form = new FormData();
    form.append('file', item.file);

    try {
      console.log(
        `[KnowledgeVault] Uploading ${item.file.name} → ${API_URL}/api/documents/upload`
      );

      const res = await fetch(
        `${API_URL}/api/documents/upload`,
        {
          method: 'POST',
          body: form,
        }
      );

      const { data, raw } = await parseResponse(res);

      console.log(
        `[KnowledgeVault] Upload response ${res.status}:`,
        data,
        raw
      );

      if (!res.ok) {
        const backendError =
          data?.error ||
          data?.message ||
          raw?.trim() ||
          `Upload failed with HTTP ${res.status}`;

        throw new Error(backendError);
      }

      // Backend should return:
      // {
      //   success: true,
      //   document: {...}
      // }

      const document = data?.document || data?.data || null;

      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? {
                ...q,
                status: 'done',
                doc: document,
                error: null,
              }
            : q
        )
      );

      // Refresh documents in Sidebar/Documents page
      await onUploadComplete?.();

    } catch (err) {
      console.error(
        `[KnowledgeVault] Upload failed: ${item.file.name}`,
        err
      );

      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? {
                ...q,
                status: 'error',
                error: err?.message || 'Upload failed',
              }
            : q
        )
      );
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Drop files
  // ───────────────────────────────────────────────────────────────────────────

  const onDrop = useCallback(
    (acceptedFiles, rejectedFiles) => {
      // Show rejected files
      if (rejectedFiles?.length) {
        const rejectedItems = rejectedFiles.map((rejected) => {
          const file = rejected.file;

          let reason = 'File rejected';

          if (rejected.errors?.length) {
            reason = rejected.errors
              .map((e) => e.message)
              .join(', ');
          }

          return {
            id:
              Math.random().toString(36).slice(2) +
              Date.now(),
            file,
            status: 'error',
            error: reason,
          };
        });

        setQueue((prev) => [...prev, ...rejectedItems]);
      }

      // Nothing accepted
      if (!acceptedFiles?.length) {
        return;
      }

      const newItems = acceptedFiles.map((file) => ({
        id:
          Math.random().toString(36).slice(2) +
          Date.now() +
          file.name,
        file,
        status: 'pending',
        error: null,
        doc: null,
      }));

      setQueue((prev) => [...prev, ...newItems]);

      // Start uploads
      newItems.forEach((item) => {
        uploadFile(item);
      });
    },
    [onUploadComplete]
  );

  const {
    getRootProps,
    getInputProps,
    isDragActive,
  } = useDropzone({
    onDrop,

    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
        '.docx',
      ],
      'text/plain': ['.txt'],
    },

    maxSize: MAX_SIZE,
    multiple: true,
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Remove item from visual queue
  // ───────────────────────────────────────────────────────────────────────────

  const removeItem = (id) => {
    setQueue((prev) =>
      prev.filter((q) => q.id !== id)
    );
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Format file size
  // ───────────────────────────────────────────────────────────────────────────

  const formatBytes = (bytes) => {
    if (!bytes) return '0 KB';

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  // ───────────────────────────────────────────────────────────────────────────
  // UI
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        padding: '36px 40px',
        height: '100%',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: 32,
          animation: 'fadeUp 0.3s ease',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 20,
            marginBottom: 12,
            background: 'rgba(124,58,237,0.1)',
            border:
              '1px solid rgba(124,58,237,0.2)',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--violet-l)',
          }}
        >
          <CloudUpload size={11} />
          Document Ingestion
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 30,
            fontWeight: 800,
            marginBottom: 6,
            background:
              'linear-gradient(135deg, #f1f0f5 30%, #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Upload Files
        </h1>

        <p
          style={{
            color: 'var(--text3)',
            fontSize: 13,
          }}
        >
          Files are chunked, embedded with Ollama,
          and stored in ChromaDB for RAG retrieval.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${
            isDragActive
              ? 'rgba(124,58,237,0.7)'
              : 'rgba(255,255,255,0.1)'
          }`,
          borderRadius: 20,
          padding: '60px 32px',
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragActive
            ? 'radial-gradient(ellipse at center, rgba(124,58,237,0.1) 0%, rgba(124,58,237,0.03) 60%, transparent 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%)',
          transition: 'all 0.3s ease',
          marginBottom: 24,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {isDragActive && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'radial-gradient(ellipse at center, rgba(124,58,237,0.08), transparent)',
              animation: 'fadeIn 0.2s ease',
            }}
          />
        )}

        <input {...getInputProps()} />

        {/* Upload icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            margin: '0 auto 20px',
            background: isDragActive
              ? 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(6,182,212,0.2))'
              : 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(6,182,212,0.06))',
            border: `1px solid ${
              isDragActive
                ? 'rgba(124,58,237,0.5)'
                : 'rgba(255,255,255,0.08)'
            }`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            boxShadow: isDragActive
              ? '0 0 30px rgba(124,58,237,0.25)'
              : 'none',
            animation: isDragActive
              ? 'none'
              : 'float 3s ease-in-out infinite',
          }}
        >
          <Upload
            size={26}
            color={
              isDragActive
                ? 'var(--violet-l)'
                : 'var(--text2)'
            }
          />
        </div>

        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 18,
            marginBottom: 8,
            color: isDragActive
              ? 'var(--violet-l)'
              : 'var(--text)',
          }}
        >
          {isDragActive
            ? '✨ Drop to upload'
            : 'Drag & drop or click to browse'}
        </div>

        <div
          style={{
            color: 'var(--text3)',
            fontSize: 13,
            marginBottom: 20,
          }}
        >
          Supports PDF, DOCX, TXT — max 50MB per file
        </div>

        {/* File badges */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          {FILE_TYPES.map((ft) => (
            <span
              key={ft.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 14px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                background: ft.bg,
                color: ft.color,
                border: `1px solid ${ft.border}`,
              }}
            >
              {ft.icon} {ft.label}
            </span>
          ))}
        </div>
      </div>

      {/* Upload Queue */}
      {queue.length > 0 && (
        <div
          style={{
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
            border:
              '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16,
            overflow: 'hidden',
            animation: 'fadeUp 0.3s ease',
          }}
        >
          <div
            style={{
              padding: '13px 20px',
              borderBottom:
                '1px solid rgba(255,255,255,0.06)',
              fontSize: 10.5,
              color: 'var(--text4)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background:
                'rgba(255,255,255,0.02)',
            }}
          >
            <Sparkles
              size={10}
              color="var(--violet)"
            />

            Upload Queue

            <span
              style={{
                marginLeft: 4,
                padding: '1px 7px',
                borderRadius: 10,
                background:
                  'rgba(124,58,237,0.12)',
                color: 'var(--violet-l)',
                border:
                  '1px solid rgba(124,58,237,0.2)',
              }}
            >
              {queue.length}
            </span>
          </div>

          {queue.map((item, index) => (
            <QueueItem
              key={item.id}
              item={item}
              onRemove={removeItem}
              onChat={onUploadComplete}
              formatBytes={formatBytes}
              isLast={
                index === queue.length - 1
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Queue item
// ─────────────────────────────────────────────────────────────────────────────

function QueueItem({
  item,
  onRemove,
  onChat,
  formatBytes,
  isLast,
}) {
  const statusConfig = {
    pending: {
      icon: (
        <FileText
          size={15}
          color="var(--text3)"
        />
      ),
      text: `${formatBytes(
        item.file.size
      )} — Queued`,
      color: 'var(--text3)',
    },

    uploading: {
      icon: (
        <Loader
          size={15}
          color="var(--cyan)"
          style={{
            animation:
              'spin 0.8s linear infinite',
          }}
        />
      ),
      text:
        'Embedding with Ollama & storing in ChromaDB…',
      color: 'var(--cyan)',
    },

    done: {
      icon: (
        <CheckCircle
          size={15}
          color="var(--emerald-h)"
        />
      ),
      text: `✓ Done — ${
        item.doc?.totalChunks ||
        item.doc?.chunks ||
        0
      } chunks stored in ChromaDB`,
      color: 'var(--emerald-h)',
    },

    error: {
      icon: (
        <XCircle
          size={15}
          color="var(--red)"
        />
      ),
      text: `✗ Error: ${item.error}`,
      color: 'var(--red)',
    },
  };

  const cfg =
    statusConfig[item.status] ||
    statusConfig.pending;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        padding: '14px 20px',
        borderBottom: isLast
          ? 'none'
          : '1px solid rgba(255,255,255,0.04)',
        animation:
          'fadeIn 0.2s ease',
        background:
          item.status === 'done'
            ? 'rgba(16,185,129,0.02)'
            : item.status === 'error'
            ? 'rgba(239,68,68,0.02)'
            : 'transparent',
        transition:
          'background 0.3s',
      }}
    >
      {/* Status icon */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          flexShrink: 0,
          background:
            item.status === 'done'
              ? 'rgba(16,185,129,0.1)'
              : item.status === 'error'
              ? 'rgba(239,68,68,0.1)'
              : item.status === 'uploading'
              ? 'rgba(6,182,212,0.1)'
              : 'rgba(255,255,255,0.05)',
          border: `1px solid ${
            item.status === 'done'
              ? 'rgba(16,185,129,0.2)'
              : item.status === 'error'
              ? 'rgba(239,68,68,0.2)'
              : item.status === 'uploading'
              ? 'rgba(6,182,212,0.2)'
              : 'rgba(255,255,255,0.08)'
          }`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {cfg.icon}
      </div>

      {/* File information */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: 3,
          }}
        >
          {item.file.name}
        </div>

        <div
          style={{
            fontSize: 11,
            color: cfg.color,
            wordBreak: 'break-word',
          }}
        >
          {cfg.text}
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}
      >
        {item.status === 'done' && (
          <button
            onClick={() =>
              onChat?.(item.doc)
            }
            style={{
              background:
                'rgba(124,58,237,0.12)',
              border:
                '1px solid rgba(124,58,237,0.3)',
              color: 'var(--violet-l)',
              padding: '5px 12px',
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              transition:
                'all 0.2s ease',
              fontFamily:
                'var(--font-body)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                'rgba(124,58,237,0.22)';
              e.currentTarget.style.boxShadow =
                '0 0 15px rgba(124,58,237,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                'rgba(124,58,237,0.12)';
              e.currentTarget.style.boxShadow =
                'none';
            }}
          >
            <MessageSquare size={11} />
            Chat
          </button>
        )}

        {(item.status === 'done' ||
          item.status === 'error') && (
          <button
            title={
              item.status === 'done'
                ? 'Remove from upload queue'
                : 'Remove failed upload'
            }
            onClick={() =>
              onRemove(item.id)
            }
            style={{
              background:
                'rgba(255,255,255,0.04)',
              border:
                '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
              color: 'var(--text3)',
              padding: 6,
              borderRadius: 7,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color =
                'var(--red)';
              e.currentTarget.style.borderColor =
                'rgba(239,68,68,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color =
                'var(--text3)';
              e.currentTarget.style.borderColor =
                'rgba(255,255,255,0.08)';
            }}
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
}