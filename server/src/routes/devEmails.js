import express from 'express';
import { TEMPLATE_KEYS, templates } from '../emails/templates.js';
import { AppError } from '../middleware/error.js';

const router = express.Router();

/**
 * GET /api/dev/emails
 * Returns list of all available email template keys with sample metadata.
 */
router.get('/', (req, res) => {
  const list = TEMPLATE_KEYS.map((key) => {
    const fn = templates[key];
    const sample = fn ? fn() : null;
    return {
      key,
      subject: sample?.subject || '',
    };
  });
  res.json({ templates: list });
});

/**
 * GET /api/dev/emails/:template
 * Returns raw HTML rendering of the specified email template with sample data.
 */
router.get('/:template', (req, res, next) => {
  const { template } = req.params;
  const fn = templates[template];

  if (!fn) {
    return next(new AppError('NOT_FOUND', `Email template "${template}" not found`, 404));
  }

  // Render with optional query overrides or defaults
  const sample = fn(req.query || {});

  // If client requested JSON (e.g. for inspection), send JSON; otherwise send raw HTML
  if (req.headers.accept?.includes('application/json') && req.query.format === 'json') {
    return res.json({
      template,
      subject: sample.subject,
      html: sample.html,
      text: sample.text,
    });
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(sample.html);
});

export default router;

