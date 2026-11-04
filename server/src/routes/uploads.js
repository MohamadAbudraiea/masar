import express from 'express';
import multer from 'multer';
import { uploadFile, getPresignedDownloadUrl } from '../services/storage.js';
import { AppError } from '../middleware/error.js';

const router = express.Router();

// 25MB max file upload limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

/**
 * POST /api/uploads?kind=
 * Public multipart upload.
 */
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('VALIDATION_ERROR', 'File field "file" is required', 400);
    }

    const kind = req.query.kind || 'documents';
    const result = await uploadFile({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      kind,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/files/url?key=
 * Returns 1-hour presigned GET URL for viewing or downloading.
 */
router.get('/url', async (req, res, next) => {
  try {
    const key = req.query.key;
    if (!key) {
      throw new AppError('VALIDATION_ERROR', 'Query param "key" is required', 400);
    }

    const url = await getPresignedDownloadUrl(key, 3600);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/files/mock/*
 * Mock endpoint when R2 is not configured, serving a minimal valid sample PDF or image
 */
router.get('/mock/*', (req, res) => {
  const isImage = req.params[0]?.match(/\.(jpg|jpeg|png|webp)$/i);
  if (isImage) {
    // 1x1 transparent GIF
    const imgBuffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.setHeader('Content-Type', 'image/gif');
    return res.send(imgBuffer);
  }

  // Minimal valid PDF byte stream
  const minimalPdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length 53 >> stream
BT /F1 18 Tf 100 700 Td (Masar Sample Document) Tj ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
trailer << /Size 5 /Root 1 0 R >>
startxref
318
%%EOF`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="document.pdf"');
  res.send(Buffer.from(minimalPdf));
});

export default router;

