import { generateEmbedding, streamChatResponse } from './ollamaService.js';
import { queryChunks } from './chromaService.js';

const TOP_K = parseInt(process.env.TOP_K_RESULTS) || 8;

function buildSystemPrompt(chunks) {
  if (!chunks.length) {
    return `You are KnowledgeVault AI, a helpful assistant. Answer the user's question using your knowledge.`;
  }

  const context = chunks
    .map((c, i) => `[Source ${i + 1} — ${c.metadata?.docName}]\n${c.text}`)
    .join('\n\n---\n\n');

  return `You are KnowledgeVault AI, an expert document analyst.

You have been given context chunks from the uploaded document. Follow these rules:
1. Answer using the provided context as PRIMARY source
2. If the exact topic is in context — explain it in detail with bullet points
3. If context has PARTIAL information — use it and expand with related knowledge
4. NEVER say "I couldn't find this" if the document chunks contain ANY related information
5. Always cite [Source N — filename] when using context
6. Be thorough and detailed in your answers

--- DOCUMENT CONTEXT (${chunks.length} chunks retrieved) ---

${context}

--- END CONTEXT ---

Now answer the user's question in detail based on the above context.`;
}

function setSSEHeaders(res) {
  if (!res.headersSent) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
  }
}

function safeWrite(res, payload) {
  if (!res.writableEnded) {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }
}

async function streamOllamaResponse(ollamaRes, res) {
  const reader = ollamaRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let tokens = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line);
        const text = json?.message?.content || '';
        if (text) {
          safeWrite(res, { type: 'delta', text });
          tokens++;
        }
        if (json.done) {
          console.log(`✅ Tokens: ${tokens}`);
          return;
        }
      } catch {
        // skip bad lines
      }
    }
  }
  console.log(`✅ Tokens: ${tokens}`);
}

// ── RAG Stream ────────────────────────────────────────────────────────────────
export async function ragStream({ query, messages, model, docId, res }) {
  setSSEHeaders(res);
  try {
    console.log(`\n🔍 RAG: "${query}" | model: ${model}`);

    // Embed query
    const embedding = await generateEmbedding(query);
    console.log(`✅ Embedding: ${embedding.length} dims`);

    // Retrieve more chunks — TOP_K=8 now
    const chunks = await queryChunks(embedding, TOP_K, docId || null);
    console.log(`✅ Chunks retrieved: ${chunks.length}`);

    // Also do a BROAD search without docId filter for better coverage
    let allChunks = chunks;
    if (chunks.length < 3 && docId) {
      console.log('⚠️  Low chunks — trying broad search...');
      const broadChunks = await queryChunks(embedding, TOP_K, null);
      allChunks = [...chunks, ...broadChunks.filter(b =>
        !chunks.some(c => c.metadata?.docId === b.metadata?.docId && c.text === b.text)
      )].slice(0, TOP_K);
      console.log(`✅ Broad search chunks: ${allChunks.length}`);
    }

    // Send sources
    safeWrite(res, {
      type: 'sources',
      sources: allChunks.map(c => ({
        docName: c.metadata?.docName,
        docId: c.metadata?.docId,
        score: c.score,
      })),
    });

    // Stream LLM
    const ollamaRes = await streamChatResponse({
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      systemPrompt: buildSystemPrompt(allChunks),
      model,
    });

    await streamOllamaResponse(ollamaRes, res);

  } catch (err) {
    console.error('❌ RAG error:', err.message);
    safeWrite(res, { type: 'error', error: err.message });
  } finally {
    safeWrite(res, { type: 'done' });
    if (!res.writableEnded) res.end();
  }
}

// ── General Chat ──────────────────────────────────────────────────────────────
export async function generalChatStream({ messages, model, res }) {
  setSSEHeaders(res);
  try {
    console.log(`\n💬 General chat | model: ${model}`);

    const ollamaRes = await streamChatResponse({
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      systemPrompt: 'You are KnowledgeVault AI, a helpful assistant. Use markdown when helpful.',
      model,
    });

    await streamOllamaResponse(ollamaRes, res);

  } catch (err) {
    console.error('❌ Chat error:', err.message);
    safeWrite(res, { type: 'error', error: err.message });
  } finally {
    safeWrite(res, { type: 'done' });
    if (!res.writableEnded) res.end();
  }
}