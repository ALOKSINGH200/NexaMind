import React, { useState, useEffect, useCallback } from 'react';

import Sidebar from './components/Sidebar.jsx';
import Dashboard from './components/Dashboard.jsx';
import UploadZone from './components/UploadZone.jsx';
import DocumentsView from './components/DocumentsView.jsx';
import ChatWindow from './components/ChatWindow.jsx';

// Backend API
// Uses VITE_API_URL from frontend/.env
// Falls back to the local backend.
const API_URL =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001';

console.log('[KnowledgeVault] API:', API_URL);

export default function App() {
  const [view, setView] = useState('dashboard');

  const [documents, setDocuments] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);

  const [health, setHealth] = useState(null);
  const [models, setModels] = useState([]);

  // Local Ollama model
  const [defaultModel, setDefaultModel] = useState('phi3:mini');

  // ───────────────────────────────────────────────────────────────────────────
  // Fetch documents
  // ───────────────────────────────────────────────────────────────────────────

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/documents`);

      if (!res.ok) {
        throw new Error(
          `Documents request failed: ${res.status} ${res.statusText}`
        );
      }

      const data = await res.json();

      setDocuments(data.documents || []);
    } catch (error) {
      console.error(
        '[KnowledgeVault] Failed to fetch documents:',
        error
      );
    }
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Backend health
  // ───────────────────────────────────────────────────────────────────────────

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/health`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(
          `Health request failed: ${res.status} ${res.statusText}`
        );
      }

      const data = await res.json();

      console.log('[KnowledgeVault] Health:', data);

      setHealth(data);

      // Keep frontend model state synchronized with backend
      if (data.ollama?.defaultModel) {
        setDefaultModel(data.ollama.defaultModel);
      }
    } catch (error) {
      console.error(
        '[KnowledgeVault] Backend health check failed:',
        error
      );

      setHealth(null);
    }
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Available Ollama chat models
  // ───────────────────────────────────────────────────────────────────────────

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/chat/models`);

      if (!res.ok) {
        throw new Error(
          `Models request failed: ${res.status} ${res.statusText}`
        );
      }

      const data = await res.json();

      console.log('[KnowledgeVault] Models:', data);

      setModels(data.models || []);

      if (data.default) {
        setDefaultModel(data.default);
      }
    } catch (error) {
      console.error(
        '[KnowledgeVault] Failed to fetch models:',
        error
      );

      // Keep local default if API isn't available
      setModels([]);
    }
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Initial load + health polling
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchDocuments();
    fetchHealth();
    fetchModels();

    // Check backend every 30 seconds
    const interval = setInterval(() => {
      fetchHealth();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchDocuments, fetchHealth, fetchModels]);

  // ───────────────────────────────────────────────────────────────────────────
  // Delete document
  // ───────────────────────────────────────────────────────────────────────────

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Delete this document from ChromaDB?')) {
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/api/documents/${docId}`,
        {
          method: 'DELETE',
        }
      );

      if (!res.ok) {
        throw new Error(
          `Delete failed: ${res.status} ${res.statusText}`
        );
      }

      // Clear active document if it was deleted
      if (activeDoc?.docId === docId) {
        setActiveDoc(null);
      }

      // Refresh document list
      await fetchDocuments();
    } catch (error) {
      console.error(
        '[KnowledgeVault] Failed to delete document:',
        error
      );

      window.alert(
        `Failed to delete document: ${error.message}`
      );
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Open document in chat
  // ───────────────────────────────────────────────────────────────────────────

  const handleChatDoc = (doc) => {
    setActiveDoc(doc);
    setView('chat');
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Render current view
  // ───────────────────────────────────────────────────────────────────────────

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return (
          <Dashboard
            health={health}
            documents={documents}
          />
        );

      case 'upload':
        return (
          <UploadZone
            onUploadComplete={fetchDocuments}
          />
        );

      case 'documents':
        return (
          <DocumentsView
            documents={documents}
            onDelete={handleDeleteDoc}
            onChat={handleChatDoc}
          />
        );

      case 'chat':
        return (
          <ChatWindow
            activeDoc={activeDoc}
            setActiveDoc={setActiveDoc}
            documents={documents}
            models={models}
            defaultModel={defaultModel}
          />
        );

      default:
        return (
          <Dashboard
            health={health}
            documents={documents}
          />
        );
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // App UI
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg)',
      }}
    >
      <Sidebar
        view={view}
        setView={setView}
        documents={documents}
        activeDoc={activeDoc}
        setActiveDoc={(doc) => {
          setActiveDoc(doc);
          setView('chat');
        }}
        onDeleteDoc={handleDeleteDoc}
        health={health}
      />

      <main
        style={{
          flex: 1,
          height: '100vh',
          overflow: 'hidden',
          background: 'var(--bg)',
          position: 'relative',
        }}
      >
        {/* Ambient background glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(ellipse at 60% 0%, rgba(124,58,237,0.04) 0%, transparent 60%)',
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            height: '100%',
          }}
        >
          {renderView()}
        </div>
      </main>
    </div>
  );
}