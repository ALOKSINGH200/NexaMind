import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import PDFParser from 'pdf2json';

/**
 * Extract raw text from uploaded file
 */
export async function extractText(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf' || mimeType === 'application/pdf') {
    try {
      const buffer = fs.readFileSync(filePath);

      // pdf-parse v2 API
      const parser = new PDFParse({ data: buffer });
      const data = await parser.getText();
      await parser.destroy();

      let text = data.text ? data.text.trim() : '';

      // Fallback to pdf2json if pdf-parse returns nothing
      if (!text || text.length < 10) {
        console.log(
          `[FileParser] pdf-parse returned minimal text, trying pdf2json fallback...`
        );
        text = await extractWithPdf2Json(filePath);
      }

      if (!text) {
        console.warn(
          `[FileParser] All PDF parsing methods returned no text for ${filePath}`
        );
        return '';
      }

      console.log(
        `[FileParser] Extracted ${text.length} chars from PDF: ${filePath}`
      );

      return text;
    } catch (err) {
      console.error(
        `[FileParser] PDF extraction pipeline failed for ${filePath}:`,
        err
      );
      return '';
    }
  }

  if (
    ext === '.docx' ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value.trim();
  }

  if (ext === '.txt' || mimeType === 'text/plain') {
    return fs.readFileSync(filePath, 'utf-8').trim();
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

/**
 * Split text into overlapping chunks for vector embedding
 */
export function chunkText(text, chunkSize = 500, overlap = 50) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  let i = 0;

  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(' ');

    if (chunk.trim()) {
      chunks.push(chunk);
    }

    i += chunkSize - overlap;
  }

  return chunks;
}

/**
 * Detect MIME type from extension
 */
export function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();

  const map = {
    '.pdf': 'application/pdf',
    '.docx':
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
  };

  return map[ext] || 'application/octet-stream';
}

/**
 * Fallback PDF extraction using pdf2json
 */
async function extractWithPdf2Json(filePath) {
  return new Promise((resolve) => {
    const pdfParser = new PDFParser(null, 1);

    pdfParser.on('pdfParser_dataError', (errData) => {
      console.error(
        '[FileParser] pdf2json error:',
        errData.parserError
      );
      resolve('');
    });

    pdfParser.on('pdfParser_dataReady', () => {
      resolve(pdfParser.getRawTextContent());
    });

    pdfParser.loadPDF(filePath);
  });
}