import express from 'express';
import { ragStream, generalChatStream } from '../services/ragService.js';
import { listModels, DEFAULT_MODEL } from '../services/ollamaService.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { messages, model, docId } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  if (!lastUserMsg) return res.status(400).json({ error: 'No user message found' });

  try {
    if (docId) {
      await ragStream({ query: lastUserMsg.content, messages, model: model || DEFAULT_MODEL, docId, res });
    } else {
      await generalChatStream({ messages, model: model || DEFAULT_MODEL, res });
    }
  } catch (err) {
    console.error('Chat route error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    }
  }
});

router.get('/models', async (req, res) => {
  try {
    const models = await listModels();
    res.json({ models, default: DEFAULT_MODEL });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;