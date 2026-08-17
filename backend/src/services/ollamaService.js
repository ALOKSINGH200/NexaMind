// ── Config — only server for chat, local only for embed ───────────────────────
const LOCAL_OLLAMA = 'http://localhost:11434';          // sirf embedding ke liye
const SERVER_OLLAMA = process.env.OLLAMA_SERVER || 'http://localhost:11434';

export const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'phi3:mini';
export const EMBED_MODEL = process.env.EMBED_MODEL || 'nomic-embed-text:latest';

const EMBED_PATTERNS = ['embed', 'bge-', 'e5-', 'minilm', 'arctic'];

// ── Embedding → LOCAL only (nomic-embed-text yahan hai) ──────────────────────
export async function generateEmbedding(text, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${LOCAL_OLLAMA}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: EMBED_MODEL,
          input: text.slice(0, 2000),
        }),
        signal: AbortSignal.timeout(30000),
      });
      const raw = await res.text();
      if (!raw?.trim()) throw new Error('Empty response');
      const data = JSON.parse(raw);
      if (data.embeddings?.[0]) return data.embeddings[0];
      throw new Error(data.error || 'No embeddings');
    } catch (err) {
      console.error(`  Embed attempt ${attempt}/${retries}: ${err.message}`);
      if (attempt === retries) throw new Error(`Embedding failed: ${err.message}`);
      await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }
}

// ── Bulk Embedding → LOCAL ────────────────────────────────────────────────────
export async function batchEmbeddings(chunks) {
  console.log(`  🚀 Bulk embedding ${chunks.length} chunks...`);
  const start = Date.now();
  try {
    const res = await fetch(`${LOCAL_OLLAMA}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: EMBED_MODEL,
        input: chunks.map(c => c.slice(0, 1000)),
      }),
      signal: AbortSignal.timeout(120000),
    });
    const raw = await res.text();
    if (!raw?.trim()) throw new Error('Empty response');
    const data = JSON.parse(raw);
    if (data.embeddings?.length === chunks.length) {
      console.log(`  ✅ Embedded in ${((Date.now() - start) / 1000).toFixed(1)}s`);
      return data.embeddings;
    }
    throw new Error(`Expected ${chunks.length}, got ${data.embeddings?.length}`);
  } catch (err) {
    console.warn(`  ⚠️ Bulk failed, parallel fallback...`);
    const results = [];
    for (let i = 0; i < chunks.length; i += 8) {
      const batch = chunks.slice(i, i + 8);
      const embs = await Promise.all(batch.map(c => generateEmbedding(c)));
      results.push(...embs);
      console.log(`  Embedded ${Math.min(i + 8, chunks.length)}/${chunks.length}`);
    }
    return results;
  }
}

// ── Chat → ONLY SERVER ────────────────────────────────────────────────────────
export async function streamChatResponse({ messages, systemPrompt, model }) {
  console.log(`🌐 Server: ${SERVER_OLLAMA} | model: ${model || DEFAULT_MODEL}`);

  const payload = {
    model: model || DEFAULT_MODEL,
    stream: true,
    options: { temperature: 0.7, num_predict: 1024 },
    messages: [
      { role: 'system', content: systemPrompt.slice(0, 4000) },
      ...messages.slice(-4),
    ],
  };

  const res = await fetch(`${SERVER_OLLAMA}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(180000),
  });

  if (!res.ok) {
    throw new Error(`Server error ${res.status}: ${await res.text()}`);
  }
  return res;
}

// ── List Models → ONLY SERVER ─────────────────────────────────────────────────
export async function listModels() {
  try {
    const res = await fetch(`${SERVER_OLLAMA}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();

    const models = (data.models || [])
      .filter(m => !EMBED_PATTERNS.some(p => m.name.toLowerCase().includes(p)))
      .map(m => ({
        name: m.name,
        size: m.details?.parameter_size || '',
        family: m.details?.family || '',
      }));

    console.log(`✅ Server models: ${models.map(m => m.name).join(', ')}`);
    return models;

  } catch (err) {
    console.error(`❌ Server offline (${SERVER_OLLAMA}): ${err.message}`);
    // Server off hai — empty return, frontend pe error dikhao
    return [];
  }
}