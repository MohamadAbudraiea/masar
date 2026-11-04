import { truckRows } from '../../db/seed/truckTypes.js';

// Priority bodies per goods category from 01 §7
export const BODY_CANDIDATES = {
  dry: ['closed_box', 'curtain', 'open', 'pickup'],
  chilled: ['refrigerated'],
  frozen: ['refrigerated'],
  liquid: (liquidType) => {
    const specific = liquidType ? [liquidType] : [];
    return [...specific, 'tank']; // generic tank as fallback
  },
  bulk: ['bulk_tanker', 'tipper'],
  machinery: ['flatbed', 'open', 'lowbed'],
  hazardous: (isLiquid) => (isLiquid ? ['chemical_tanker'] : ['closed_box']),
  livestock: ['livestock'],
  vehicles: ['car_carrier', 'tow'],
  furniture: ['closed_box', 'curtain'],
  other: [],
};

const CATEGORY_ORDER = ['light', 'medium', 'heavy', 'tanker'];

// Standard units per cargo/truck requirement
export const UNIT_FOR_GOODS = {
  dry: 'ton',
  chilled: 'ton',
  frozen: 'ton',
  liquid: (liquidType) => (liquidType === 'gas_tanker' ? 'ton' : 'liter'),
  bulk: 'ton',
  machinery: 'ton',
  hazardous: (isLiquid) => (isLiquid ? 'liter' : 'ton'),
  livestock: 'ton',
  vehicles: 'ton',
  furniture: 'ton',
  other: 'ton',
};

/**
 * Suggests truck category, body, and cooling based on goods category and quantity.
 * Implements algorithm in 01 §7.
 *
 * @param {Object} params
 * @param {string} params.goodsCategory - e.g. 'dry', 'chilled', 'liquid'
 * @param {number} params.quantity - cargo quantity
 * @param {string} [params.liquidType] - e.g. 'fuel_tanker', 'water_tanker'
 * @param {boolean} [params.isLiquid] - for hazardous liquid
 * @param {Array} [catalogRows] - optional override for truck catalog rows (defaults to truckRows)
 * @returns {{ suggestions: Array<{category: string, body: string, cooling?: string, unit: string, payload_max: number}>, unit: string }}
 */
export function suggestTruck({ goodsCategory, quantity, liquidType, isLiquid }, catalogRows = truckRows) {
  const qty = Number(quantity);

  // 1. Determine expected unit
  let expectedUnit = 'ton';
  const unitDef = UNIT_FOR_GOODS[goodsCategory];
  if (typeof unitDef === 'function') {
    expectedUnit = unitDef(liquidType || isLiquid);
  } else if (typeof unitDef === 'string') {
    expectedUnit = unitDef;
  }

  // 2. Determine candidate bodies in priority order
  let candidateBodies = [];
  const bodyDef = BODY_CANDIDATES[goodsCategory];
  if (typeof bodyDef === 'function') {
    candidateBodies = bodyDef(liquidType || isLiquid);
  } else if (Array.isArray(bodyDef)) {
    candidateBodies = bodyDef;
  }

  if (candidateBodies.length === 0) {
    return { suggestions: [], unit: expectedUnit };
  }

  // 3. Search catalog: for each body in priority, for each category in order, find matching rows
  const suggestions = [];
  const seenCombos = new Set();

  for (const body of candidateBodies) {
    for (const cat of CATEGORY_ORDER) {
      // Find rows in catalog matching category, body, unit, and payload_max >= qty
      const matches = catalogRows.filter((row) => {
        const [cCategory, , cBody, , cPayloadMax, cUnit] = row;
        return (
          cCategory === cat &&
          cBody === body &&
          cUnit === expectedUnit &&
          cPayloadMax >= qty
        );
      });

      // Sort matches by payload_max ascending (closest fit)
      matches.sort((a, b) => a[4] - b[4]);

      for (const m of matches) {
        const comboKey = `${m[0]}:${m[2]}`;
        if (!seenCombos.has(comboKey)) {
          seenCombos.add(comboKey);
          const item = {
            category: m[0],
            body: m[2],
            unit: m[5],
            payload_max: m[4],
          };

          if (goodsCategory === 'chilled') {
            item.cooling = 'chilled';
          } else if (goodsCategory === 'frozen') {
            item.cooling = 'frozen';
          }

          suggestions.push(item);
        }
      }
    }
  }

  return { suggestions, unit: expectedUnit };
}

