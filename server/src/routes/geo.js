import express from 'express';
import {
  searchLocations,
  reverseGeocode,
  parseCoordinatesFromUrl,
  calculateRoute,
} from '../services/geo.js';
import { AppError } from '../middleware/error.js';

const router = express.Router();

/**
 * GET /api/geo/search?q=
 */
router.get('/search', async (req, res, next) => {
  try {
    const q = req.query.q;
    if (!q) return res.json([]);
    const results = await searchLocations(q);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/geo/reverse?lat=&lng=
 */
router.get('/reverse', async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      throw new AppError('VALIDATION_ERROR', 'lat and lng query parameters are required', 400);
    }
    const result = await reverseGeocode(parseFloat(lat), parseFloat(lng));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/geo/resolve-link
 * Body: { url }
 */
router.post('/resolve-link', async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url) {
      throw new AppError('VALIDATION_ERROR', 'url is required', 400);
    }

    let targetUrl = url;
    // Follow redirect if it's a short link like goo.gl or maps.app.goo.gl
    if (url.includes('goo.gl') || url.includes('maps.app')) {
      try {
        const headRes = await fetch(url, { method: 'HEAD', redirect: 'follow' });
        targetUrl = headRes.url || url;
      } catch (err) {
        // Fallback to original
      }
    }

    const coords = parseCoordinatesFromUrl(targetUrl);
    if (!coords) {
      throw new AppError('NOT_FOUND', 'Could not parse coordinates from the provided URL', 400);
    }

    res.json(coords);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/geo/route?from=lat,lng&to=lat,lng
 */
router.get('/route', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      throw new AppError('VALIDATION_ERROR', 'from and to query parameters are required', 400);
    }

    const [fromLat, fromLng] = from.split(',').map(Number);
    const [toLat, toLng] = to.split(',').map(Number);

    if (isNaN(fromLat) || isNaN(fromLng) || isNaN(toLat) || isNaN(toLng)) {
      throw new AppError('VALIDATION_ERROR', 'Coordinates must be valid numbers', 400);
    }

    const route = await calculateRoute(fromLat, fromLng, toLat, toLng);
    res.json(route);
  } catch (err) {
    next(err);
  }
});

export default router;

