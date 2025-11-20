/**
 * Text extraction from various document formats
 */

import { ExtractionResult } from './types';
import { getFileExtension } from '@arcqubit/shared';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

/**
 * Extract text from PDF
 */
async function extractFromPDF(buffer: Buffer): Promise<ExtractionResult> {
  const data = await pdf(buffer);

  return {
    text: data.text,
    metadata: {
      pages: data.numpages,
      title: data.info?.Title,
      author: data.info?.Author,
      createdDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
      modifiedDate: data.info?.ModDate ? new Date(data.info.ModDate) : undefined,
      wordCount: data.text.split(/\s+/).length,
    },
  };
}

/**
 * Extract text from DOCX
 */
async function extractFromDOCX(buffer: Buffer): Promise<ExtractionResult> {
  const result = await mammoth.extractRawText({ buffer });

  return {
    text: result.value,
    metadata: {
      wordCount: result.value.split(/\s+/).length,
    },
  };
}

/**
 * Extract text from XLSX
 */
async function extractFromXLSX(buffer: Buffer): Promise<ExtractionResult> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheets: string[] = [];

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const text = XLSX.utils.sheet_to_txt(sheet);
    sheets.push(`[Sheet: ${sheetName}]\n${text}`);
  });

  const text = sheets.join('\n\n');

  return {
    text,
    metadata: {
      wordCount: text.split(/\s+/).length,
    },
  };
}

/**
 * Extract text from plain text files
 */
async function extractFromText(buffer: Buffer): Promise<ExtractionResult> {
  const text = buffer.toString('utf-8');

  return {
    text,
    metadata: {
      wordCount: text.split(/\s+/).length,
    },
  };
}

/**
 * Extract text from document
 */
export async function extractText(buffer: Buffer, filename: string): Promise<ExtractionResult> {
  const extension = getFileExtension(filename).toLowerCase();

  try {
    switch (extension) {
      case 'pdf':
        return await extractFromPDF(buffer);

      case 'doc':
      case 'docx':
        return await extractFromDOCX(buffer);

      case 'xls':
      case 'xlsx':
        return await extractFromXLSX(buffer);

      case 'txt':
      case 'md':
        return await extractFromText(buffer);

      case 'ppt':
      case 'pptx':
        // PPTX extraction would require additional library
        return {
          text: '',
          metadata: {},
        };

      default:
        throw new Error(`Unsupported file type: ${extension}`);
    }
  } catch (error) {
    console.error(`Text extraction failed for ${filename}:`, error);
    throw error;
  }
}

/**
 * Extract metadata only (without full text)
 */
export async function extractMetadata(
  buffer: Buffer,
  filename: string
): Promise<ExtractionResult['metadata']> {
  try {
    const result = await extractText(buffer, filename);
    return result.metadata;
  } catch {
    return {};
  }
}

/**
 * Detect language of text
 */
export function detectLanguage(text: string): string {
  // Simple heuristic - in production use a proper library like franc
  const sample = text.slice(0, 1000).toLowerCase();

  // English detection
  const englishWords = ['the', 'and', 'is', 'in', 'to', 'of', 'a'];
  const englishCount = englishWords.filter((word) => sample.includes(` ${word} `)).length;

  if (englishCount >= 3) {
    return 'en';
  }

  return 'unknown';
}
