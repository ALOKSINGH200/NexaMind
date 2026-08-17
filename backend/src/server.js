import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import 'dotenv/config';

import documentRoutes from './routes/documents.js';
import chatRoutes from './routes/chat.js';

import { getStats } from './services/chromaService.js';
import {
  listModels,
  DEFAULT_MODEL,
  EMBED_MODEL
} from './services/ollamaService.js';

const app = express();

const PORT = process.env.PORT || 3001;

const CHROMA_URL =
  process.env.CHROMA_URL ||
  'http://127.0.0.1:8001';

const OLLAMA_SERVER =
  process.env.OLLAMA_SERVER ||
  'http://127.0.0.1:11434';


/* ============================================================
   MIDDLEWARE
============================================================ */

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  })
);

app.use(
  express.json({
    limit: '10mb',
  })
);

app.use(morgan('dev'));


/* ============================================================
   ROUTES
============================================================ */

app.use(
  '/api/documents',
  documentRoutes
);

app.use(
  '/api/chat',
  chatRoutes
);


/* ============================================================
   HEALTH
============================================================ */

app.get('/api/health', async (req, res) => {
  try {
    const [
      stats,
      models,
    ] = await Promise.all([
      getStats(),
      listModels(),
    ]);

    res.json({
      status: 'ok',

      chroma: {
        connected: true,
        ...stats,
      },

      ollama: {
        connected:
          models.length > 0,

        modelsAvailable:
          models.length,

        server:
          OLLAMA_SERVER,

        defaultModel:
          DEFAULT_MODEL,

        embedModel:
          EMBED_MODEL,
      },

      timestamp:
        new Date().toISOString(),
    });

  } catch (err) {

    console.error(
      'Health check error:',
      err
    );

    res.status(500).json({
      status: 'error',
      error: err.message,
    });
  }
});


/* ============================================================
   404
============================================================ */

app.use((req, res) => {

  res.status(404).json({
    error:
      `Route ${req.method} ${req.path} not found`,
  });

});


/* ============================================================
   ERROR HANDLER
============================================================ */

app.use(
  (err, req, res, next) => {

    console.error(
      'Unhandled error:',
      err
    );

    if (res.headersSent) {
      return next(err);
    }

    res.status(500).json({
      error:
        err.message ||
        'Internal server error',
    });

  }
);


/* ============================================================
   START
============================================================ */

app.listen(
  PORT,
  '0.0.0.0',
  () => {

    console.log(
      '\n🧠 NexaMind Backend'
    );

    console.log(
      `   → http://0.0.0.0:${PORT}`
    );

    console.log(
      `📊 ChromaDB`
    );

    console.log(
      `   → ${CHROMA_URL}`
    );

    console.log(
      `🌐 Ollama`
    );

    console.log(
      `   → ${OLLAMA_SERVER}`
    );

    console.log(
      `🔮 Model`
    );

    console.log(
      `   → ${DEFAULT_MODEL}`
    );

    console.log(
      `📐 Embedding`
    );

    console.log(
      `   → ${EMBED_MODEL}\n`
    );

  }
);