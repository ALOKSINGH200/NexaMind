import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { extractText, chunkText, getMimeType } from '../utils/fileParser.js';
import { storeChunks, deleteDocChunks, listDocuments, getStats } from '../services/chromaService.js';
import { batchEmbeddings } from '../services/ollamaService.js';
import 'dotenv/config';

const router = express.Router();
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE) || 500;
const CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP) || 50;

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// In-memory doc metadata store (swap to SQLite if needed)
const docMeta = new Map();

// Multer config
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const unique = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_, file, cb) => {
    const allowed = ['.pdf', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(allowed.includes(ext) ? null : new Error('Only PDF, DOCX, TXT allowed'), allowed.includes(ext));
  },
});

// ── GET /api/documents ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const chromaDocs = await listDocuments();
    const docs = chromaDocs.map(d => ({
      ...d,
      ...(docMeta.get(d.docId) || {}),
    }));
    res.json({ documents: docs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/documents/stats ──────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/documents/upload ────────────────────────────────────────────────
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const docId = uuidv4();
  const { originalname, path: filePath, size } = req.file;

  try {
    // 1. Extract text
    const mimeType = getMimeType(originalname);
    const rawText = await extractText(filePath, mimeType);

    if (!rawText || rawText.length < 10) {
      fs.unlinkSync(filePath);
      const reason = !rawText ? 'Extraction returned no content' : 'Extracted text is too short (<10 chars)';
      return res.status(400).json({ 
        error: `Could not extract text from file: ${reason}. The PDF might be scanned, password-protected, or empty.` 
      });
    }

    // 2. Chunk text
    const chunks = chunkText(rawText, CHUNK_SIZE, CHUNK_OVERLAP);

    // 3. Generate embeddings via Ollama
    const embeddings = await batchEmbeddings(chunks);

    // 4. Store in ChromaDB
    await storeChunks({
      docId,
      docName: originalname,
      fileType: path.extname(originalname).replace('.', '').toUpperCase(),
      filePath,
      fileSize: size,
      textPreview: rawText.slice(0, 400),
      uploadedAt: new Date().toISOString(),
      chunks,
      embeddings,
    });

    // 5. Save metadata in memory
    const meta = {
      docId,
      docName: originalname,
      fileType: path.extname(originalname).replace('.', '').toUpperCase(),
      fileSize: size,
      totalChunks: chunks.length,
      textPreview: rawText.slice(0, 400),
      uploadedAt: new Date().toISOString(),
    };
    docMeta.set(docId, meta);

    res.json({ success: true, document: meta });

  } catch (err) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/documents/:docId ──────────────────────────────────────────────
router.delete('/:docId', async (req, res) => {
  try {
    const meta = await deleteDocChunks(req.params.docId);
    
    // Also delete physical file if it exists
    if (meta && meta.filePath && fs.existsSync(meta.filePath)) {
      fs.unlinkSync(meta.filePath);
    }
    
    docMeta.delete(req.params.docId);
    res.json({ success: true, message: 'Document and physical file deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
