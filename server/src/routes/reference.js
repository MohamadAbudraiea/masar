import express from 'express';
import { query } from '../db.js';
import { suggestTruck } from '../services/truckSuggest.js';
import { AppError } from '../middleware/error.js';

const router = express.Router();

/**
 * GET /api/reference/goods-categories
 * Returns all active goods categories ordered by sort
 */
router.get('/goods-categories', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM goods_categories ORDER BY sort ASC');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reference/truck-types
 * Returns full catalog rows plus gross-weight options
 */
router.get('/truck-types', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM truck_types ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/reference/suggest-truck
 * Body: { goods_category_id, quantity, liquid_type? }
 */
router.post('/suggest-truck', async (req, res, next) => {
  try {
    const { goods_category_id, quantity, liquid_type } = req.body;
    if (!goods_category_id || !quantity) {
      throw new AppError('VALIDATION_ERROR', 'goods_category_id and quantity are required', 400);
    }

    const catRes = await query('SELECT code FROM goods_categories WHERE id = $1', [goods_category_id]);
    if (catRes.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Goods category not found', 404);
    }

    const goodsCategory = catRes.rows[0].code;
    const result = suggestTruck({
      goodsCategory,
      quantity,
      liquidType: liquid_type,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;

