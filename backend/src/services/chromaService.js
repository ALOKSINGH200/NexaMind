import { ChromaClient } from 'chromadb';
import 'dotenv/config';

const client = new ChromaClient({ path: process.env.CHROMA_URL || 'http://localhost:8001' });
const COLLECTION_NAME = process.env.CHROMA_COLLECTION || 'knowledgevault';

let _collection = null;

/**
 * Get or create the ChromaDB collection
 */
export async function getCollection() {
  if (_collection) return _collection;
  _collection = await client.getOrCreateCollection({
    name: COLLECTION_NAME,
    metadata: { 'hnsw:space': 'cosine' },
  });
  return _collection;
}

/**
 * Store document chunks with embeddings in ChromaDB
 */
export async function storeChunks({ docId, docName, fileType, filePath, fileSize, textPreview, uploadedAt, chunks, embeddings }) {
  const collection = await getCollection();

  const ids        = chunks.map((_, i) => `${docId}_chunk_${i}`);
  const metadatas  = chunks.map((_, i) => ({
    docId,
    docName,
    fileType,
    filePath, 
    fileSize,
    textPreview,
    uploadedAt,
    chunkIndex: i,
    totalChunks: chunks.length,
  }));

  await collection.add({
    ids,
    embeddings,
    documents: chunks,
    metadatas,
  });
}

/**
 * Query top-K most similar chunks for a query embedding
 */
export async function queryChunks(queryEmbedding, topK = 5, docId = null) {
  const collection = await getCollection();

  const where = docId ? { docId: { $eq: docId } } : undefined;

  // ChromaDB throws if nResults > total items in the (filtered) collection.
  // Fetch the actual count first and clamp nResults to avoid that error.
  let safeTopK = topK;
  try {
    const countResult = await collection.get({
      where,
      include: [],
    });
    const available = countResult.ids?.length ?? 0;
    if (available === 0) return []; // nothing stored yet
    safeTopK = Math.min(topK, available);
  } catch {
    // If count check fails, proceed with original topK and let it fail naturally
  }

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: safeTopK,
    where,
    include: ['documents', 'metadatas', 'distances'],
  });

  return results.documents[0].map((doc, i) => ({
    text:      doc,
    metadata:  results.metadatas[0][i],
    distance:  results.distances[0][i],
  }));
}

/**
 * Delete all chunks belonging to a document. Returns metadata of deleted chunks.
 */
export async function deleteDocChunks(docId) {
  const collection = await getCollection();
  
  // Get metadata before deleting to find the file path
  const result = await collection.get({
    where: { docId: { $eq: docId } },
    include: ['metadatas'],
    limit: 1
  });

  const metadata = result.metadatas[0] || null;
  
  await collection.delete({ where: { docId: { $eq: docId } } });
  
  return metadata;
}

/**
 * List all unique documents stored in ChromaDB
 */
export async function listDocuments() {
  const collection = await getCollection();
  const result = await collection.get({ include: ['metadatas'] });

  const seen = new Map();
  for (const meta of result.metadatas) {
    if (!seen.has(meta.docId)) {
      seen.set(meta.docId, {
        docId:       meta.docId,
        docName:     meta.docName,
        fileType:    meta.fileType,
        filePath:    meta.filePath,
        fileSize:    meta.fileSize,
        textPreview: meta.textPreview,
        uploadedAt:  meta.uploadedAt,
        totalChunks: meta.totalChunks,
      });
    }
  }
  return Array.from(seen.values());
}

/**
 * Get total chunk count for health stats
 */
export async function getStats() {
  const collection = await getCollection();
  const count = await collection.count();
  const docs = await listDocuments();
  return { totalChunks: count, totalDocuments: docs.length };
}
